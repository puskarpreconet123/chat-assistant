import mongoose from 'mongoose';
import { connectDB } from './src/config/database.js';

async function run() {
  await connectDB();
  const db = mongoose.connection.db;
  const rawConv = await db.collection('conversations').findOne({ _id: 'conv-ADMIN-1-AGENCY-23' });
  console.log('Raw Conversation in DB:', JSON.stringify(rawConv, null, 2));
  mongoose.connection.close();
}

run();
