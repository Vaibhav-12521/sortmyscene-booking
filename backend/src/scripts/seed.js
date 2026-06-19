import { connectDB, disconnectDB } from '../config/db.js';
import { config } from '../config/env.js';
import { seedDatabase } from './seedData.js';

async function run() {
  if (!config.mongoUri) {

    console.warn(
      '⚠️  MONGODB_URI is not set. Seeding an in-memory DB has no effect once this\n' +
        '   process exits. Set MONGODB_URI in backend/.env to seed a persistent DB.'
    );
  }

  await connectDB();

  await seedDatabase((msg) => console.log(msg));

  console.log('\n✅ Seed complete.');
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {

  console.error('Seed failed:', err);
  process.exit(1);
});
