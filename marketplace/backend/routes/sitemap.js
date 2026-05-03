// routes/sitemap.js
const express = require('express');
const router = express.Router();
const { generateSitemapXml } = require('../services/sitemapService');
const redisClient = require('../config/redis');

// Cache the sitemap in Redis (regenerate every hour)
const CACHE_KEY = 'sitemap:xml';
const CACHE_TTL = 3600; // 1 second

router.get('/sitemap.xml', async (req, res) => {
  try {
    // Try to get from Redis cache
    let xml = null;
    if (redisClient && redisClient.connected) {
      xml = await redisClient.get(CACHE_KEY);
    }
    if (!xml) {
      xml = await generateSitemapXml();
      if (redisClient && redisClient.connected) {
        await redisClient.setex(CACHE_KEY, CACHE_TTL, xml);
      }
    }
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;