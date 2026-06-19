import mongoose from 'mongoose';

export const SEAT_STATUS = Object.freeze({
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  BOOKED: 'booked',
});

export const SEAT_TIER = Object.freeze({
  VIP: 'vip',
  PREMIUM: 'premium',
  STANDARD: 'standard',
});

const seatSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    seatNumber: { type: String, required: true },
    row: { type: Number, required: true },
    column: { type: Number, required: true },
    // Pricing tier and per-seat price (in the event's minor-unit-free currency).
    tier: {
      type: String,
      enum: Object.values(SEAT_TIER),
      default: SEAT_TIER.STANDARD,
    },
    price: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: Object.values(SEAT_STATUS),
      default: SEAT_STATUS.AVAILABLE,
      index: true,
    },
    // Set while a seat is held by a reservation. Used for atomic claims and
    // lazy expiry — a reserved seat whose hold has elapsed is treated as free.
    reservedUntil: { type: Date, default: null },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
    },
  },
  { timestamps: true }
);

// A seat number is unique within an event. This guarantees the seed/grid never
// creates duplicates and gives us a natural key for lookups.
seatSchema.index({ eventId: 1, seatNumber: 1 }, { unique: true });

/**
 * Effective status from the client's perspective: a reserved seat whose hold
 * has expired should render as available even before the sweeper frees it.
 */
seatSchema.methods.effectiveStatus = function effectiveStatus(now = new Date()) {
  if (
    this.status === SEAT_STATUS.RESERVED &&
    this.reservedUntil &&
    this.reservedUntil <= now
  ) {
    return SEAT_STATUS.AVAILABLE;
  }
  return this.status;
};

seatSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.status = ret.status; // keep raw status
    delete ret.__v;
    return ret;
  },
});

export const Seat = mongoose.model('Seat', seatSchema);
