const express = require('express');
const router = express.Router();
const { client, INDEX_NAME } = require('../config/elasticsearch');
const User = require('../models/User');
const Order = require('../models/Order');

/**
 * Helper: get user's preferred categories based on past purchases and wishlist
 * @param {string} userId - MongoDB ObjectId
 * @returns {Promise<string[]>} Array of category names
 */
const getUserPreferredCategories = async (userId) => {
  if (!userId) return [];
  const categories = new Set();

  // Purchased products (paid orders)
  const orders = await Order.find({ buyerId: userId, paymentStatus: 'paid' }).populate('items.productId');
  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.productId?.category) categories.add(item.productId.category);
    });
  });

  // Wishlist items
  const user = await User.findById(userId).populate('wishlist');
  user.wishlist.forEach(product => {
    if (product.category) categories.add(product.category);
  });

  return Array.from(categories);
};

/**
 * Main search endpoint with advanced features
 * Query parameters:
 * - q: search query (optional)
 * - category, brand, minPrice, maxPrice, minRating
 * - sort: _score, price_asc, price_desc
 * - page, limit
 * - lat, lon, radius (km) for geo‑search
 */
router.get('/', async (req, res) => {
  try {
    const {
      q = '',
      category,
      brand,
      minPrice,
      maxPrice,
      minRating,
      sort = '_score',
      page = 1,
      limit = 20,
      lat,
      lon,
      radius = 50,
    } = req.query;

    const must = [];
    const filter = [];
    const should = [];

    // ========== FULL‑TEXT QUERY WITH BOOSTING ==========
    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['name^5', 'description^2', 'tags^3', 'brand^4'],
          fuzziness: 'AUTO',
        },
      });
    }

    // ========== BOOSTING CLAUSES (should) ==========
    // Recency boost (products created in the last 90 days)
    should.push({
      range: {
        createdAt: { gte: 'now-90d', boost: 1.2 },
      },
    });
    // Popularity boost (soldCount >= 10)
    should.push({
      range: { soldCount: { gte: 10, boost: 1.3 } },
    });
    // Rating boost (rating >= 4)
    should.push({
      range: { rating: { gte: 4, boost: 1.2 } },
    });
    // Promoted listings boost (only if promotion is not expired)
    should.push({
      bool: {
        filter: [
          { term: { isPromoted: true } },
          { range: { promotionEndDate: { gt: 'now' } } },
        ],
        boost: 2.0,
      },
    });

    // ========== PERSONALISATION (boost user’s preferred categories) ==========
    const userId = req.user?.id;
    if (userId) {
      const preferredCategories = await getUserPreferredCategories(userId);
      if (preferredCategories.length) {
        should.push({
          terms: { category: preferredCategories, boost: 1.5 },
        });
      }
    }

    // ========== FILTERS ==========
    if (category) filter.push({ term: { category } });
    if (brand) filter.push({ term: { brand } });
    if (minPrice || maxPrice) {
      const range = {};
      if (minPrice) range.gte = parseFloat(minPrice);
      if (maxPrice) range.lte = parseFloat(maxPrice);
      filter.push({ range: { price: range } });
    }
    if (minRating) filter.push({ range: { rating: { gte: parseFloat(minRating) } } });
    filter.push({ term: { isActive: true } });

    // ========== GEO‑SEARCH ==========
    if (lat && lon) {
      filter.push({
        geo_distance: {
          distance: `${parseFloat(radius)}km`,
          location: { lat: parseFloat(lat), lon: parseFloat(lon) },
        },
      });
    }

    const from = (parseInt(page) - 1) * parseInt(limit);
    let sortArray = [];
    if (sort === 'price_asc') sortArray = [{ price: 'asc' }, { _score: 'desc' }];
    else if (sort === 'price_desc') sortArray = [{ price: 'desc' }, { _score: 'desc' }];
    else sortArray = [{ _score: 'desc' }];

    const response = await client.search({
      index: INDEX_NAME,
      body: {
        query: {
          bool: {
            must,
            filter,
            should,
            minimum_should_match: q ? 1 : 0,
          },
        },
        from,
        size: parseInt(limit),
        sort: sortArray,
        aggs: {
          categories: { terms: { field: 'category', size: 100 } },
          brands: { terms: { field: 'brand', size: 100 } },
          price_ranges: {
            range: {
              field: 'price',
              ranges: [
                { to: 25 },
                { from: 25, to: 50 },
                { from: 50, to: 100 },
                { from: 100, to: 250 },
                { from: 250 },
              ],
            },
          },
          rating_stats: { stats: { field: 'rating' } },
        },
      },
    });

    const products = response.hits.hits.map(hit => ({ _id: hit._id, ...hit._source }));
    const total = response.hits.total.value;
    const facets = {
      categories: response.aggregations.categories.buckets,
      brands: response.aggregations.brands.buckets,
      priceRanges: response.aggregations.price_ranges.buckets,
      ratingStats: response.aggregations.rating_stats,
    };

    res.json({
      success: true,
      products,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      facets,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, error: 'Search failed. Please try again later.' });
  }
});

/**
 * Autocomplete endpoint (type‑ahead)
 * Uses the name_suggest completion field with fuzzy matching.
 */
router.get('/autocomplete', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.json({ suggestions: [] });
  }

  try {
    const response = await client.search({
      index: INDEX_NAME,
      body: {
        size: 0,
        suggest: {
          product_suggest: {
            prefix: q,
            completion: {
              field: 'name_suggest',
              fuzzy: { fuzziness: 'AUTO' },
              size: 10,
            },
          },
        },
      },
    });

    const suggestions = response.suggest.product_suggest[0]?.options.map(opt => opt.text) || [];
    res.json({ suggestions });
  } catch (err) {
    console.error('Autocomplete error:', err);
    res.status(500).json({ suggestions: [] });
  }
});

module.exports = router;