import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { Event } from '../models/Event.js';
import { Seat, SEAT_STATUS } from '../models/Seat.js';
import { Reservation, RESERVATION_STATUS } from '../models/Reservation.js';
import { Booking } from '../models/Booking.js';
import { emitSeatStatus } from '../realtime/io.js';

/** Broadcast a list of seat docs (grouped by event) at the given status. */
function broadcast(seats, status) {
  const byEvent = new Map();
  for (const s of seats) {
    const key = String(s.eventId);
    if (!byEvent.has(key)) byEvent.set(key, []);
    byEvent.get(key).push({ seatNumber: s.seatNumber, status });
  }
  for (const [eventId, payload] of byEvent) emitSeatStatus(eventId, payload);
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Concurrency model — how we prevent double booking
 * ─────────────────────────────────────────────────────────────────────────────
 *  Each seat is its own document. MongoDB guarantees that a single-document
 *  update is atomic, so we claim a seat with a *conditional* findOneAndUpdate:
 *  it only succeeds if the seat is still available (or its previous hold has
 *  expired). Two concurrent requests for the same seat therefore cannot both
 *  win — exactly one update matches the predicate; the other matches nothing.
 *
 *  A reservation spans multiple seats, so we claim them one by one and, if we
 *  fail to win them all, we COMPENSATE by releasing the seats we did win. This
 *  gives all-or-nothing semantics without requiring multi-document transactions
 *  (so it runs on standalone MongoDB, not just a replica set).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ttlMs = () => config.reservationTtlMinutes * 60 * 1000;

/** Predicate for a seat that may be (re)claimed: free, or an expired hold. */
const claimablePredicate = (now) => ({
  $or: [
    { status: SEAT_STATUS.AVAILABLE },
    { status: SEAT_STATUS.RESERVED, reservedUntil: { $lte: now } },
  ],
});

/**
 * Reserve seats for an event for the configured TTL.
 * @returns {{ reservation, seats }}
 */
export async function reserveSeats({ userId, eventId, seatNumbers }) {
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Event not found');

  // Validate the requested seats actually belong to this event.
  const existing = await Seat.find({ eventId, seatNumber: { $in: seatNumbers } });
  if (existing.length !== seatNumbers.length) {
    const known = new Set(existing.map((s) => s.seatNumber));
    const unknown = seatNumbers.filter((s) => !known.has(s));
    throw ApiError.badRequest('Some seats do not exist for this event', { seats: unknown });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs());
  // Pre-generate the reservation id so we can stamp seats before persisting the
  // reservation doc — that way a failed claim leaves no orphan reservation.
  const reservationId = new mongoose.Types.ObjectId();

  const claimed = [];
  for (const seatNumber of seatNumbers) {
    // eslint-disable-next-line no-await-in-loop
    const seat = await Seat.findOneAndUpdate(
      { eventId, seatNumber, ...claimablePredicate(now) },
      {
        $set: {
          status: SEAT_STATUS.RESERVED,
          reservedUntil: expiresAt,
          reservationId,
        },
      },
      { new: true }
    );
    if (seat) claimed.push(seat);
  }

  if (claimed.length !== seatNumbers.length) {
    // Compensate: release the seats we managed to grab in this attempt.
    await releaseSeatsByReservation(reservationId);
    const wonNumbers = new Set(claimed.map((s) => s.seatNumber));
    const taken = seatNumbers.filter((s) => !wonNumbers.has(s));
    throw ApiError.conflict('Some seats are no longer available', { seats: taken });
  }

  const reservation = await Reservation.create({
    _id: reservationId,
    userId,
    eventId,
    seatNumbers,
    expiresAt,
    status: RESERVATION_STATUS.ACTIVE,
  });

  broadcast(claimed, SEAT_STATUS.RESERVED);
  return { reservation, seats: claimed };
}

/**
 * Confirm a reservation into a booking. Marks seats as booked and removes the
 * reservation. Fails if the reservation is missing, not owned by the user, or
 * expired.
 * @returns {{ booking, seats }}
 */
export async function confirmBooking({ userId, reservationId }) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw ApiError.notFound('Reservation not found');

  if (String(reservation.userId) !== String(userId)) {
    throw ApiError.forbidden('This reservation belongs to another user');
  }

  const now = new Date();
  if (
    reservation.status !== RESERVATION_STATUS.ACTIVE ||
    reservation.expiresAt <= now
  ) {
    // Reservation lapsed — free any seats it might still be holding.
    await releaseSeatsByReservation(reservation._id, now);
    reservation.status = RESERVATION_STATUS.EXPIRED;
    await reservation.save();
    throw ApiError.conflict('Reservation has expired — please reserve again');
  }

  const booked = [];
  for (const seatNumber of reservation.seatNumbers) {
    // eslint-disable-next-line no-await-in-loop
    const seat = await Seat.findOneAndUpdate(
      {
        eventId: reservation.eventId,
        seatNumber,
        status: SEAT_STATUS.RESERVED,
        reservationId: reservation._id,
        reservedUntil: { $gt: now },
      },
      { $set: { status: SEAT_STATUS.BOOKED, reservedUntil: null } },
      { new: true }
    );
    if (seat) booked.push(seat);
  }

  if (booked.length !== reservation.seatNumbers.length) {
    // Extremely rare (would require the hold to lapse mid-loop). Roll the
    // just-booked seats back to reserved so we don't leave a partial booking.
    await Seat.updateMany(
      {
        reservationId: reservation._id,
        status: SEAT_STATUS.BOOKED,
        seatNumber: { $in: booked.map((s) => s.seatNumber) },
      },
      { $set: { status: SEAT_STATUS.RESERVED, reservedUntil: reservation.expiresAt } }
    );
    throw ApiError.conflict('Could not confirm all seats — please reserve again');
  }

  // Detach booked seats from the reservation, then create the booking record
  // and remove the reservation as the task specifies.
  await Seat.updateMany(
    { reservationId: reservation._id },
    { $set: { reservationId: null } }
  );

  const booking = await Booking.create({
    userId,
    eventId: reservation.eventId,
    seatNumbers: reservation.seatNumbers,
    reservationId: reservation._id,
  });

  await Reservation.deleteOne({ _id: reservation._id });

  broadcast(booked, SEAT_STATUS.BOOKED);
  return { booking, seats: booked };
}

/**
 * Release every seat held by a reservation back to available. Idempotent — only
 * touches seats still flagged as reserved by this reservation.
 */
export async function releaseSeatsByReservation(reservationId) {
  // Capture which seats we're freeing so we can broadcast them afterwards.
  const toRelease = await Seat.find(
    { reservationId, status: SEAT_STATUS.RESERVED },
    { seatNumber: 1, eventId: 1 }
  );
  if (!toRelease.length) return;

  await Seat.updateMany(
    { reservationId, status: SEAT_STATUS.RESERVED },
    {
      $set: {
        status: SEAT_STATUS.AVAILABLE,
        reservedUntil: null,
        reservationId: null,
      },
    }
  );

  broadcast(toRelease, SEAT_STATUS.AVAILABLE);
}

/**
 * Sweeper: free any seats whose hold has expired and mark the lapsed
 * reservations as expired. Safe to run on an interval; also covers the case
 * where the server was down when a hold elapsed.
 * @returns {{ freedSeats: number, expiredReservations: number }}
 */
export async function sweepExpired(now = new Date()) {
  const toFree = await Seat.find(
    { status: SEAT_STATUS.RESERVED, reservedUntil: { $lte: now } },
    { seatNumber: 1, eventId: 1 }
  );

  const seatResult = await Seat.updateMany(
    { status: SEAT_STATUS.RESERVED, reservedUntil: { $lte: now } },
    {
      $set: {
        status: SEAT_STATUS.AVAILABLE,
        reservedUntil: null,
        reservationId: null,
      },
    }
  );

  if (toFree.length) broadcast(toFree, SEAT_STATUS.AVAILABLE);

  const resResult = await Reservation.updateMany(
    { status: RESERVATION_STATUS.ACTIVE, expiresAt: { $lte: now } },
    { $set: { status: RESERVATION_STATUS.EXPIRED } }
  );

  return {
    freedSeats: seatResult.modifiedCount ?? 0,
    expiredReservations: resResult.modifiedCount ?? 0,
  };
}
