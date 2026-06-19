import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    venue: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true },
    totalSeats: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },
    // Seat layout is convenience metadata for rendering the grid on the client.
    rows: { type: Number, required: true, min: 1 },
    columns: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

eventSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Event = mongoose.model('Event', eventSchema);
