const Product = require('../models/Product');
const User = require('../models/User');
const PlatformSettings = require('../models/PlatformSettings');
const { getVariant } = require('../services/experimentService');
const { indexProduct, deleteProduct } = require('../services/productSync');
const { convertPrice } = require('../services/currencyService');

// Helper: apply experiment personalisation
const applyExperimentToProduct = (product, variant) => {
  if (!variant || !variant.config) return product;
  const { config } = variant;
  if (config.priceModifier) {
    let newPrice = product.price;
    if (config.priceModifierType === 'percentage') {
      newPrice = product.price * (1 + config.priceModifier / 100);
    } else if (config.priceModifierType === 'fixed') {
      newPrice = product.price + config.priceModifier;
    }
    product.price = Math.max(0, newPrice);
    product.originalPrice = product.price - (config.priceModifier || 0);
    product.experimentApplied = variant.name;
  }
  if (config.badge) product.experimentBadge = config.badge;
  return product;
};

/**
 * @desc    Get all products with filtering, sorting, pagination, and translation
 * @route   GET /api/products
 * @access  Public
 */
exports.getProducts = async (req, res) => {
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
    switch (sort) {
      case 'price_asc': sortObj = { price: 1 }; break;
      case 'price_desc': sortObj = { price: -1 }; break;
      case 'rating': sortObj = { 'ratings.average': -1 }; break;
      case 'sold': sortObj = { soldCount: -1 }; break;
      default: sortObj = { createdAt: -1 };
    }

    const settings = await PlatformSettings.getSettings();
    let products, total;
    if (settings.enablePromotedListings) {
      const pipeline = [
        { $match: filter },
        { $addFields: { isCurrentlyPromoted: { $and: [{ $eq: ['$isPromoted', true] }, { $gte: ['$promotionEndDate', new Date()] }] } } },
        { $sort: { isCurrentlyPromoted: -1, ...sortObj } },
        { $skip: skip },
        { $limit: limitNum },
        { $lookup: { from: 'users', localField: 'sellerId', foreignField: '_id', as: 'sellerId' } },
        { $unwind: { path: '$sellerId', preserveNullAndEmptyArrays: true } },
        { $project: { 'sellerId.password': 0 } },
      ];
      products = await Product.aggregate(pipeline);
      total = await Product.countDocuments(filter);
    } else {
      products = await Product.find(filter)
        .populate('sellerId', 'name avatar email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);
      total = await Product.countDocuments(filter);
    }

    // Apply currency conversion
    const lang = req.lang || 'en';
    const convertedProducts = await Promise.all(products.map(async p => {
      const obj = p.toObject ? p.toObject() : p;
      obj.priceConverted = await convertPrice(obj.price, req.targetCurrency);
      if (obj.comparePrice) obj.comparePriceConverted = await convertPrice(obj.comparePrice, req.targetCurrency);
      // Apply translation
      if (lang !== 'en' && obj.translations && obj.translations.get(lang)) {
        const t = obj.translations.get(lang);
        if (t.name) obj.name = t.name;
        if (t.description) obj.description = t.description;
        if (t.shortDescription) obj.shortDescription = t.shortDescription;
      }
      return obj;
    }));

    res.json({
      success: true,
      products: convertedProducts,
      currency: req.targetCurrency,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error fetching products' });
  }
};

/**
 * @desc    Get single product by ID (with A/B test personalisation & i18n)
 * @route   GET /api/products/:id
 * @access  Public
 */
exports.getProductById = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id).populate('sellerId', 'name avatar email phone address');
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    // Increment views asynchronously
    product.incrementViews().catch(console.error);

    // A/B test personalisation
    const userId = req.user?.id || null;
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
    const variant = await getVariant('product_price', userId, sessionId);
    if (variant) applyExperimentToProduct(product, variant);

    // Apply translation
    const lang = req.lang || 'en';
    if (lang !== 'en' && product.translations && product.translations.get(lang)) {
      const t = product.translations.get(lang);
      if (t.name) product.name = t.name;
      if (t.description) product.description = t.description;
      if (t.shortDescription) product.shortDescription = t.shortDescription;
    }

    // Currency conversion
    const convertedProduct = product.toObject();
    convertedProduct.priceConverted = await convertPrice(convertedProduct.price, req.targetCurrency);
    if (convertedProduct.comparePrice) {
      convertedProduct.comparePriceConverted = await convertPrice(convertedProduct.comparePrice, req.targetCurrency);
    }

    res.json({ success: true, product: convertedProduct, currency: req.targetCurrency });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * @desc    Create a new product (seller only)
 * @route   POST /api/products
 * @access  Private (Seller)
 */
exports.createProduct = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'seller') {
      return res.status(403).json({ success: false, error: 'Only sellers can create products' });
    }

    // Check product limit
    const settings = await PlatformSettings.getSettings();
    let productLimit = 0;
    if (user.hasActiveSubscription && await user.hasActiveSubscription()) {
      const plan = settings.subscriptionPlans.id(user.subscription.planId);
      if (plan) productLimit = plan.maxProducts;
    }
    if (productLimit > 0) {
      const currentCount = await Product.countDocuments({ sellerId: user._id });
      if (currentCount >= productLimit) {
        return res.status(403).json({ success: false, error: `Your plan allows only ${productLimit} products` });
      }
    }

    const product = new Product({
      ...req.body,
      sellerId: user._id,
      sellerName: user.name,
    });
    await product.save();

    await indexProduct(product);
    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error creating product' });
  }
};

/**
 * @desc    Update a product (seller only)
 * @route   PUT /api/products/:id
 * @access  Private (Seller)
 */
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (product.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Allowed updates
    const allowedUpdates = [
      'name', 'price', 'compareAtPrice', 'description', 'shortDescription',
      'category', 'subcategory', 'images', 'stock', 'sku', 'weight', 'dimensions',
      'tags', 'isFeatured', 'isActive', 'hasVariations', 'variations',
      'allowPreorder', 'preorderStock', 'estimatedShipDate', 'preorderMessage',
    ];
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    product = await Product.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    await indexProduct(product);
    res.json({ success: true, product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error updating product' });
  }
};

/**
 * @desc    Soft delete a product (seller only)
 * @route   DELETE /api/products/:id
 * @access  Private (Seller)
 */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (product.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    product.isActive = false;
    await product.save();
    await deleteProduct(product._id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * @desc    Promote a product (paid listing)
 * @route   POST /api/products/:id/promote
 * @access  Private (Seller)
 */
exports.promoteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (product.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const settings = await PlatformSettings.getSettings();
    if (!settings.enablePromotedListings) {
      return res.status(400).json({ success: false, error: 'Promoted listings disabled' });
    }

    const { days } = req.body;
    const cost = days * settings.promotedPricePerDay;
    const seller = await User.findById(req.user.id);
    if (seller.balance < cost) {
      return res.status(400).json({ success: false, error: `Insufficient balance. Need $${cost}` });
    }

    seller.balance -= cost;
    await seller.save();

    product.isPromoted = true;
    product.promotionEndDate = new Date(Date.now() + days * 86400000);
    product.promotionPricePaid = cost;
    await product.save();
    await indexProduct(product);

    res.json({ success: true, message: `Promoted for ${days} days`, product });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};