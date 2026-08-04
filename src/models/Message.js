import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    conversationId: { type: String, required: true, ref: 'Conversation' },
    senderId: { type: String, required: true },
    senderType: { type: String, required: true, enum: ['agent', 'user'] },
    type: { type: String, required: true, enum: ['text', 'voice', 'image'] },
    text: { type: String },
    audio: {
      key: { type: String },
      duration: { type: Number },
      mimeType: { type: String }
    },
    image: {
      key: { type: String },
      mimeType: { type: String }
    },
    status: {
      type: String,
      required: true,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent'
    },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false, timestamps: false }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model('Message', MessageSchema);
