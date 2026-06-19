import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { eventIdParam } from '../validators/schemas.js';
import { listEvents, getEvent } from '../controllers/event.controller.js';

const router = Router();

router.get('/', listEvents);
router.get('/:id', validate(eventIdParam, 'params'), getEvent);

export default router;
