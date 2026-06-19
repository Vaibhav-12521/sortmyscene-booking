import { asyncHandler } from '../utils/asyncHandler.js';
import { confirmBooking } from '../services/booking.service.js';
import { Booking } from '../models/Booking.js';

/** POST /api/bookings — confirm a reservation into a booking. */
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

/** GET /api/bookings/me — the authenticated user's booking history. */
export const listMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .populate('eventId', 'name venue startsAt currency');

  res.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      seatNumbers: b.seatNumbers,
      createdAt: b.createdAt,
      event: b.eventId
        ? {
            id: b.eventId.id,
            name: b.eventId.name,
            venue: b.eventId.venue,
            startsAt: b.eventId.startsAt,
            currency: b.eventId.currency || 'INR',
          }
        : null,
    })),
  });
});
