import { generatePresignedUploadUrl, generatePresignedDownloadUrl } from '../services/image.service.js';

export async function getImageUploadUrl(req, res) {
  try {
    const { conversationId, mimeType = 'image/jpeg' } = req.body;
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

export async function getImagePlayUrl(req, res) {
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
