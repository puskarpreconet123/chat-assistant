import { streamClient } from '../config/redis.js';

export const MESSAGES_STREAM_KEY = 'stream:messages';

export async function enqueueMessage(messagePayload) {
  try {
    const payloadJson = JSON.stringify(messagePayload);
    if (typeof streamClient.xadd === 'function') {
      const entryId = await streamClient.xadd(
        MESSAGES_STREAM_KEY,
        '*',
        'payload', payloadJson
      );
      return entryId;
    }
  } catch (err) {
    if (!err.message.includes('Unsupported command')) {
      console.error('[StreamProducer] Error enqueuing message:', err.message);
    }
  }
  return `stream-${Date.now()}`;
}
