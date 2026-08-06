import { redisClient } from '../config/redis.js';

const PRESENCE_TTL = 60; // seconds

export async function setPresence(emailId, gatewayId, ttl = PRESENCE_TTL) {
  const key = `presence:${emailId}`;
  await redisClient.set(key, gatewayId, 'EX', ttl);
}

export async function renewPresence(emailId, gatewayId, ttl = PRESENCE_TTL) {
  const key = `presence:${emailId}`;
  await redisClient.set(key, gatewayId, 'EX', ttl);
}

export async function removePresence(emailId) {
  const key = `presence:${emailId}`;
  await redisClient.del(key);
}

export async function getPresence(emailId) {
  const key = `presence:${emailId}`;
  return await redisClient.get(key);
}

export async function isOnline(emailId) {
  const key = `presence:${emailId}`;
  const gatewayId = await redisClient.get(key);
  return Boolean(gatewayId);
}
