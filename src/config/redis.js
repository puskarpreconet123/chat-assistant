import { Redis } from 'ioredis';
import RedisMock from 'ioredis-mock';
import { config } from './env.js';

function createRedisInstance(name) {
  if (process.env.USE_MOCK_REDIS === 'true') {
    return new RedisMock();
  }

  const client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    } 
  });

  client.on('connect', () => console.log(`[Redis:${name}] Connecting to ${config.redisUrl}...`));
  client.on('ready', () => console.log(`[Redis:${name}] Ready`));
  client.on('error', (err) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[Redis:${name}] Error:`, err.message);
    }
  });

  return client;
}

export const redisClient = createRedisInstance('client');
export const pubClient = createRedisInstance('pub');
export const subClient = createRedisInstance('sub');
export const streamClient = createRedisInstance('stream');

export async function closeRedisConnections() {
  await Promise.allSettled([
    redisClient.quit ? redisClient.quit() : Promise.resolve(),
    pubClient.quit ? pubClient.quit() : Promise.resolve(),
    subClient.quit ? subClient.quit() : Promise.resolve(),
    streamClient.quit ? streamClient.quit() : Promise.resolve()
  ]);
}
