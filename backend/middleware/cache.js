const redisClient = require('../config/redis');

/**
 * Cache middleware – stores GET responses in Redis for a given duration (seconds)
 * @param {number} duration - seconds to cache
 */
const cache = (duration = 60) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from original URL (ignore query params order)
    const key = `cache:${req.originalUrl || req.url}`;
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        // Return cached response
        const data = JSON.parse(cachedData);
        res.setHeader('X-Cache', 'HIT');
        return res.json(data);
      }
      // Store original send function
      const originalSend = res.json;
      res.json = function (body) {
        // Cache the response body (only if status is 200)
        if (res.statusCode === 200) {
          redisClient.setEx(key, duration, JSON.stringify(body)).catch(console.error);
        }
        originalSend.call(this, body);
      };
      res.setHeader('X-Cache', 'MISS');
      next();
    } catch (err) {
      console.error('Cache error:', err);
      next();
    }
  };
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - e.g., "cache:/api/products*"
 */
const invalidatePattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error('Cache invalidation error:', err);
  }
};

module.exports = { cache, invalidatePattern };