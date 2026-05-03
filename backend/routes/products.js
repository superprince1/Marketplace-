const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const User = require('../models/User');
const PlatformSettings = require('../models/PlatformSettings');
const auth = require('../middleware/auth');
const { cache, invalidatePattern } = require('../middleware/cache');
const cacheHeaders = require('../middleware/cacheHeaders');
const { indexProduct, deleteProduct } = require('../services/productSync');
const currencyMiddleware = require('../middleware/currency');
const { convertPrice } = require('../services/currencyService');
const { getVariant } = require('../services/experimentService'); // A/B testing

// ========== HELPER FUNCTIONS ==========
const isSeller = (user) => user && user.role === 'seller';

const getSellerProductLimit = async (sellerId) => {
  const seller = await User.findById(sellerId);
  if (!seller || seller.role !== 'seller') return 0;
  if (seller.hasActiveSubscription && await seller.hasActiveSubscription()) {
    const settings = await PlatformSettings.getSettings();
    const plan = settings.subscriptionPlans.id(seller.subscription.planId);
    if (plan && plan.maxProducts > 0) return plan.maxProducts;
  }
  return 0;
};

const convertProductPrices = async (product, targetCurrency) => {
  const productObj = product.toObject ? product.toObject() : product;
  productObj.priceConverted = await convertPrice(productObj.price, targetCurrency);
  if (productObj.comparePrice) {
    productObj.comparePriceConverted = await convertPrice(productObj.comparePrice, targetCurrency);
  }
  return productObj;
};

const convertProductsArray = async (products, targetCurrency) => {
  return Promise.all(products.map(p => convertProductPrices(p, targetCurrency)));
};

// Helper to apply experiment config to a product (e.g., price personalisation)
const applyExperimentToProduct = (product, variant) => {
  if (!variant || !variant.config) return product;
  const config = variant.config;
  if (config.priceModifier) {
    let newPrice = product.price;
    if (config.priceModifierType === 'percentage') {
      newPrice = product.price * (1 + config.priceModifier / 100);
    } else if (config.priceModifierType === 'fixed') {
      newPrice = product.price + config.priceModifier;
    }
    newPrice = Math.max(0, newPrice);
    product.price = newPrice;
    product.originalPrice = product.price - (config.priceModifier || 0);
    product.experimentApplied = variant.name;
  }
  if (config.badge) {
    product.experimentBadge = config.badge;
  }
  return product;
};

// ========== LANGUAGE DETECTION ==========
const DEFAULT_LANG = 'en';
const languageMiddleware = (req, res, next) => {
  let lang = req.query.lang;
  if (!lang && req.headers['accept-language']) {
    lang = req.headers['accept-language'].split(',')[0].split('-')[0];
  }
  req.lang = (lang && /^[a-z]{2}$/.test(lang)) ? lang : DEFAULT_LANG;
  next();
};

// Helper to apply translation to a single product (mutates product object)
const applyTranslation = (product, lang) => {
  if (lang === DEFAULT_LANG) return product;
  const translation = product.translations?.get(lang);
  if (!translation) return product;
  if (translation.name) product.name = translation.name;
  if (translation.description) product.description = translation.description;
  if (translation.shortDescription) product.shortDescription = translation.shortDescription;
  return product;
};

// Helper to translate an array of products in place
const translateProductsArray = (products, lang) => {
  if (lang === DEFAULT_LANG) return products;
  products.forEach(product => applyTranslation(product, lang));
  return products;
};

// ========== PUBLIC ROUTES ==========

/**
 * @route   GET /api/products
 * @desc    Get all products with filtering, sorting, pagination, and promoted first
 * @access  Public
 */
router.get(
  '/',
  languageMiddleware,
  currencyMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
    query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
    query('category').optional().trim().escape(),
    query('sellerId').optional().isMongoId(),
    query('search').optional().trim().escape(),
  ],
  cacheHeaders(300),
  cache(300),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        category,
        minPrice,
        maxPrice,
        search,
        sellerId,
        featured,
      } = req.query;

      const filter = { isActive: true };
      if (category) filter.category = category;
      if (sellerId) filter.sellerId = sellerId;
      if (featured === 'true') filter.isFeatured = true;

      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      if (search) filter.$text = { $search: search };

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      let sortObj = {};
      if (sort === 'price_asc') sortObj = { price: 1 };
      else if (sort === 'price_desc') sortObj = { price: -1 };
      else if (sort === 'rating') sortObj = { 'ratings.average': -1 };
      else if (sort === 'sold') sortObj = { soldCount: -1 };
      else sortObj = { createdAt: -1 };

      const settings = await PlatformSettings.getSettings();
      let products;

      if (settings.enablePromotedListings) {
        const pipeline = [
          { $match: filter },
          {
            $addFields: {
              isCurrentlyPromoted: {
                $and: [
                  { $eq: ['$isPromoted', true] },
                  { $gte: ['$promotionEndDate', new Date()] },
                ],
              },
            },
          },
          { $sort: { isCurrentlyPromoted: -1, ...sortObj } },
          { $skip: skip },
          { $limit: limitNum },
          {
            $lookup: {
              from: 'users',
              localField: 'sellerId',
              foreignField: '_id',
              as: 'sellerId',
            },
          },
          { $unwind: { path: '$sellerId', preserveNullAndEmptyArrays: true } },
          { $project: { 'sellerId.password': 0 } },
        ];
        products = await Product.aggregate(pipeline);
        // Convert aggregation results to plain objects (they are already plain)
        const total = await Product.countDocuments(filter);
        const convertedProducts = await convertProductsArray(products, req.targetCurrency);
        translateProductsArray(convertedProducts, req.lang);
        return res.json({
          success: true,
          products: convertedProducts,
          currency: req.targetCurrency,
          pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        });
      }

      products = await Product.find(filter)
        .populate('sellerId', 'name avatar email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);

      const total = await Product.countDocuments(filter);
      let convertedProducts = await convertProductsArray(products, req.targetCurrency);
      translateProductsArray(convertedProducts, req.lang);

      res.json({
        success: true,
        products: convertedProducts,
        currency: req.targetCurrency,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (err) {
      console.error('Get products error:', err);
      res.status(500).json({ success: false, error: 'Server error fetching products' });
    }
  }
);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID (with A/B test personalisation and i18n)
 * @access  Public
 */
router.get(
  '/:id',
  languageMiddleware,
  currencyMiddleware,
  param('id').isMongoId(),
  cacheHeaders(600),
  cache(600),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      let product = await Product.findById(req.params.id).populate('sellerId', 'name avatar email phone address');
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      product.incrementViews().catch((err) => console.error('View increment error:', err));

      // ========== A/B TESTING: Apply personalisation ==========
      const userId = req.user?.id || null;
      const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
      const variant = await getVariant('product_price', userId, sessionId);
      if (variant) {
        applyExperimentToProduct(product, variant);
      }

      // ========== MULTI‑LANGUAGE: Apply translation ==========
      applyTranslation(product, req.lang);

      const convertedProduct = await convertProductPrices(product, req.targetCurrency);
      res.json({ success: true, product: convertedProduct, currency: req.targetCurrency });
    } catch (err) {
      console.error('Get product error:', err);
      res.status(500).json({ success: false, error: 'Server error fetching product' });
    }
  }
);

/**
 * @route   GET /api/products/seller/:sellerId
 * @desc    Get all products by a specific seller (with translation, no personalisation)
 * @access  Public
 */
router.get(
  '/seller/:sellerId',
  languageMiddleware,
  currencyMiddleware,
  param('sellerId').isMongoId(),
  query('includeInactive').optional().isBoolean(),
  cacheHeaders(300),
  cache(300),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { sellerId } = req.params;
      const { includeInactive = 'false' } = req.query;
      const filter = { sellerId };
      if (includeInactive !== 'true') filter.isActive = true;
      let products = await Product.find(filter).populate('sellerId', 'name avatar').sort({ createdAt: -1 });
      let convertedProducts = await convertProductsArray(products, req.targetCurrency);
      translateProductsArray(convertedProducts, req.lang);
      res.json({ success: true, products: convertedProducts, currency: req.targetCurrency });
    } catch (err) {
      console.error('Get seller products error:', err);
      res.status(500).json({ success: false, error: 'Server error fetching seller products' });
    }
  }
);

// ========== PROTECTED ROUTES (SELLER ONLY) ==========

/**
 * @route   POST /api/products
 * @desc    Create a new product (seller only) – respects subscription product limits
 * @access  Private (Seller)
 * @body    Includes preorder/backorder fields
 */
router.post(
  '/',
  auth,
  [
    body('name').notEmpty().trim().escape().isLength({ min: 3, max: 100 }),
    body('price').isFloat({ min: 0, max: 100000 }).toFloat(),
    body('description').notEmpty().trim().escape().isLength({ min: 20 }),
    body('category').notEmpty().trim().escape(),
    body('stock').isInt({ min: 0 }).toInt(),
    body('compareAtPrice').optional().isFloat({ min: 0 }).toFloat(),
    body('sku').optional().trim().escape(),
    body('images').optional().isArray(),
    body('tags').optional().isArray(),
    body('isFeatured').optional().isBoolean(),
    body('hasVariations').optional().isBoolean(),
    body('variations').optional().isArray(),
    // PREORDER FIELDS
    body('allowPreorder').optional().isBoolean(),
    body('preorderStock').optional().isInt({ min: 0 }).toInt(),
    body('estimatedShipDate').optional().isISO8601().toDate(),
    body('preorderMessage').optional().trim().escape().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!isSeller(user)) {
        return res.status(403).json({ success: false, error: 'Only sellers can create products' });
      }

      const productLimit = await getSellerProductLimit(user._id);
      if (productLimit > 0) {
        const currentProductCount = await Product.countDocuments({ sellerId: user._id });
        if (currentProductCount >= productLimit) {
          return res.status(403).json({
            success: false,
            error: `Your subscription plan allows a maximum of ${productLimit} products. Please upgrade or delete some products.`,
          });
        }
      }

      const {
        name,
        price,
        description,
        shortDescription,
        category,
        subcategory,
        images,
        stock,
        sku,
        weight,
        dimensions,
        tags,
        isFeatured,
        compareAtPrice,
        hasVariations,
        variations,
        // Preorder fields
        allowPreorder,
        preorderStock,
        estimatedShipDate,
        preorderMessage,
      } = req.body;

      const product = new Product({
        name,
        price,
        compareAtPrice: compareAtPrice || null,
        description,
        shortDescription: shortDescription || description.substring(0, 300),
        category,
        subcategory,
        images: images || [],
        stock: stock || 0,
        sku: sku || `${category.substring(0, 3).toUpperCase()}-${Date.now()}`,
        weight: weight || 0,
        dimensions: dimensions || { length: 0, width: 0, height: 0, unit: 'in' },
        tags: tags || [],
        isFeatured: isFeatured || false,
        sellerId: req.user.id,
        sellerName: user.name,
        hasVariations: hasVariations || false,
        variations: variations || [],
        // Preorder fields
        allowPreorder: allowPreorder || false,
        preorderStock: preorderStock !== undefined ? preorderStock : 0,
        estimatedShipDate: estimatedShipDate || null,
        preorderMessage: preorderMessage || 'This item is available for pre‑order. Your order will be shipped on or before the estimated date.',
      });

      await product.save();
      await invalidatePattern('cache:/api/products*');
      await indexProduct(product);
      res.status(201).json({ success: true, product });
    } catch (err) {
      console.error('Create product error:', err);
      res.status(500).json({ success: false, error: 'Server error creating product' });
    }
  }
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product (seller only, must own product)
 * @access  Private (Seller)
 * @body    Preorder fields can be updated
 */
router.put(
  '/:id',
  auth,
  param('id').isMongoId(),
  [
    body('name').optional().trim().escape().isLength({ min: 3, max: 100 }),
    body('price').optional().isFloat({ min: 0, max: 100000 }).toFloat(),
    body('description').optional().trim().escape().isLength({ min: 20 }),
    body('category').optional().trim().escape(),
    body('stock').optional().isInt({ min: 0 }).toInt(),
    body('compareAtPrice').optional().isFloat({ min: 0 }).toFloat(),
    body('sku').optional().trim().escape(),
    body('images').optional().isArray(),
    body('tags').optional().isArray(),
    body('isFeatured').optional().isBoolean(),
    body('isActive').optional().isBoolean(),
    body('hasVariations').optional().isBoolean(),
    body('variations').optional().isArray(),
    // Preorder fields
    body('allowPreorder').optional().isBoolean(),
    body('preorderStock').optional().isInt({ min: 0 }).toInt(),
    body('estimatedShipDate').optional().isISO8601().toDate(),
    body('preorderMessage').optional().trim().escape().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      let product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
      if (product.sellerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, error: 'You can only update your own products' });
      }

      const allowedUpdates = [
        'name',
        'price',
        'compareAtPrice',
        'description',
        'shortDescription',
        'category',
        'subcategory',
        'images',
        'stock',
        'sku',
        'weight',
        'dimensions',
        'tags',
        'isFeatured',
        'isActive',
        'hasVariations',
        'variations',
        // Preorder fields
        'allowPreorder',
        'preorderStock',
        'estimatedShipDate',
        'preorderMessage',
      ];
      const updates = {};
      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });

      product = await Product.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
      await invalidatePattern('cache:/api/products*');
      await indexProduct(product);
      res.json({ success: true, product });
    } catch (err) {
      console.error('Update product error:', err);
      res.status(500).json({ success: false, error: 'Server error updating product' });
    }
  }
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Soft delete a product (seller only, must own product)
 * @access  Private (Seller)
 */
router.delete(
  '/:id',
  auth,
  param('id').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
      if (product.sellerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, error: 'You can only delete your own products' });
      }
      product.isActive = false;
      await product.save();
      await invalidatePattern('cache:/api/products*');
      await deleteProduct(product._id);
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
      console.error('Delete product error:', err);
      res.status(500).json({ success: false, error: 'Server error deleting product' });
    }
  }
);

/**
 * @route   POST /api/products/:id/restore
 * @desc    Restore a soft-deleted product (seller only)
 * @access  Private (Seller)
 */
router.post(
  '/:id/restore',
  auth,
  param('id').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
      if (product.sellerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }
      product.isActive = true;
      await product.save();
      await invalidatePattern('cache:/api/products*');
      await indexProduct(product);
      res.json({ success: true, product });
    } catch (err) {
      console.error('Restore product error:', err);
      res.status(500).json({ success: false, error: 'Server error restoring product' });
    }
  }
);

// ========== MONETIZATION: PROMOTED LISTINGS ==========

/**
 * @route   POST /api/products/:id/promote
 * @desc    Pay to promote a product (seller only)
 * @access  Private (Seller)
 */
router.post(
  '/:id/promote',
  auth,
  param('id').isMongoId(),
  body('days').isInt({ min: 1, max: 30 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
      if (product.sellerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, error: 'You can only promote your own products' });
      }

      const settings = await PlatformSettings.getSettings();
      if (!settings.enablePromotedListings) {
        return res.status(400).json({ success: false, error: 'Promoted listings are currently disabled by admin' });
      }

      const { days } = req.body;
      const cost = days * settings.promotedPricePerDay;

      const seller = await User.findById(req.user.id);
      if (seller.balance < cost) {
        return res.status(400).json({ success: false, error: `Insufficient balance. You need $${cost.toFixed(2)}.` });
      }

      seller.balance -= cost;
      await seller.save();

      product.isPromoted = true;
      product.promotionEndDate = new Date(Date.now() + days * 86400000);
      product.promotionPricePaid = cost;
      await product.save();
      await invalidatePattern('cache:/api/products*');
      await indexProduct(product);
      res.json({
        success: true,
        message: `Product promoted for ${days} days. Cost: $${cost.toFixed(2)}`,
        product,
      });
    } catch (err) {
      console.error('Promote product error:', err);
      res.status(500).json({ success: false, error: 'Server error promoting product' });
    }
  }
);

module.exports = router;