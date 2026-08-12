import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Emitter } from '@socket.io/redis-emitter';
import { streamClient, pubClient } from '../config/redis.js';
import { MESSAGES_STREAM_KEY } from './streamProducer.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { isOnline } from '../services/presence.service.js';
import { sendPushNotification } from '../services/push.service.js';
import { config } from '../config/env.js';
import { generatePresignedDownloadUrl as generateImageDownloadUrl } from '../services/image.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONSUMER_GROUP = 'messages-consumer-group';
export const CONSUMER_NAME = `worker-${process.pid}-${Math.floor(Math.random() * 1000)}`;

const emitter = new Emitter(pubClient);

export async function initConsumerGroup() {
  try {
    if (typeof streamClient.xgroup === 'function') {
      await streamClient.xgroup('CREATE', MESSAGES_STREAM_KEY, CONSUMER_GROUP, '0', 'MKSTREAM');
      console.log(`[StreamWorker] Created Redis stream group "${CONSUMER_GROUP}"`);
    }
  } catch (err) {
    if (err.message.includes('BUSYGROUP')) {
      console.log(`[StreamWorker] Redis stream group "${CONSUMER_GROUP}" already exists`);
    } else if (!err.message.includes('Unsupported command')) {
      console.error('[StreamWorker] Error creating consumer group:', err.message);
    }
  }
}

export async function processStreamMessage(streamMessageId, rawPayload) {
  try {
    const data = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    const {
      _id,
      conversationId,
      senderId,
      senderType,
      type = 'text',
      text,
      audio,
      image,
      recharge,
      withdraw,
      createdAt = new Date(),
      participant1,
      participant2,
      recipientId,
      recipientType
    } = data;

    console.log(`[StreamWorker] Processing message ${_id} for conversation ${conversationId}`);

    // 1. Persist message to MongoDB
    const createdMessage = await Message.create({
      _id,
      conversationId,
      senderId,
      senderType,
      type,
      text,
      audio,
      image,
      recharge,
      withdraw,
      status: 'sent',
      createdAt: new Date(createdAt)
    });

    const incField = recipientId === participant1 ? 'unread1' : 'unread2';

    // 2. Upsert Conversation & update unread count + lastMessageAt
    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $setOnInsert: {
          participant1,
          participant2
        },
        $set: {
          lastMessageAt: new Date(createdAt)
        },
        $inc: {
          [incField]: 1
        }
      },
      { upsert: true, new: true }
    );

    const messageObj = createdMessage.toObject();
    if (messageObj.type === 'voice' && messageObj.audio && messageObj.audio.key) {
      const localPath = path.join(__dirname, '../../public/uploads', messageObj.audio.key);
      const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true' || fs.existsSync(localPath);
      if (isMock) {
        messageObj.audio.cdnUrl = `/uploads/${messageObj.audio.key}`;
      } else {
        messageObj.audio.cdnUrl = `${config.s3.cdnBaseUrl}/${messageObj.audio.key}`;
      }
    }
    if (messageObj.type === 'image' && messageObj.image && messageObj.image.key) {
      const localPath = path.join(__dirname, '../../public/uploads', messageObj.image.key);
      const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true' || fs.existsSync(localPath);
      if (isMock) {
        messageObj.image.cdnUrl = `/uploads/${messageObj.image.key}`;
      } else {
        try {
          const signedData = await generateImageDownloadUrl({ fileKey: messageObj.image.key });
          messageObj.image.cdnUrl = signedData.url;
        } catch (err) {
          messageObj.image.cdnUrl = `${config.s3.cdnBaseUrl}/${messageObj.image.key}`;
        }
      }
    }
    if (messageObj.type === 'recharge' && messageObj.recharge && messageObj.recharge.proofImage) {
      const localPath = path.join(__dirname, '../../public/uploads', messageObj.recharge.proofImage);
      const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true' || fs.existsSync(localPath);
      if (isMock) {
        messageObj.recharge.proofImageCdnUrl = `/uploads/${messageObj.recharge.proofImage}`;
      } else {
        try {
          const signedData = await generateImageDownloadUrl({ fileKey: messageObj.recharge.proofImage });
          messageObj.recharge.proofImageCdnUrl = signedData.url;
        } catch (err) {
          messageObj.recharge.proofImageCdnUrl = `${config.s3.cdnBaseUrl}/${messageObj.recharge.proofImage}`;
        }
      }
    }
    if (messageObj.type === 'withdraw' && messageObj.withdraw && messageObj.withdraw.proofImage) {
      const localPath = path.join(__dirname, '../../public/uploads', messageObj.withdraw.proofImage);
      const isMock = config.s3.accessKeyId === 'mock-access-key' || !config.s3.accessKeyId || process.env.USE_MOCK_S3 === 'true' || fs.existsSync(localPath);
      if (isMock) {
        messageObj.withdraw.proofImageCdnUrl = `/uploads/${messageObj.withdraw.proofImage}`;
      } else {
        try {
          const signedData = await generateImageDownloadUrl({ fileKey: messageObj.withdraw.proofImage });
          messageObj.withdraw.proofImageCdnUrl = signedData.url;
        } catch (err) {
          messageObj.withdraw.proofImageCdnUrl = `${config.s3.cdnBaseUrl}/${messageObj.withdraw.proofImage}`;
        }
      }
    }

    // 3. Emit message:new event to recipient's room
    emitter.to(`user:${recipientId}`).emit('message:new', messageObj);

    // If there is a participant in the conversation who is neither the sender nor the recipient (e.g. admin sent it),
    // also notify that participant.
    if (participant1 && participant1 !== recipientId && participant1 !== senderId) {
      emitter.to(`user:${participant1}`).emit('message:new', messageObj);
    }
    if (participant2 && participant2 !== recipientId && participant2 !== senderId) {
      emitter.to(`user:${participant2}`).emit('message:new', messageObj);
    }

    // Also notify any connected admins in real-time
    emitter.to('admins').emit('message:new', messageObj);

    // 4. Emit message:sent confirmation back to sender's room
    emitter.to(`user:${senderId}`).emit('message:sent', {
      _id,
      conversationId,
      status: 'sent',
      createdAt: messageObj.createdAt
    });

    // 5. Presence check: Send push notification if recipient is offline
    const online = await isOnline(recipientId);
    if (!online) {
      console.log(`[StreamWorker] Recipient ${recipientId} is offline. Triggering push notification.`);
      await sendPushNotification({
        recipientId,
        senderId,
        conversationId,
        text,
        type,
        audio,
        image
      });
    }

    // 6. Acknowledge message in Redis Stream (if supported)
    if (typeof streamClient.xack === 'function') {
      try {
        await streamClient.xack(MESSAGES_STREAM_KEY, CONSUMER_GROUP, streamMessageId);
      } catch (err) {
        // Ignore mock command unsupported error
      }
    }

    return messageObj;
  } catch (err) {
    console.error(`[StreamWorker] Error processing message ${streamMessageId}:`, err.message);
    throw err;
  }
}

let isRunning = false;

export async function startWorkerLoop(options = { pollMs: 2000 }) {
  await initConsumerGroup();
  isRunning = true;
  console.log(`[StreamWorker] Worker started (${CONSUMER_NAME}) listening on group "${CONSUMER_GROUP}"`);

  while (isRunning) {
    try {
      if (typeof streamClient.xreadgroup !== 'function') {
        break; // Exit loop if mock client doesn't support stream reading
      }

      const response = await streamClient.xreadgroup(
        'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
        'COUNT', 10,
        'BLOCK', options.pollMs,
        'STREAMS', MESSAGES_STREAM_KEY,
        '>'
      );

      if (response && response.length > 0) {
        for (const [streamKey, messages] of response) {
          for (const [messageId, fieldArray] of messages) {
            let payloadStr = '';
            for (let i = 0; i < fieldArray.length; i += 2) {
              if (fieldArray[i] === 'payload') {
                payloadStr = fieldArray[i + 1];
                break;
              }
            }
            if (payloadStr) {
              await processStreamMessage(messageId, payloadStr);
            }
          }
        }
      }
    } catch (err) {
      if (!isRunning) break;
      if (!err.message.includes('Unsupported command')) {
        console.error('[StreamWorker] Worker loop error:', err.message);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export function stopWorkerLoop() {
  isRunning = false;
  console.log('[StreamWorker] Worker loop stop signal received');
}
