import { asyncHandler } from '../utils/asyncHandler.js';
import { reserveSeats } from '../services/booking.service.js';

export const createReservation = asyncHandler(async (req, res) => {
  const { eventId, seatNumbers } = req.body;

  const { reservation, seats } = await reserveSeats({
    userId: req.user.id,
    eventId,
    seatNumbers,
  });

  res.status(201).json({
    reservation: {
      id: reservation.id,
      eventId: reservation.eventId,
      seatNumbers: reservation.seatNumbers,
      expiresAt: reservation.expiresAt,
      status: reservation.status,
    },
    seats: seats.map((s) => ({
      seatNumber: s.seatNumber,
      status: s.status,
    })),
  });
});
