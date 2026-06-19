import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { User } from '../src/models/User.js';
import { Event } from '../src/models/Event.js';
import { Seat, SEAT_STATUS } from '../src/models/Seat.js';
import { Reservation, RESERVATION_STATUS } from '../src/models/Reservation.js';
import {
  reserveSeats,
  confirmBooking,
  sweepExpired,
} from '../src/services/booking.service.js';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Event.deleteMany({}),
    Seat.deleteMany({}),
    Reservation.deleteMany({}),
  ]);
});

async function makeUser(email) {
  return User.create({
    name: 'Test',
    email,
    passwordHash: await User.hashPassword('password123'),
  });
}

async function makeEvent() {
  const event = await Event.create({
    name: 'Test Event',
    venue: 'Test Venue',
    startsAt: new Date(Date.now() + 86400000),
    totalSeats: 4,
    rows: 2,
    columns: 2,
  });
  await Seat.insertMany([
    { eventId: event._id, seatNumber: 'A1', row: 1, column: 1 },
    { eventId: event._id, seatNumber: 'A2', row: 1, column: 2 },
    { eventId: event._id, seatNumber: 'B1', row: 2, column: 1 },
    { eventId: event._id, seatNumber: 'B2', row: 2, column: 2 },
  ]);
  return event;
}

describe('reservation + booking happy path', () => {
  it('reserves seats then confirms a booking', async () => {
    const user = await makeUser('a@test.com');
    const event = await makeEvent();

    const { reservation } = await reserveSeats({
      userId: user.id,
      eventId: event.id,
      seatNumbers: ['A1', 'A2'],
    });

    const reserved = await Seat.find({ seatNumber: { $in: ['A1', 'A2'] } });
    expect(reserved.every((s) => s.status === SEAT_STATUS.RESERVED)).toBe(true);

    const { booking } = await confirmBooking({
      userId: user.id,
      reservationId: reservation.id,
    });

    expect(booking.seatNumbers.sort()).toEqual(['A1', 'A2']);
    const booked = await Seat.find({ seatNumber: { $in: ['A1', 'A2'] } });
    expect(booked.every((s) => s.status === SEAT_STATUS.BOOKED)).toBe(true);
    // Reservation is removed after booking.
    expect(await Reservation.findById(reservation.id)).toBeNull();
  });
});

describe('double-booking prevention under concurrency', () => {
  it('lets exactly one of many concurrent reservations win the same seat', async () => {
    const event = await makeEvent();
    const users = await Promise.all(
      Array.from({ length: 12 }, (_, i) => makeUser(`u${i}@test.com`))
    );

    // Everyone races for the same single seat at the same time.
    const results = await Promise.allSettled(
      users.map((u) =>
        reserveSeats({ userId: u.id, eventId: event.id, seatNumbers: ['A1'] })
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(11);
    // Every failure is a 409 conflict, not a crash.
    expect(failed.every((r) => r.reason.statusCode === 409)).toBe(true);

    const seat = await Seat.findOne({ seatNumber: 'A1' });
    expect(seat.status).toBe(SEAT_STATUS.RESERVED);
  });

  it('is all-or-nothing: a partially-taken multi-seat request reserves nothing', async () => {
    const event = await makeEvent();
    const [alice, bob] = await Promise.all([
      makeUser('alice@test.com'),
      makeUser('bob@test.com'),
    ]);

    // Alice holds A1.
    await reserveSeats({ userId: alice.id, eventId: event.id, seatNumbers: ['A1'] });

    // Bob asks for A1 + A2 — A1 is taken, so the whole request must fail and
    // A2 must remain available (compensation rolled it back).
    await expect(
      reserveSeats({ userId: bob.id, eventId: event.id, seatNumbers: ['A2', 'A1'] })
    ).rejects.toMatchObject({ statusCode: 409 });

    const a2 = await Seat.findOne({ seatNumber: 'A2' });
    expect(a2.status).toBe(SEAT_STATUS.AVAILABLE);
    expect(a2.reservationId).toBeNull();
  });
});

describe('expired reservations', () => {
  it('refuses to book an expired reservation and frees the seats', async () => {
    const user = await makeUser('exp@test.com');
    const event = await makeEvent();

    const { reservation } = await reserveSeats({
      userId: user.id,
      eventId: event.id,
      seatNumbers: ['B1'],
    });

    // Force the hold into the past.
    const past = new Date(Date.now() - 1000);
    await Reservation.updateOne({ _id: reservation.id }, { $set: { expiresAt: past } });
    await Seat.updateOne({ seatNumber: 'B1' }, { $set: { reservedUntil: past } });

    await expect(
      confirmBooking({ userId: user.id, reservationId: reservation.id })
    ).rejects.toMatchObject({ statusCode: 409 });

    const seat = await Seat.findOne({ seatNumber: 'B1' });
    expect(seat.status).toBe(SEAT_STATUS.AVAILABLE);
  });

  it('sweeper frees seats whose holds have lapsed', async () => {
    const user = await makeUser('sweep@test.com');
    const event = await makeEvent();

    await reserveSeats({ userId: user.id, eventId: event.id, seatNumbers: ['B2'] });
    const past = new Date(Date.now() - 1000);
    await Seat.updateOne({ seatNumber: 'B2' }, { $set: { reservedUntil: past } });

    const { freedSeats } = await sweepExpired();
    expect(freedSeats).toBeGreaterThanOrEqual(1);

    const seat = await Seat.findOne({ seatNumber: 'B2' });
    expect(seat.status).toBe(SEAT_STATUS.AVAILABLE);
  });
});
