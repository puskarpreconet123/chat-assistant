import { generatePresignedUploadUrl, generatePresignedDownloadUrl } from '../services/voice.service.js';
import { Conversation } from '../models/Conversation.js';

export async function getVoiceUploadUrl(req, res) {
  try {
    const { conversationId, mimeType = 'audio/webm' } = req.body;
    const senderId = req.user.emailId;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    // Verify conversation participant authorization
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

export async function getVoicePlayUrl(req, res) {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ error: 'key query parameter is required' });
    }

    // Verify key participant authorization
    const parts = key.split('/');
    if (parts.length >= 2) {
      const conversationId = parts[1];
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        if (req.user.emailId !== conversation.participant1 && req.user.emailId !== conversation.participant2) {
          return res.status(403).json({ error: 'Access denied: You are not a participant in this conversation' });
        }
      } else if (conversationId.startsWith('conv-')) {
        const userId = req.user.emailId;
        if (!conversationId.startsWith(`conv-${userId}-`) && !conversationId.endsWith(`-${userId}`)) {
          return res.status(403).json({ error: 'Access denied: You are not a participant in this conversation' });
        }
      }
    }

    const data = await generatePresignedDownloadUrl({ fileKey: key });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

