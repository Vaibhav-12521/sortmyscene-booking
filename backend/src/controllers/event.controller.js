import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Event } from '../models/Event.js';
import { Seat } from '../models/Seat.js';

/** Serialize a seat with its effective (expiry-aware) status for the client. */
const serializeSeat = (seat, now) => ({
  id: seat.id,
  seatNumber: seat.seatNumber,
  row: seat.row,
  column: seat.column,
  tier: seat.tier,
  price: seat.price,
  status: seat.effectiveStatus(now),
});

/** GET /api/events — list all events with a live availability summary. */
export const listEvents = asyncHandler(async (_req, res) => {
  const now = new Date();
  const events = await Event.find().sort({ startsAt: 1 }).lean({ virtuals: true });

  // Compute available seat counts in one grouped aggregation.
  const counts = await Seat.aggregate([
    {
      $project: {
        eventId: 1,
        price: 1,
        isAvailable: {
          $or: [
            { $eq: ['$status', 'available'] },
            {
              $and: [
                { $eq: ['$status', 'reserved'] },
                { $lte: ['$reservedUntil', now] },
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: '$eventId',
        available: { $sum: { $cond: ['$isAvailable', 1, 0] } },
        priceFrom: { $min: '$price' },
      },
    },
  ]);

  const statsByEvent = new Map(counts.map((c) => [String(c._id), c]));

  const payload = events.map((e) => {
    const stats = statsByEvent.get(String(e._id));
    return {
      id: String(e._id),
      name: e.name,
      description: e.description,
      venue: e.venue,
      startsAt: e.startsAt,
      totalSeats: e.totalSeats,
      rows: e.rows,
      columns: e.columns,
      currency: e.currency || 'INR',
      priceFrom: stats?.priceFrom ?? 0,
      availableSeats: stats?.available ?? 0,
    };
  });

  res.json({ events: payload });
});

/** GET /api/events/:id — single event with full seat map. */
export const getEvent = asyncHandler(async (req, res) => {
  const now = new Date();
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');

  const seats = await Seat.find({ eventId: event.id }).sort({ row: 1, column: 1 });
  const serializedSeats = seats.map((s) => serializeSeat(s, now));
  const availableSeats = serializedSeats.filter((s) => s.status === 'available').length;

  res.json({
    event: { ...event.toJSON(), availableSeats },
    seats: serializedSeats,
  });
});
