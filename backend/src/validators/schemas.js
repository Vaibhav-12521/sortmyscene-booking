import { z } from 'zod';

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Must be a valid id');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const reserveSchema = z.object({
  eventId: objectId,
  seatNumbers: z
    .array(z.string().trim().min(1))
    .min(1, 'Select at least one seat')
    .max(10, 'You can reserve at most 10 seats at once')

    .transform((seats) => [...new Set(seats)]),
});

export const bookingSchema = z.object({
  reservationId: objectId,
});

export const eventIdParam = z.object({
  id: objectId,
});
