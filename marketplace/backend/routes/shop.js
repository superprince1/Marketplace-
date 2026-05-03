/**
 * Shop Routes – Manage seller storefronts
 * Endpoints:
 * - GET    /api/shop/:slug         (public) view shop page
 * - GET    /api/shop/my/shop       (private) get or create own shop
 * - PUT    /api/shop/my/shop       (private) update own shop
 * - GET    /api/shop/my/products   (private) get seller's products with shop context
 * - POST   /api/shop/premium       (private) purchase premium shop features (one‑time)
 * - GET    /api/shop/my/stats      (private) get shop analytics
 * - POST   /api/shop/custom-domain (private) request custom domain
 * - POST   /api/shop/verify-domain (private) verify custom domain
 * - DELETE /api/shop/custom-domain (private) remove custom domain
 * - POST   /api/shop/purchase-custom-domain (private) pay custom domain fee
 */
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const crypto = require('crypto');
const dns = require('dns').promises;
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const User = require('../models/User');
const PlatformSettings = require('../models/PlatformSettings');
const auth = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter'); // optional

// Helper: generate unique slug
const generateSlug = async (baseName, sellerId) => {
  let slug = baseName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug) slug = 'shop';
  let uniqueSlug = slug;
  let counter = 1;
  while (await Shop.findOne({ slug: uniqueSlug, sellerId: { $ne: sellerId } })) {
    uniqueSlug = `${slug}-${counter++}`;
  }
  return uniqueSlug;
};

// Helper: generate random token for DNS verification
const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

// ========== PUBLIC ROUTES ==========

/**
 * @route   GET /api/shop/:slug
 * @desc    Get shop details by slug (public)
 * @access  Public
 */
router.get('/:slug',
  param('slug').trim().escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { slug } = req.params;
      const shop = await Shop.findOne({ slug, isActive: true }).populate('sellerId', 'name avatar');
      if (!shop) {
        return res.status(404).json({ success: false, error: 'Shop not found' });
      }

      // Get shop's products (active only, limit 20 for preview)
      const products = await Product.find({ sellerId: shop.sellerId._id, isActive: true })
        .sort({ createdAt: -1 })
        .limit(20);

      // Check if seller has premium shop (for frontend to show extra sections)
      const seller = await User.findById(shop.sellerId._id);
      const hasPremiumShop = seller?.premiumShopPurchased === true;
      const hasActiveSubscription = seller?.subscription?.isActive && seller.subscription.endDate > new Date();

      res.json({
        success: true,
        shop,
        products,
        shopStats: {
          productCount: await Product.countDocuments({ sellerId: shop.sellerId._id, isActive: true }),
          hasPremiumShop,
          hasActiveSubscription,
        },
      });
    } catch (err) {
      console.error('Get shop error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ========== SELLER ROUTES (PROTECTED) ==========

/**
 * @route   GET /api/shop/my/shop
 * @desc    Get logged-in seller's shop (creates one if not exists)
 * @access  Private (Seller only)
 */
router.get('/my/shop', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'seller' && !user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Only sellers can have a shop' });
    }

    let shop = await Shop.findOne({ sellerId: req.user.id });
    if (!shop) {
      // Auto-create a shop with default values
      const baseSlug = user.name.toLowerCase().replace(/\s+/g, '-');
      const uniqueSlug = await generateSlug(baseSlug, req.user.id);
      shop = new Shop({
        sellerId: req.user.id,
        slug: uniqueSlug,
        name: user.name,
        contactEmail: user.email,
      });
      await shop.save();
    }

    res.json({ success: true, shop });
  } catch (err) {
    console.error('Get my shop error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   PUT /api/shop/my/shop
 * @desc    Update logged-in seller's shop (with validation)
 * @access  Private (Seller only)
 */
router.put('/my/shop',
  auth,
  [
    body('name').optional().trim().escape().isLength({ min: 2, max: 100 }),
    body('slug').optional().trim().matches(/^[a-z0-9-]+$/).withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
    body('logo').optional().isURL(),
    body('banner').optional().isURL(),
    body('description').optional().trim().escape().isLength({ max: 2000 }),
    body('contactEmail').optional().isEmail(),
    body('contactPhone').optional().matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone format'),
    body('policies.returns').optional().trim().escape(),
    body('policies.shipping').optional().trim().escape(),
    body('policies.payment').optional().trim().escape(),
    body('socialLinks.facebook').optional().isURL(),
    body('socialLinks.instagram').optional().isURL(),
    body('socialLinks.twitter').optional().isURL(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      let shop = await Shop.findOne({ sellerId: req.user.id });
      if (!shop) {
        return res.status(404).json({ success: false, error: 'Shop not found. Please contact support.' });
      }

      const allowedUpdates = [
        'name', 'slug', 'logo', 'banner', 'description',
        'policies', 'socialLinks', 'contactEmail', 'contactPhone',
      ];
      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          if (field === 'policies' || field === 'socialLinks') {
            shop[field] = { ...shop[field], ...req.body[field] };
          } else {
            shop[field] = req.body[field];
          }
        }
      }

      // If slug changed, ensure uniqueness
      if (req.body.slug && req.body.slug !== shop.slug) {
        const slugExists = await Shop.findOne({ slug: req.body.slug, sellerId: { $ne: req.user.id } });
        if (slugExists) {
          return res.status(400).json({ success: false, error: 'Slug already taken. Please choose another.' });
        }
      }

      await shop.save();
      res.json({ success: true, shop });
    } catch (err) {
      console.error('Update shop error:', err);
      if (err.code === 11000 && err.keyPattern?.slug) {
        return res.status(400).json({ success: false, error: 'Slug already taken. Please choose another.' });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * @route   GET /api/shop/my/products
 * @desc    Get seller's products with pagination (for shop page)
 * @access  Private (Seller)
 */
router.get('/my/products',
  auth,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const products = await Product.find({ sellerId: req.user.id, isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Product.countDocuments({ sellerId: req.user.id, isActive: true });

      res.json({
        success: true,
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error('Get shop products error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * @route   GET /api/shop/my/stats
 * @desc    Get shop analytics: total products, total sales (paid orders), average rating
 * @access  Private (Seller)
 */
router.get('/my/stats', auth, async (req, res) => {
  try {
    const sellerId = req.user.id;

    const productCount = await Product.countDocuments({ sellerId, isActive: true });
    const totalProducts = productCount;

    // Get all paid orders containing seller's items
    const Order = require('../models/Order');
    const orders = await Order.find({
      'items.sellerId': sellerId,
      paymentStatus: 'paid',
    });

    let totalSales = 0;
    for (const order of orders) {
      const sellerItems = order.items.filter(item => item.sellerId.toString() === sellerId);
      const sellerTotal = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      totalSales += sellerTotal;
    }

    // Average product rating (if reviews exist)
    const products = await Product.find({ sellerId, isActive: true }).select('ratings');
    let totalRating = 0;
    let ratingCount = 0;
    for (const p of products) {
      if (p.ratings && p.ratings.count > 0) {
        totalRating += p.ratings.average;
        ratingCount++;
      }
    }
    const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    res.json({
      success: true,
      stats: {
        productCount: totalProducts,
        totalSales,
        averageRating: avgRating,
        orderCount: orders.length,
      },
    });
  } catch (err) {
    console.error('Get shop stats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/shop/premium
 * @desc    Purchase premium shop features (one‑time fee)
 * @access  Private (Seller)
 */
router.post('/premium', auth, async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    if (!settings.enablePremiumShop) {
      return res.status(400).json({ success: false, error: 'Premium shop features are currently disabled' });
    }

    const user = await User.findById(req.user.id);
    if (user.role !== 'seller') {
      return res.status(403).json({ success: false, error: 'Only sellers can purchase premium shop' });
    }

    if (user.premiumShopPurchased) {
      return res.status(400).json({ success: false, error: 'You already have premium shop features' });
    }

    const cost = settings.premiumShopPrice;
    if (user.balance < cost) {
      return res.status(400).json({ success: false, error: `Insufficient balance. Need $${cost.toFixed(2)}.` });
    }

    // Deduct cost
    user.balance -= cost;
    user.premiumShopPurchased = true;
    user.premiumShopPurchasedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: `Premium shop features activated. Cost: $${cost.toFixed(2)}`,
      premiumFeatures: settings.premiumShopFeatures,
    });
  } catch (err) {
    console.error('Purchase premium shop error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== CUSTOM DOMAIN MANAGEMENT ==========

/**
 * @route   POST /api/shop/custom-domain
 * @desc    Request a custom domain (generates verification token, checks fee)
 * @access  Private (Seller)
 */
router.post('/custom-domain', auth, async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain is required' });

    // Basic domain format validation
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    const shop = await Shop.findOne({ sellerId: req.user.id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // Check if custom domain is already used by another shop
    const existing = await Shop.findOne({ customDomain: domain });
    if (existing) return res.status(400).json({ error: 'Domain already taken' });

    // Check monetization: if custom domain fee is enabled, verify payment
    const settings = await PlatformSettings.getSettings();
    if (settings.enableCustomDomainFee && !shop.customDomainPaid) {
      return res.status(402).json({
        error: 'Custom domain requires a one‑time fee. Please purchase it first.',
        paymentRequired: true,
        price: settings.customDomainPrice,
      });
    }

    const token = generateVerificationToken();
    shop.customDomain = domain;
    shop.domainVerificationToken = token;
    shop.domainVerified = false;
    await shop.save();

    // Provide DNS verification instruction
    const verificationDns = `_verify.${domain} TXT "${token}"`;
    res.json({
      success: true,
      message: 'Domain saved. Please add the following TXT record to your DNS:',
      verificationDns,
      token,
    });
  } catch (err) {
    console.error('Custom domain request error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/shop/verify-domain
 * @desc    Verify DNS TXT record to confirm domain ownership
 * @access  Private (Seller)
 */
router.post('/verify-domain', auth, async (req, res) => {
  try {
    const shop = await Shop.findOne({ sellerId: req.user.id });
    if (!shop || !shop.customDomain) {
      return res.status(404).json({ error: 'No custom domain pending verification' });
    }

    const domain = shop.customDomain;
    const expectedToken = shop.domainVerificationToken;
    if (!expectedToken) {
      return res.status(400).json({ error: 'No verification token found. Please re‑add the domain.' });
    }

    try {
      const records = await dns.resolveTxt(`_verify.${domain}`);
      const txtValues = records.flat();
      if (txtValues.includes(expectedToken)) {
        shop.domainVerified = true;
        shop.domainVerificationToken = null;
        await shop.save();
        res.json({ success: true, verified: true, message: 'Domain verified successfully!' });
      } else {
        res.json({ success: true, verified: false, message: 'TXT record not found yet. DNS propagation may take a few minutes.' });
      }
    } catch (dnsErr) {
      res.json({ success: true, verified: false, message: 'DNS lookup failed. Make sure you added the TXT record.' });
    }
  } catch (err) {
    console.error('Domain verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/shop/custom-domain
 * @desc    Remove custom domain from shop
 * @access  Private (Seller)
 */
router.delete('/custom-domain', auth, async (req, res) => {
  try {
    const shop = await Shop.findOne({ sellerId: req.user.id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    shop.customDomain = undefined;
    shop.domainVerified = false;
    shop.domainVerificationToken = undefined;
    await shop.save();
    res.json({ success: true, message: 'Custom domain removed' });
  } catch (err) {
    console.error('Remove domain error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/shop/purchase-custom-domain
 * @desc    Pay the one‑time fee for custom domain feature
 * @access  Private (Seller)
 */
router.post('/purchase-custom-domain', auth, async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    if (!settings.enableCustomDomainFee) {
      return res.status(400).json({ error: 'Custom domain feature is not monetized.' });
    }

    const shop = await Shop.findOne({ sellerId: req.user.id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (shop.customDomainPaid) {
      return res.status(400).json({ error: 'Already purchased.' });
    }

    const amount = settings.customDomainPrice;
    // For simplicity, we assume the seller's balance is used (or you can integrate real payment).
    // If you have a wallet/balance system, deduct from there.
    const user = await User.findById(req.user.id);
    if (user.balance < amount) {
      return res.status(400).json({ error: `Insufficient balance. Need $${amount.toFixed(2)}.` });
    }

    user.balance -= amount;
    await user.save();

    shop.customDomainPaid = true;
    shop.customDomainPaidAt = new Date();
    shop.customDomainPaymentId = `CUST_${Date.now()}_${user._id}`;
    await shop.save();

    res.json({ success: true, message: 'Custom domain feature activated. You can now add a custom domain.' });
  } catch (err) {
    console.error('Purchase custom domain error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;