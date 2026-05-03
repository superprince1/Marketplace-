const express = require('express');
const router = express.Router();
const HomepageSection = require('../models/HomepageSection');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { cache, invalidatePattern } = require('../middleware/cache');
const cacheHeaders = require('../middleware/cacheHeaders'); // ✅ CDN cache headers

// Helper: invalidate public homepage cache
const invalidateHomepageCache = async () => {
  await invalidatePattern('cache:/api/admin/homepage/public');
};

// Get all sections (ordered) – admin only (no caching)
router.get('/sections', auth, admin, async (req, res) => {
  try {
    const sections = await HomepageSection.find().sort('order');
    res.json({ success: true, sections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a section
router.put('/sections/:id', auth, admin, async (req, res) => {
  try {
    const section = await HomepageSection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    // Invalidate public cache after update
    await invalidateHomepageCache();
    res.json({ success: true, section });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new section (optional)
router.post('/sections', auth, admin, async (req, res) => {
  try {
    const section = new HomepageSection(req.body);
    await section.save();
    // Invalidate public cache after creation
    await invalidateHomepageCache();
    res.status(201).json({ success: true, section });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a section
router.delete('/sections/:id', auth, admin, async (req, res) => {
  try {
    await HomepageSection.findByIdAndDelete(req.params.id);
    // Invalidate public cache after deletion
    await invalidateHomepageCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder sections (send array of ids in desired order)
router.post('/sections/reorder', auth, admin, async (req, res) => {
  try {
    const { ids } = req.body;
    for (let i = 0; i < ids.length; i++) {
      await HomepageSection.findByIdAndUpdate(ids[i], { order: i });
    }
    // Invalidate public cache after reorder
    await invalidateHomepageCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public endpoint – get active sections for homepage
// ✅ CDN cache + Redis cache for 5 minutes
router.get(
  '/public',
  cacheHeaders(300), // CDN cache header (max-age=300, s-maxage=300)
  cache(300),        // Redis cache (5 minutes)
  async (req, res) => {
    try {
      const sections = await HomepageSection.find({ enabled: true }).sort('order');
      res.json({ success: true, sections });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;