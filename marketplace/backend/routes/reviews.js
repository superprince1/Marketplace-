const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Activity = require('../models/Activity'); // ✅ Social feature: activity feed
const auth = require('../middleware/auth');

// ========== GET all reviews for a product (with pagination) ==========
router.get('/product/:productId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ productId: req.params.productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name avatar')
      .lean();

    const total = await Review.countDocuments({ productId: req.params.productId });

    // Calculate average rating and distribution (optional)
    const ratingsAgg = await Review.aggregate([
      { $match: { productId: mongoose.Types.ObjectId(req.params.productId) } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    const distribution = { 1:0, 2:0, 3:0, 4:0, 5:0 };
    ratingsAgg.forEach(r => { distribution[r._id] = r.count; });

    res.json({
      success: true,
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      ratingDistribution: distribution,
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== POST a new review (only if product purchased and delivered) ==========
router.post('/', auth, async (req, res) => {
  try {
    const { productId, rating, title, comment, images } = req.body;
    const userId = req.user.id;

    // Validation
    if (!productId) return res.status(400).json({ error: 'Product ID required' });
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

    // 1. Check if user has purchased and RECEIVED (delivered) this product
    const deliveredOrder = await Order.findOne({
      buyerId: userId,
      'items.productId': productId,
      status: 'delivered',
    });
    if (!deliveredOrder) {
      return res.status(403).json({
        error: 'You can only review products you have purchased and received (order status = delivered).',
      });
    }

    // 2. Check if already reviewed
    const existing = await Review.findOne({ productId, userId });
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this product.' });
    }

    // 3. Create review
    const review = new Review({
      productId,
      userId,
      rating,
      title: title || '',
      comment: comment || '',
      images: images || [],
      verifiedPurchase: true,
      helpful: 0,
      helpfulBy: [], // array to track which users marked helpful
    });
    await review.save();

    // 4. Update product average rating and review count
    const allReviews = await Review.find({ productId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(productId, {
      'ratings.average': avgRating,
      'ratings.count': allReviews.length,
    });

    // 5. ✅ Create activity for social feed
    const product = await Product.findById(productId).select('name');
    await Activity.create({
      userId: userId,
      type: 'review',
      referenceId: review._id,
      referenceModel: 'Review',
      metadata: {
        productId: productId,
        productName: product ? product.name : 'a product',
        rating: rating,
        comment: comment ? comment.substring(0, 100) : '',
      },
      isPublic: true,
    });

    // 6. Populate user info for response
    const populatedReview = await Review.findById(review._id).populate('userId', 'name avatar');

    res.status(201).json({ success: true, review: populatedReview });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== Mark a review as helpful (with duplicate prevention) ==========
router.put('/:id/helpful', auth, async (req, res) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    // Check if user already marked this review as helpful
    if (review.helpfulBy && review.helpfulBy.includes(userId)) {
      return res.status(400).json({ error: 'You have already marked this review as helpful' });
    }

    // Increment helpful count and add user to helpfulBy array
    review.helpful += 1;
    if (!review.helpfulBy) review.helpfulBy = [];
    review.helpfulBy.push(userId);
    await review.save();

    res.json({ success: true, helpful: review.helpful });
  } catch (err) {
    console.error('Helpful vote error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== (Optional) Get a single review by ID ==========
router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate('userId', 'name avatar');
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== (Seller/Admin) Report a review ==========
router.post('/:id/report', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    // Simple report: increment report count (add field to Review schema if needed)
    // For now, just store in a separate collection or log.
    // We'll skip full implementation, but placeholder.
    res.json({ success: true, message: 'Report submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;