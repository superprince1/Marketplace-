// jobs/refreshSitemap.js
const { generateSitemapXml } = require('../services/sitemapService');
const redisClient = require('../config/redis');
const cron = require('node-cron');

const CACHE_KEY = 'sitemap:xml';

async function refreshSitemap() {
  console.log('[Sitemap] Regenerating sitemap.xml...');
  try {
    const xml = await generateSitemapXml();
    if (redisClient && redisClient.connected) {
      await redisClient.setex(CACHE_KEY, 3600, xml);
      console.log('[Sitemap] Cache updated successfully');
    }
  } catch (err) {
    console.error('[Sitemap] Regeneration failed:', err);
  }
}

// Schedule every day at 2 AM
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 2 * * *', refreshSitemap);
}

module.exports = refreshSitemap;