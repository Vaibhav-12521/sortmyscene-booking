/**
 * Seed CLI — populates demo events, their seat maps, and a demo user.
 * Usage: npm run seed
 *
 * Note: when MONGODB_URI is unset the app uses an *ephemeral* in-memory DB, so
 * this CLI only makes sense against a real MONGODB_URI. (The server auto-seeds
 * the in-memory DB on boot, so you don't need this command in that mode.)
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { config } from '../config/env.js';
import { seedDatabase } from './seedData.js';

async function run() {
  if (!config.mongoUri) {
    // eslint-disable-next-line no-console
    console.warn(
      '⚠️  MONGODB_URI is not set. Seeding an in-memory DB has no effect once this\n' +
        '   process exits. Set MONGODB_URI in backend/.env to seed a persistent DB.'
    );
  }

  await connectDB();
  // eslint-disable-next-line no-console
  await seedDatabase((msg) => console.log(msg));
  // eslint-disable-next-line no-console
  console.log('\n✅ Seed complete.');
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
