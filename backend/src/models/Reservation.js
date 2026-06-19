import mongoose from 'mongoose';

export const RESERVATION_STATUS = Object.freeze({
  ACTIVE: 'active',
  BOOKED: 'booked',
  EXPIRED: 'expired',
});

const reservationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    seatNumbers: { type: [String], required: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(RESERVATION_STATUS),
      default: RESERVATION_STATUS.ACTIVE,
    },
  },
  { timestamps: true }
);

reservationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60, partialFilterExpression: { status: RESERVATION_STATUS.ACTIVE } }
);

reservationSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Reservation = mongoose.model('Reservation', reservationSchema);
