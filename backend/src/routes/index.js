import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reserveSchema } from '../validators/schemas.js';
import authRoutes from './auth.routes.js';
import eventRoutes from './event.routes.js';
import bookingRoutes from './booking.routes.js';
import { createReservation } from '../controllers/reservation.controller.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/bookings', bookingRoutes); // POST /bookings, GET /bookings/me

// Reserving requires authentication.
router.post('/reserve', requireAuth, validate(reserveSchema), createReservation);

export default router;
