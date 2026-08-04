import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    const endpoint = config.s3.endpoint || `https://s3.${config.s3.region}.wasabisys.com`;
    const s3Config = {
      region: config.s3.region,
      endpoint,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey
      },
      forcePathStyle: true // Required for Wasabi S3 compatibility
    };
    s3Client = new S3Client(s3Config);
  }
  return s3Client;
}

export async function generatePresignedUploadUrl({ conversationId, senderId, mimeType = 'image/jpeg' }) {
  const extension = mimeType.split('/')[1] || 'jpeg';
  // Include conversationId and senderId in file storage path for clean auditing
  const fileKey = `images/${conversationId}/${senderId || 'anonymous'}/${uuidv4()}.${extension}`;
  const bucketName = config.s3.bucket;

  const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true';

  if (isMock) {
    console.log('[ImageService] Using local mock upload configuration');
    return {
      provider: 'Local Mock',
      uploadUrl: `/api/v1/image/upload-mock?key=${fileKey}`,
      fileKey,
      cdnUrl: `/uploads/${fileKey}`,
      bucket: bucketName,
      expiresIn: 3600
    };
  }

  try {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: mimeType,
      Metadata: {
        conversationId: conversationId || '',
        senderId: senderId || ''
      }
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    const cdnUrl = `${config.s3.cdnBaseUrl}/${fileKey}`;

    return {
      provider: 'Wasabi',
      uploadUrl,
      fileKey,
      cdnUrl,
      bucket: bucketName,
      expiresIn: 3600
    };
  } catch (err) {
    console.warn('[ImageService] Fallback to local mock upload URL:', err.message);
    return {
      provider: 'Local Mock',
      uploadUrl: `/api/v1/image/upload-mock?key=${fileKey}`,
      fileKey,
      cdnUrl: `/uploads/${fileKey}`,
      bucket: bucketName,
      expiresIn: 3600
    };
  }
}

export async function generatePresignedDownloadUrl({ fileKey }) {
  const bucketName = config.s3.bucket;
  const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true';

  if (isMock) {
    return { url: `/uploads/${fileKey}` };
  }

  // Check if file exists locally in public/uploads first (client upload fallback)
  const localPath = path.join(__dirname, '../../public/uploads', fileKey);
  try {
    await fs.promises.access(localPath);
    console.log(`[ImageService] Serving file locally from mock: ${fileKey}`);
    return { url: `/uploads/${fileKey}` };
  } catch (e) {
    // Proceed to S3 signed URL if not found locally
  }

  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey
    });
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    return { url };
  } catch (err) {
    console.error('[ImageService] Failed to generate presigned download URL:', err.message);
    throw err;
  }
}
