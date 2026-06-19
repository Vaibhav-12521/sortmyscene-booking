import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config, isProd } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Behind a hosting proxy (Render/Heroku/etc.) trust the first hop so req.ip
  // and rate limiting use the real client IP from X-Forwarded-For.
  if (isProd) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.clientOrigins.length ? config.clientOrigins : true,
      credentials: true,
    })
  );
  app.use(express.json());
  if (!isProd) app.use(morgan('dev'));

  // Light rate limiting to blunt brute-force / abuse on the API.
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
