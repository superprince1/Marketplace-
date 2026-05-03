/**
 * services/recommendationService.js
 * 
 * Product recommendation engine for the marketplace.
 * Supports: related products, seller recommendations, trending,
 *           personalized recs, frequently bought together.
 * 
 * All expensive queries are cached via Redis (if available).
 */

const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const redisClient = require('../config/redis');

const DEFAULT_LIMIT = 10;
const CACHE_TTL = 3600; // 1 hour

/**
 * Helper: Execute query with Redis caching
 * @param {string} cacheKey - Redis key
 * @param {Function} queryFn - Async function that returns data
 * @param {number} ttl - Cache TTL in seconds (default 1 hour)
 */
const withCache = async (cacheKey, queryFn, ttl = CACHE_TTL) => {
  if (!redisClient || !redisClient.connected) {
    return await queryFn();
  }
  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const data = await queryFn();
  await redisClient.setex(cacheKey, ttl, JSON.stringify(data));
  return data;
};

/**
 * Get related products (same category, exclude current, active only)
 * @param {string} productId - Current product ID
 * @param {number} limit - Max results
 */
const getRelatedProducts = async (productId, limit = DEFAULT_LIMIT) => {
  const product = await Product.findById(productId).select('category');
  if (!product) return [];

  return withCache(`related:${productId}:${limit}`, async () => {
    const related = await Product.find({
      _id: { $ne: productId },
      category: product.category,
      isActive: true,
    })
      .limit(limit)
      .sort({ 'ratings.average': -1, soldCount: -1 })
      .lean();
    return related;
  });
};

/**
 * Seller recommendations (other products from the same seller, active)
 * @param {string} sellerId - Seller's user ID
 * @param {number} limit - Max results
 */
const getSellerRecommendations = async (sellerId, limit = DEFAULT_LIMIT) => {
  if (!sellerId) return [];
  return withCache(`seller:${sellerId}:${limit}`, async () => {
    const products = await Product.find({
      sellerId,
      isActive: true,
    })
      .sort({ 'ratings.average': -1, soldCount: -1 })
      .limit(limit)
      .lean();
    return products;
  });
};

/**
 * Trending products (most ordered in the last 30 days)
 * @param {number} limit - Max results
 */
const getTrendingProducts = async (limit = DEFAULT_LIMIT) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return withCache(`trending:${limit}`, async () => {
    const trending = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, paymentStatus: 'paid' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', count: { $sum: '$items.quantity' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.isActive': true } },
      { $project: { product: 1, count: 1 } },
    ]);
    return trending.map(t => t.product);
  });
};

/**
 * Personalized recommendations for a buyer (based on purchased categories)
 * @param {string} buyerId - Buyer's user ID
 * @param {number} limit - Max results
 */
const getPersonalizedRecommendations = async (buyerId, limit = DEFAULT_LIMIT) => {
  if (!buyerId) return [];

  const cacheKey = `personal:${buyerId}:${limit}`;
  return withCache(cacheKey, async () => {
    // Get user's order history (paid orders only)
    const orders = await Order.find({
      buyerId,
      paymentStatus: 'paid',
    }).select('items.productId').lean();

    if (!orders.length) {
      // Fallback to trending if no purchase history
      return getTrendingProducts(limit);
    }

    // Extract unique product IDs the user bought
    const boughtProductIds = new Set();
    orders.forEach(order => {
      order.items.forEach(item => {
        boughtProductIds.add(item.productId.toString());
      });
    });

    // Get categories of those bought products
    const boughtProducts = await Product.find({
      _id: { $in: Array.from(boughtProductIds) },
    }).select('category');

    const categories = [...new Set(boughtProducts.map(p => p.category))];

    if (categories.length === 0) {
      return getTrendingProducts(limit);
    }

    // Recommend active products from same categories, excluding already bought ones
    const recommended = await Product.find({
      _id: { $nin: Array.from(boughtProductIds) },
      category: { $in: categories },
      isActive: true,
    })
      .sort({ 'ratings.average': -1, soldCount: -1 })
      .limit(limit)
      .lean();

    if (!recommended.length) {
      return getTrendingProducts(limit);
    }
    return recommended;
  });
};

/**
 * Frequently Bought Together (based on order co‑occurrence)
 * @param {string} productId - The product to find companions for
 * @param {number} limit - Max results
 */
const getFrequentlyBoughtTogether = async (productId, limit = 6) => {
  const cacheKey = `fbt:${productId}:${limit}`;
  return withCache(cacheKey, async () => {
    const orders = await Order.aggregate([
      { $match: { 'items.productId': productId, paymentStatus: 'paid' } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $ne: productId } } },
      { $group: { _id: '$items.productId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.isActive': true } },
      { $project: { product: 1, count: 1 } },
    ]);
    return orders.map(o => o.product);
  });
};

/**
 * Also Bought (customers who bought this also bought)
 * @param {string} productId - The source product
 * @param {number} limit - Max results
 */
const getAlsoBought = async (productId, limit = 8) => {
  const cacheKey = `also:${productId}:${limit}`;
  return withCache(cacheKey, async () => {
    const also = await Order.aggregate([
      { $match: { 'items.productId': productId, paymentStatus: 'paid' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', orderIds: { $addToSet: '$_id' } } },
      { $match: { _id: { $ne: productId } } },
      { $project: { productId: '$_id', orderCount: { $size: '$orderIds' } } },
      { $sort: { orderCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.isActive': true } },
      { $project: { product: 1, orderCount: 1 } },
    ]);
    return also.map(a => a.product);
  });
};

/**
 * Invalidate all caches for a given buyer (e.g., after new purchase)
 * @param {string} buyerId - User ID
 */
const invalidatePersonalCache = async (buyerId) => {
  if (!redisClient || !redisClient.connected) return;
  const pattern = `personal:${buyerId}:*`;
  const keys = await redisClient.keys(pattern);
  if (keys.length) await redisClient.del(keys);
};

module.exports = {
  getRelatedProducts,
  getSellerRecommendations,
  getTrendingProducts,
  getPersonalizedRecommendations,
  getFrequentlyBoughtTogether,
  getAlsoBought,
  invalidatePersonalCache,
};