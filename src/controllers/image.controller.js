import { generatePresignedUploadUrl, generatePresignedDownloadUrl } from '../services/image.service.js';
import { Conversation } from '../models/Conversation.js';
import { Agent } from '../models/Agent.js';

export async function getImageUploadUrl(req, res) {
  try {
    let { conversationId, mimeType = 'image/jpeg' } = req.body;
    if (conversationId) conversationId = String(conversationId).trim();
    if (mimeType) mimeType = String(mimeType).trim();
    const senderId = req.user.emailId;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    const agentDoc = await Agent.findOne({ $or: [{ _id: senderId }, { emailId: senderId }] });
    const isAdmin = req.user.role === 'admin' || (agentDoc && agentDoc.type === 'ADMIN');

    if (!isAdmin) {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        if (senderId !== conversation.participant1 && senderId !== conversation.participant2) {
          return res.status(403).json({ error: 'Access denied: You are not a participant in this conversation' });
        }
      } else if (conversationId.startsWith('conv-')) {
        if (!conversationId.startsWith(`conv-${senderId}-`) && !conversationId.endsWith(`-${senderId}`)) {
          return res.status(403).json({ error: 'Access denied: You are not a participant in this conversation' });
        }
      }
    }

    const presignedData = await generatePresignedUploadUrl({
      conversationId,
      senderId,
      mimeType
    });

    return res.json(presignedData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getImagePlayUrl(req, res) {
  try {
    let { key } = req.query;
    if (!key) {
      return res.status(400).json({ error: 'key query parameter is required' });
    }
    key = String(key).trim();

    // Verify key participant authorization
    const userId = req.user.emailId;
    const agentDoc = await Agent.findOne({ $or: [{ _id: userId }, { emailId: userId }] });
    const isAdmin = req.user.role === 'admin' || (agentDoc && agentDoc.type === 'ADMIN');

    if (!isAdmin) {
      const parts = key.split('/');
      if (parts.length >= 2) {
        const conversationId = parts[1];
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          if (userId !== conversation.participant1 && userId !== conversation.participant2) {
            return res.status(403).json({ error: 'Access denied: You are not a participant in this conversation' });
          }
        } else if (conversationId.startsWith('conv-')) {
          if (!conversationId.startsWith(`conv-${userId}-`) && !conversationId.endsWith(`-${userId}`)) {
            return res.status(403).json({ error: 'Access denied: You are not a participant in this conversation' });
          }
        }
      }
    }

    const data = await generatePresignedDownloadUrl({ fileKey: key });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
