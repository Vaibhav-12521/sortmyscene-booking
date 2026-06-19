import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bookingSchema } from '../validators/schemas.js';
import { createBooking, listMyBookings } from '../controllers/booking.controller.js';

const router = Router();

// All booking routes require authentication.
router.use(requireAuth);

router.get('/me', listMyBookings);
router.post('/', validate(bookingSchema), createBooking); // POST /api/bookings

export default router;
