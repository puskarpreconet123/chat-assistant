import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { config } from '../config/env.js';
import { generatePresignedDownloadUrl as generateImageDownloadUrl } from '../services/image.service.js';

export async function getMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const { cursor, limit = 20 } = req.query;

    const isAgentUser = req.user.role === 'agent';
    const isAdminUser = isAgentUser && String(req.user.emailId).toUpperCase().includes('ADMIN');

    // Admin has access to all messages. Others must be a participant of the conversation.
    if (!isAdminUser) {
      const conv = await Conversation.findById(conversationId);
      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      if (conv.agentId !== req.user.emailId && conv.emailId !== req.user.emailId) {
        return res.status(403).json({ error: 'Access denied: You are not a participant of this conversation' });
      }
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = { conversationId };
    if (cursor) {
      filter.createdAt = { $lt: new Date(cursor) };
    }

    // Index utilized: { conversationId: 1, createdAt: -1 }
    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(parsedLimit + 1);

    const hasMore = messages.length > parsedLimit;
    if (hasMore) {
      messages.pop(); // Remove extra item used for checking hasMore
    }

    const nextCursor = messages.length > 0 ? messages[messages.length - 1].createdAt.toISOString() : null;

    const messagesWithCdn = await Promise.all(messages.map(async msg => {
      const obj = msg.toObject();
      if (obj.type === 'voice' && obj.audio && obj.audio.key) {
        const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true';
        if (isMock) {
          obj.audio.cdnUrl = `/uploads/${obj.audio.key}`;
        } else {
          obj.audio.cdnUrl = `${config.s3.cdnBaseUrl}/${obj.audio.key}`;
        }
      }
      if (obj.type === 'image' && obj.image && obj.image.key) {
        const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true';
        if (isMock) {
          obj.image.cdnUrl = `/uploads/${obj.image.key}`;
        } else {
          try {
            const signedData = await generateImageDownloadUrl({ fileKey: obj.image.key });
            obj.image.cdnUrl = signedData.url;
          } catch (err) {
            obj.image.cdnUrl = `${config.s3.cdnBaseUrl}/${obj.image.key}`;
          }
        }
      }
      return obj;
    }));

    return res.json({
      conversationId,
      count: messagesWithCdn.length,
      hasMore,
      nextCursor,
      messages: messagesWithCdn
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
