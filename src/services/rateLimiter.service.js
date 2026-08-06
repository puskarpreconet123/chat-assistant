import { redisClient } from '../config/redis.js';

/**
 * Redis sliding window rate limiter
 */
export async function checkRateLimit(identifier, action = 'general', limit = 100, windowSec = 60) {
  const key = `ratelimit:${action}:${identifier}`;
  const now = Date.now();
  const clearBefore = now - windowSec * 1000;

  const multi = redisClient.multi();
  multi.zremrangebyscore(key, 0, clearBefore);
  multi.zadd(key, now, `${now}-${Math.random()}`);
  multi.zcard(key);
  multi.expire(key, windowSec);

  const results = await multi.exec();
  const count = results[2][1];

  const allowed = count <= limit;
  return {
    allowed,
    current: count,
    limit,
    remaining: Math.max(0, limit - count)
  };
}

/**
 * Express middleware for REST endpoint rate limiting
 */
export function restRateLimiter(limit = 60, windowSec = 60) {
  return async (req, res, next) => {
    try {
      const identifier = req.user ? req.user.emailId || req.user.id : req.ip;
      const action = req.path;
      const result = await checkRateLimit(identifier, action, limit, windowSec);

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${windowSec} seconds.`
        });
      }
      next();
    } catch (err) {
      console.error('[RateLimiter] Error:', err.message);
      next(); // fail open in case of rate limiter error
    }
  };
}
