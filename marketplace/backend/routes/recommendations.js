const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getRelatedProducts,
  getSellerRecommendations,
  getTrendingProducts,
  getPersonalizedRecommendations,
  getFrequentlyBoughtTogether,
  getAlsoBought,
  invalidatePersonalCache,
} = require('../services/recommendationService');

// Public endpoints
router.get('/related/:productId', async (req, res) => {
  try {
    const products = await getRelatedProducts(req.params.productId, req.query.limit);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/seller/:sellerId', async (req, res) => {
  try {
    const products = await getSellerRecommendations(req.params.sellerId, req.query.limit);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const products = await getTrendingProducts(req.query.limit);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/fbt/:productId', async (req, res) => {
  try {
    const products = await getFrequentlyBoughtTogether(req.params.productId, req.query.limit);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/also/:productId', async (req, res) => {
  try {
    const products = await getAlsoBought(req.params.productId, req.query.limit);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authenticated personal recommendations
router.get('/personal', auth, async (req, res) => {
  try {
    const products = await getPersonalizedRecommendations(req.user.id, req.query.limit);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invalidation endpoint (called after order completion)
router.post('/invalidate', auth, async (req, res) => {
  try {
    await invalidatePersonalCache(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;