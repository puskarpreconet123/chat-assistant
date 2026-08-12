import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { config } from '../config/env.js';
import { generatePresignedDownloadUrl as generateImageDownloadUrl } from '../services/image.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const { cursor, limit = 20 } = req.query;

    const isAgentUser = req.user.role === 'agent' || req.user.role === 'admin';
    const isAdminUser = req.user.role === 'admin';

    // Admin has access to all messages. Others must be a participant of the conversation.
    if (!isAdminUser) {
      const conv = await Conversation.findById(conversationId);
      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      if (conv.participant1 !== req.user.emailId && conv.participant2 !== req.user.emailId) {
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
        const localPath = path.join(__dirname, '../../public/uploads', obj.audio.key);
        const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true' || fs.existsSync(localPath);
        if (isMock) {
          obj.audio.cdnUrl = `/uploads/${obj.audio.key}`;
        } else {
          obj.audio.cdnUrl = `${config.s3.cdnBaseUrl}/${obj.audio.key}`;
        }
      }
      if (obj.type === 'image' && obj.image && obj.image.key) {
        const localPath = path.join(__dirname, '../../public/uploads', obj.image.key);
        const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true' || fs.existsSync(localPath);
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
      if (obj.type === 'recharge' && obj.recharge && obj.recharge.proofImage) {
        const localPath = path.join(__dirname, '../../public/uploads', obj.recharge.proofImage);
        const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true' || fs.existsSync(localPath);
        if (isMock) {
          obj.recharge.proofImageCdnUrl = `/uploads/${obj.recharge.proofImage}`;
        } else {
          try {
            const signedData = await generateImageDownloadUrl({ fileKey: obj.recharge.proofImage });
            obj.recharge.proofImageCdnUrl = signedData.url;
          } catch (err) {
            obj.recharge.proofImageCdnUrl = `${config.s3.cdnBaseUrl}/${obj.recharge.proofImage}`;
          }
        }
      }
      if (obj.type === 'withdraw' && obj.withdraw && obj.withdraw.proofImage) {
        const localPath = path.join(__dirname, '../../public/uploads', obj.withdraw.proofImage);
        const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true' || fs.existsSync(localPath);
        if (isMock) {
          obj.withdraw.proofImageCdnUrl = `/uploads/${obj.withdraw.proofImage}`;
        } else {
          try {
            const signedData = await generateImageDownloadUrl({ fileKey: obj.withdraw.proofImage });
            obj.withdraw.proofImageCdnUrl = signedData.url;
          } catch (err) {
            obj.withdraw.proofImageCdnUrl = `${config.s3.cdnBaseUrl}/${obj.withdraw.proofImage}`;
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
