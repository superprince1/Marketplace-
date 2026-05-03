const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { invalidateRecommendations } = require('./recommendations'); // ✅ For cache invalidation

// Get user's wishlist
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist');
    res.json({ success: true, wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add product to wishlist
router.post('/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.wishlist.includes(req.params.productId)) {
      user.wishlist.push(req.params.productId);
      await user.save();
    }
    const updatedUser = await User.findById(req.user.id).populate('wishlist');
    // Invalidate recommendations because wishlist changed
    await invalidateRecommendations(req.user.id);
    res.json({ success: true, wishlist: updatedUser.wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove product from wishlist
router.delete('/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();
    const updatedUser = await User.findById(req.user.id).populate('wishlist');
    // Invalidate recommendations because wishlist changed
    await invalidateRecommendations(req.user.id);
    res.json({ success: true, wishlist: updatedUser.wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;