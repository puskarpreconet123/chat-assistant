import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    agentId: { type: String, required: true, ref: 'Agent' },
    emailId: { type: String, required: true, ref: 'User' },
    lastMessageAt: { type: Date, default: Date.now },
    unread: {
      agent: { type: Number, default: 0 },
      user: { type: Number, default: 0 }
    }
  },
  { _id: false, timestamps: false }
);

ConversationSchema.index({ agentId: 1, lastMessageAt: -1 });
ConversationSchema.index({ agentId: 1, emailId: 1 }, { unique: true });

export const Conversation = mongoose.model('Conversation', ConversationSchema);
