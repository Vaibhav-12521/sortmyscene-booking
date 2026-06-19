import http from 'http';
import { createApp } from './app.js';
import { connectDB, disconnectDB, isEphemeralDB } from './config/db.js';
import { config } from './config/env.js';
import { sweepExpired } from './services/booking.service.js';
import { seedDatabase } from './scripts/seedData.js';
import { initRealtime } from './realtime/io.js';
import { Event } from './models/Event.js';

const SWEEP_INTERVAL_MS = 30 * 1000;

async function maybeSeed() {


  if (isEphemeralDB()) {
    console.log('[db] Seeding demo data into in-memory database…');
    await seedDatabase((msg) => console.log(`      ${msg}`));
    return;
  }
  if (config.seedOnStart && (await Event.estimatedDocumentCount()) === 0) {
    console.log('[db] SEED_ON_START set and DB empty - seeding demo data…');
    await seedDatabase((msg) => console.log(`      ${msg}`));
  }
}

async function start() {
  await connectDB();
  await maybeSeed();

  const app = createApp();
  const server = http.createServer(app);
  initRealtime(server);

  server.listen(config.port, () => {

    console.log(`[server] SortMyScene API + realtime on http://localhost:${config.port}`);
  });


  const sweeper = setInterval(() => {
    sweepExpired().catch((err) => {

      console.error('[sweeper]', err.message);
    });
  }, SWEEP_INTERVAL_MS);
  sweeper.unref();

  const shutdown = async (signal) => {

    console.log(`\n[server] ${signal} received - shutting down`);
    clearInterval(sweeper);
    server.close();
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {

  console.error('[server] Failed to start:', err);
  process.exit(1);
});
