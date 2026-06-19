import mongoose from 'mongoose';
import { config } from './env.js';

let memoryServer = null;

export async function connectDB() {
  mongoose.set('strictQuery', true);

  let uri = config.mongoUri;

  if (!uri) {

    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();

    console.warn(
      '[db] MONGODB_URI not set - started in-memory MongoDB (data is ephemeral).'
    );
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });


  console.log(`[db] Connected to MongoDB (${mongoose.connection.name}).`);
  return mongoose.connection;
}

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
