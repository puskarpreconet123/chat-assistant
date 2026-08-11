import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    participant1: { type: String, required: true },
    participant2: { type: String, required: true },
    lastMessageAt: { type: Date, default: Date.now },
    unread1: { type: Number, default: 0 },
    unread2: { type: Number, default: 0 }
  },
  { _id: false, timestamps: false }
);

ConversationSchema.index({ participant1: 1, lastMessageAt: -1 });
ConversationSchema.index({ participant2: 1, lastMessageAt: -1 });
ConversationSchema.index({ participant1: 1, participant2: 1 }, { unique: true });

export const Conversation = mongoose.model('Conversation', ConversationSchema);
