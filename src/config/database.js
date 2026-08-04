import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[Database] MongoDB connected successfully to ${config.mongoUri}`);
  } catch (error) {
    console.error(`[Database] Failed to connect to MongoDB at ${config.mongoUri}:`, error.message);
    throw error;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  console.log('[Database] MongoDB disconnected');
}
