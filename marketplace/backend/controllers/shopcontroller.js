const Shop = require('../models/Shop');
const Product = require('../models/Product');
const User = require('../models/User');
const PlatformSettings = require('../models/PlatformSettings');

/**
 * @desc    Get public shop profile by slug
 * @route   GET /api/shop/:slug
 * @access  Public
 */
exports.getShopBySlug = async (req, res) => {
  try {
    const shop = await Shop.findOne({ slug: req.params.slug, isActive: true }).populate('sellerId', 'name email avatar');
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get current seller's shop profile
 * @route   GET /api/shop/my/shop
 * @access  Private (Seller)
 */
exports.getMyShop = async (req, res) => {
  try {
    let shop = await Shop.findOne({ sellerId: req.user.id });
    if (!shop) {
      const user = await User.findById(req.user.id);
      shop = new Shop({ sellerId: req.user.id, slug: user.name.toLowerCase().replace(/\s/g, '-'), name: user.name });
      await shop.save();
    }
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Update shop profile
 * @route   PUT /api/shop/my/shop
 * @access  Private (Seller)
 */
exports.updateShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ sellerId: req.user.id });
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });
    const allowedUpdates = ['name', 'slug', 'logo', 'banner', 'description', 'policies', 'socialLinks', 'contactEmail', 'contactPhone'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) shop[field] = req.body[field];
    });
    if (req.body.slug) shop.slug = req.body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    await shop.save();
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get shop products (public)
 * @route   GET /api/shop/:slug/products
 * @access  Public
 */
exports.getShopProducts = async (req, res) => {
  try {
    const shop = await Shop.findOne({ slug: req.params.slug });
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });
    const products = await Product.find({ sellerId: shop.sellerId, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Request custom domain (monetization)
 * @route   POST /api/shop/custom-domain
 * @access  Private (Seller)
 */
exports.requestCustomDomain = async (req, res) => {
  try {
    const { domain } = req.body;
    const settings = await PlatformSettings.getSettings();
    if (settings.enableCustomDomainFee) {
      const user = await User.findById(req.user.id);
      if (user.balance < settings.customDomainPrice) {
        return res.status(400).json({ success: false, error: `Insufficient balance. Need $${settings.customDomainPrice}` });
      }
      user.balance -= settings.customDomainPrice;
      await user.save();
    }
    const shop = await Shop.findOne({ sellerId: req.user.id });
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });
    shop.customDomain = domain;
    shop.domainVerified = false;
    shop.domainVerificationToken = require('crypto').randomBytes(32).toString('hex');
    shop.customDomainPaid = true;
    shop.customDomainPaidAt = new Date();
    await shop.save();
    res.json({ success: true, message: 'Domain requested. Verify by adding TXT record.', token: shop.domainVerificationToken });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Verify custom domain (webhook or manual)
 * @route   POST /api/shop/verify-domain
 * @access  Private (Seller)
 */
exports.verifyCustomDomain = async (req, res) => {
  try {
    const { domain, token } = req.body;
    const shop = await Shop.findOne({ customDomain: domain, domainVerificationToken: token });
    if (!shop) return res.status(404).json({ success: false, error: 'Invalid domain or token' });
    shop.domainVerified = true;
    await shop.save();
    res.json({ success: true, message: 'Domain verified' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};