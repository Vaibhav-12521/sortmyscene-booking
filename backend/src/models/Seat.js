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


    reservedUntil: { type: Date, default: null },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
    },
  },
  { timestamps: true }
);

seatSchema.index({ eventId: 1, seatNumber: 1 }, { unique: true });

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
    ret.status = ret.status;
    delete ret.__v;
    return ret;
  },
});

export const Seat = mongoose.model('Seat', seatSchema);
