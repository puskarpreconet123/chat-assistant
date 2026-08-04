import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    agentId: { type: String, required: true, ref: 'Agent', index: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false, timestamps: false }
);

export const User = mongoose.model('User', UserSchema);
