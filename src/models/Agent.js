import mongoose from 'mongoose';

const AgentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false, timestamps: false }
);

export const Agent = mongoose.model('Agent', AgentSchema);
