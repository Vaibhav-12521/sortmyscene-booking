import mongoose from 'mongoose';
import { config } from './env.js';

let memoryServer = null;

/**
 * Connect to MongoDB.
 *
 * - If MONGODB_URI is provided, we connect to it (Atlas / local / Docker).
 * - Otherwise we spin up an in-memory MongoDB via mongodb-memory-server so the
 *   project runs with zero external setup. This is intended for local dev and
 *   automated tests only — data does not persist across restarts.
 */
export async function connectDB() {
  mongoose.set('strictQuery', true);

  let uri = config.mongoUri;

  if (!uri) {
    // Lazy import so the dependency is only loaded when actually needed.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    // eslint-disable-next-line no-console
    console.warn(
      '[db] MONGODB_URI not set — started in-memory MongoDB (data is ephemeral).'
    );
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  // eslint-disable-next-line no-console
  console.log(`[db] Connected to MongoDB (${mongoose.connection.name}).`);
  return mongoose.connection;
}

/** True when running against the ephemeral in-memory MongoDB fallback. */
export function isEphemeralDB() {
  return memoryServer !== null;
}

export async function disconnectDB() {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
