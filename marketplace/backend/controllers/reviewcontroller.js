const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Activity = require('../models/Activity');

/**
 * @desc    Get reviews for a product (with pagination)
 * @route   GET /api/reviews/product/:productId
 * @access  Public
 */
exports.getProductReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const reviews = await Review.find({ productId: req.params.productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name avatar');
    const total = await Review.countDocuments({ productId: req.params.productId });
    // Aggregate rating distribution
    const distribution = await Review.aggregate([
      { $match: { productId: mongoose.Types.ObjectId(req.params.productId) } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    const ratingDist = { 1:0,2:0,3:0,4:0,5:0 };
    distribution.forEach(d => { ratingDist[d._id] = d.count; });
    res.json({ success: true, reviews, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }, ratingDistribution: ratingDist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Create a review (only if product purchased and delivered)
 * @route   POST /api/reviews
 * @access  Private
 */
exports.createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment, images } = req.body;
    const userId = req.user.id;

    // Check if user has purchased and received this product
    const deliveredOrder = await Order.findOne({ buyerId: userId, 'items.productId': productId, status: 'delivered' });
    if (!deliveredOrder) {
      return res.status(403).json({ success: false, error: 'You can only review products you have purchased and received' });
    }

    // Check for existing review
    const existing = await Review.findOne({ productId, userId });
    if (existing) return res.status(400).json({ success: false, error: 'You already reviewed this product' });

    const review = new Review({ productId, userId, rating, title, comment, images, verifiedPurchase: true });
    await review.save();

    // Update product average rating
    const allReviews = await Review.find({ productId });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(productId, { 'ratings.average': avg, 'ratings.count': allReviews.length });

    // Create social activity
    const product = await Product.findById(productId);
    await Activity.create({
      userId,
      type: 'review',
      referenceId: review._id,
      referenceModel: 'Review',
      metadata: { productId, productName: product.name, rating, comment: comment?.substring(0, 100) },
      isPublic: true,
    });

    const populated = await Review.findById(review._id).populate('userId', 'name avatar');
    res.status(201).json({ success: true, review: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Mark a review as helpful
 * @route   PUT /api/reviews/:id/helpful
 * @access  Private
 */
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    if (review.helpfulBy?.includes(req.user.id)) {
      return res.status(400).json({ success: false, error: 'Already marked helpful' });
    }
    review.helpful += 1;
    review.helpfulBy = review.helpfulBy || [];
    review.helpfulBy.push(req.user.id);
    await review.save();
    res.json({ success: true, helpful: review.helpful });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};