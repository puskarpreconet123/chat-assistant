import { generatePresignedUploadUrl, generatePresignedDownloadUrl } from '../services/voice.service.js';

export async function getVoiceUploadUrl(req, res) {
  try {
    const { conversationId, mimeType = 'audio/webm' } = req.body;
    const senderId = req.user.userId;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
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

    const data = await generatePresignedDownloadUrl({ fileKey: key });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

