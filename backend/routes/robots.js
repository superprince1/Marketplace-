// routes/robots.js
const express = require('express');
const router = express.Router();

router.get('/robots.txt', (req, res) => {
  const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${process.env.CLIENT_URL || 'https://yourdomain.com'}/sitemap.xml
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /admin/
`;
  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

module.exports = router;