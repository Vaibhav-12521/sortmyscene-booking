import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { confirmBooking } from '../services/booking.service.js';
import { Booking } from '../models/Booking.js';

const serializeBooking = (b) => ({
  id: b.id,
  seatNumbers: b.seatNumbers,
  createdAt: b.createdAt,
  checkedInAt: b.checkedInAt,
  event: b.eventId && b.eventId.name
    ? {
        id: b.eventId.id,
        name: b.eventId.name,
        venue: b.eventId.venue,
        startsAt: b.eventId.startsAt,
        currency: b.eventId.currency || 'INR',
      }
    : null,
});

export const createBooking = asyncHandler(async (req, res) => {
  const { reservationId } = req.body;

  const { booking, seats } = await confirmBooking({
    userId: req.user.id,
    reservationId,
  });

  res.status(201).json({
    booking: {
      id: booking.id,
      eventId: booking.eventId,
      seatNumbers: booking.seatNumbers,
      createdAt: booking.createdAt,
    },
    seats: seats.map((s) => ({ seatNumber: s.seatNumber, status: s.status })),
  });
});

export const listMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .populate('eventId', 'name venue startsAt currency');

  res.json({ bookings: bookings.map(serializeBooking) });
});

export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate(
    'eventId',
    'name venue startsAt currency'
  );
  if (!booking) throw ApiError.notFound('Booking not found');
  res.json({ booking: serializeBooking(booking) });
});

export const checkInBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate(
    'eventId',
    'name venue startsAt currency'
  );
  if (!booking) throw ApiError.notFound('Booking not found');

  if (booking.checkedInAt) {
    return res.json({
      result: 'already',
      checkedInAt: booking.checkedInAt,
      booking: serializeBooking(booking),
    });
  }

  booking.checkedInAt = new Date();
  await booking.save();

  res.json({ result: 'valid', booking: serializeBooking(booking) });
});
