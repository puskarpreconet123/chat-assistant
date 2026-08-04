import { redisClient } from '../config/redis.js';

const PRESENCE_TTL = 60; // seconds

export async function setPresence(userId, gatewayId, ttl = PRESENCE_TTL) {
  const key = `presence:${userId}`;
  await redisClient.set(key, gatewayId, 'EX', ttl);
}

export async function renewPresence(userId, gatewayId, ttl = PRESENCE_TTL) {
  const key = `presence:${userId}`;
  await redisClient.set(key, gatewayId, 'EX', ttl);
}

export async function removePresence(userId) {
  const key = `presence:${userId}`;
  await redisClient.del(key);
}

export async function getPresence(userId) {
  const key = `presence:${userId}`;
  return await redisClient.get(key);
}

export async function isOnline(userId) {
  const key = `presence:${userId}`;
  const gatewayId = await redisClient.get(key);
  return Boolean(gatewayId);
}
