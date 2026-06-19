import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bookingSchema } from '../validators/schemas.js';
import { createBooking, listMyBookings } from '../controllers/booking.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/me', listMyBookings);
router.post('/', validate(bookingSchema), createBooking);

export default router;
