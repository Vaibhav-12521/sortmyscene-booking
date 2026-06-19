import dotenv from 'dotenv';

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: toInt(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI?.trim() || '',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  reservationTtlMinutes: toInt(process.env.RESERVATION_TTL_MINUTES, 10),
  // When true, seed demo data on boot if the database is empty (handy for a
  // real MONGODB_URI in Docker/demo environments). In-memory always seeds.
  seedOnStart: process.env.SEED_ON_START === 'true',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export const isProd = config.nodeEnv === 'production';
