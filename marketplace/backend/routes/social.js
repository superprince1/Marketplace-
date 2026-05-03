const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Follow = require('../models/Follow');
const ProductLike = require('../models/ProductLike');
const Activity = require('../models/Activity');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// ========== FOLLOW SELLER ==========

// Follow a seller
router.post('/follow/:sellerId', auth, async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    const followerId = req.user.id;
    if (sellerId === followerId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }
    const seller = await User.findById(sellerId);
    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ error: 'Seller not found' });
    }
    const existing = await Follow.findOne({ followerId, sellerId });
    if (existing) {
      return res.status(400).json({ error: 'Already following this seller' });
    }
    const follow = new Follow({ followerId, sellerId });
    await follow.save();
    // Create activity
    await Activity.create({
      userId: followerId,
      type: 'follow',
      referenceId: sellerId,
      referenceModel: 'User',
      metadata: { sellerName: seller.name },
      isPublic: true,
    });
    res.status(201).json({ success: true, message: 'Now following seller' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unfollow a seller
router.delete('/follow/:sellerId', auth, async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    const followerId = req.user.id;
    const result = await Follow.findOneAndDelete({ followerId, sellerId });
    if (!result) return res.status(404).json({ error: 'Not following this seller' });
    res.json({ success: true, message: 'Unfollowed seller' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get followers of a seller
router.get('/followers/:sellerId', async (req, res) => {
  try {
    const followers = await Follow.find({ sellerId: req.params.sellerId }).populate('followerId', 'name avatar');
    res.json({ followers: followers.map(f => f.followerId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get sellers that a user follows
router.get('/following', auth, async (req, res) => {
  try {
    const follows = await Follow.find({ followerId: req.user.id }).populate('sellerId', 'name avatar');
    res.json({ following: follows.map(f => f.sellerId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if current user follows a seller
router.get('/follow/check/:sellerId', auth, async (req, res) => {
  try {
    const follow = await Follow.findOne({ followerId: req.user.id, sellerId: req.params.sellerId });
    res.json({ isFollowing: !!follow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== LIKE PRODUCT ==========

// Like a product
router.post('/like/:productId', auth, async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.user.id;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const existing = await ProductLike.findOne({ userId, productId });
    if (existing) return res.status(400).json({ error: 'Product already liked' });
    await ProductLike.create({ userId, productId });
    // Activity
    await Activity.create({
      userId,
      type: 'like',
      referenceId: productId,
      referenceModel: 'Product',
      metadata: { productName: product.name, sellerId: product.sellerId },
      isPublic: true,
    });
    res.json({ success: true, message: 'Product liked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unlike a product
router.delete('/like/:productId', auth, async (req, res) => {
  try {
    const result = await ProductLike.findOneAndDelete({ userId: req.user.id, productId: req.params.productId });
    if (!result) return res.status(404).json({ error: 'Like not found' });
    res.json({ success: true, message: 'Product unliked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get like count for a product
router.get('/like/count/:productId', async (req, res) => {
  try {
    const count = await ProductLike.countDocuments({ productId: req.params.productId });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if user liked a product
router.get('/like/check/:productId', auth, async (req, res) => {
  try {
    const like = await ProductLike.findOne({ userId: req.user.id, productId: req.params.productId });
    res.json({ isLiked: !!like });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ACTIVITY FEED ==========

// Get activity feed (user's own + followed sellers' activities)
router.get('/feed', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 30, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    // Get list of sellers the user follows
    const follows = await Follow.find({ followerId: userId }).select('sellerId');
    const followedSellerIds = follows.map(f => f.sellerId);

    // Build query: activities from user OR from followed sellers, AND isPublic true
    // Also include activities from followed sellers (metadata.sellerId) or referenceId being seller
    // Simpler: activities where userId is either current user or any followed seller
    const feedQuery = {
      $or: [
        { userId },
        { userId: { $in: followedSellerIds } },
      ],
      isPublic: true,
    };

    const activities = await Activity.find(feedQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name avatar')
      .populate('referenceId')
      .lean();

    // Additional enrichment: for product references, fetch product details if not fully populated
    // For now, the referenceId is populated, but we may need to convert to plain object.

    const total = await Activity.countDocuments(feedQuery);

    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a "shared purchase" activity (called after order completion)
router.post('/share-purchase/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('items.productId');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.buyerId.toString() !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    // Create one activity per product (or one for the whole order? We'll do one per product)
    for (const item of order.items) {
      await Activity.create({
        userId: req.user.id,
        type: 'shared_purchase',
        referenceId: item.productId._id,
        referenceModel: 'Product',
        metadata: {
          orderId: order._id,
          quantity: item.quantity,
          productName: item.productId.name,
          sellerId: item.sellerId,
        },
        isPublic: true,
      });
    }
    res.json({ success: true, message: 'Purchase shared to feed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a "review" activity (called when a review is posted)
router.post('/review-activity', auth, async (req, res) => {
  try {
    const { reviewId, productId, rating, comment } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await Activity.create({
      userId: req.user.id,
      type: 'review',
      referenceId: reviewId,
      referenceModel: 'Review',
      metadata: {
        productId,
        productName: product.name,
        rating,
        comment: comment?.substring(0, 100),
      },
      isPublic: true,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;