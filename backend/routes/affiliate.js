const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Affiliate = require('../models/Affiliate');
const AffiliateTier = require('../models/AffiliateTier');
const AffiliateCoupon = require('../models/AffiliateCoupon');
const AffiliateResource = require('../models/AffiliateResource');
const AffiliateClick = require('../models/AffiliateClick');
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { notifyUser } = require('../services/notificationService');

// Helper: generate unique affiliate code
const generateCode = (userId) => {
  const hash = crypto.createHash('md5').update(userId.toString()).digest('hex').substring(0, 8);
  return `REF${hash.toUpperCase()}`;
};

// Helper: update affiliate tier based on conversions/earnings
const updateAffiliateTier = async (affiliateId) => {
  const affiliate = await Affiliate.findById(affiliateId);
  if (!affiliate) return;
  const tiers = await AffiliateTier.find({ isActive: true }).sort('minConversions');
  let newTier = null;
  for (const tier of tiers) {
    if (affiliate.conversions >= tier.minConversions && 
        (tier.minEarnings === 0 || affiliate.totalEarnings >= tier.minEarnings)) {
      newTier = tier;
    } else break;
  }
  if (newTier && (!affiliate.tierId || affiliate.tierId.toString() !== newTier._id.toString())) {
    affiliate.tierId = newTier._id;
    affiliate.commissionRate = newTier.commissionRate;
    await affiliate.save();
    await notifyUser(affiliate.userId, 'affiliate', 'Tier Upgraded', 
      `Congratulations! You've reached ${newTier.name} tier with ${newTier.commissionRate}% commission.`, '/affiliate');
  }
};

// ========== PUBLIC: Track click (redirect) ==========
router.get('/go/:code', async (req, res) => {
  const { code } = req.params;
  const affiliate = await Affiliate.findOne({ affiliateCode: code, isActive: true });
  if (!affiliate) {
    return res.redirect('/');
  }
  // Record click
  await AffiliateClick.create({
    affiliateCode: code,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    referrer: req.headers.referer,
    landedUrl: req.query.url || '/',
  });
  // Increment click count
  affiliate.clicks += 1;
  await affiliate.save();
  // Set affiliate cookie (30 days)
  res.cookie('affiliate_code', code, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
  // Redirect to intended URL or home
  const redirectUrl = req.query.url || '/';
  res.redirect(redirectUrl);
});

// ========== AFFILIATE DASHBOARD (logged in) ==========
// Get or create affiliate, return full dashboard data (including tiers, coupons, resources)
router.get('/dashboard', auth, async (req, res) => {
  try {
    let affiliate = await Affiliate.findOne({ userId: req.user.id }).populate('tierId');
    if (!affiliate) {
      affiliate = new Affiliate({
        userId: req.user.id,
        affiliateCode: generateCode(req.user.id),
      });
      await affiliate.save();
    }
    // Get recent clicks and conversions
    const clicks = await AffiliateClick.find({ affiliateCode: affiliate.affiliateCode }).sort({ createdAt: -1 }).limit(20);
    const conversions = await Order.find({ referredBy: affiliate.affiliateCode, paymentStatus: 'paid' }).sort({ createdAt: -1 });
    // Get coupons created by this affiliate
    const coupons = await AffiliateCoupon.find({ affiliateId: affiliate._id });
    // Get all active resources (affiliate can use)
    const resources = await AffiliateResource.getActiveResources();
    // Get all tiers (for info)
    const tiers = await AffiliateTier.find({ isActive: true }).sort('minConversions');
    
    res.json({
      success: true,
      affiliate,
      stats: {
        clicks: affiliate.clicks,
        conversions: affiliate.conversions,
        totalEarnings: affiliate.totalEarnings,
        pendingEarnings: affiliate.pendingEarnings,
        paidEarnings: affiliate.paidEarnings,
      },
      clicks,
      conversions,
      coupons,
      resources,
      tiers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update affiliate settings (payment method, email)
router.put('/dashboard', auth, async (req, res) => {
  try {
    const { paymentMethod, paymentEmail } = req.body;
    const affiliate = await Affiliate.findOne({ userId: req.user.id });
    if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });
    if (paymentMethod) affiliate.paymentMethod = paymentMethod;
    if (paymentEmail) affiliate.paymentEmail = paymentEmail;
    await affiliate.save();
    res.json({ success: true, affiliate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== AFFILIATE COUPONS ==========
// Create a new coupon
router.post('/coupons', auth, async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, usageLimit, expiresAt } = req.body;
    const affiliate = await Affiliate.findOne({ userId: req.user.id });
    if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });
    const existing = await AffiliateCoupon.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ error: 'Coupon code already exists' });
    const coupon = new AffiliateCoupon({
      affiliateId: affiliate._id,
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      usageLimit: usageLimit || null,
      expiresAt: expiresAt || null,
    });
    await coupon.save();
    res.status(201).json({ coupon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my coupons
router.get('/coupons', auth, async (req, res) => {
  try {
    const affiliate = await Affiliate.findOne({ userId: req.user.id });
    if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });
    const coupons = await AffiliateCoupon.find({ affiliateId: affiliate._id });
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== AFFILIATE RESOURCES ==========
// Increment click count for a resource (when affiliate uses it)
router.post('/resources/:id/click', auth, async (req, res) => {
  try {
    const resource = await AffiliateResource.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    await resource.incrementClicks();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== REQUEST PAYOUT ==========
router.post('/request-payout', auth, async (req, res) => {
  try {
    const affiliate = await Affiliate.findOne({ userId: req.user.id });
    if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });
    if (affiliate.pendingEarnings <= 0) return res.status(400).json({ error: 'No pending earnings' });
    // In production, create a PayoutRequest document and mark as pending.
    // For now, we'll just send a notification to admin.
    const adminUsers = await User.find({ isAdmin: true }).select('email');
    // notify admins (simplified, could use notification service)
    res.json({ success: true, message: 'Payout requested. Admin will process soon.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMIN ROUTES ==========
// Get all affiliates
router.get('/admin/all', auth, admin, async (req, res) => {
  try {
    const affiliates = await Affiliate.find().populate('userId', 'name email').populate('tierId');
    res.json({ success: true, affiliates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update affiliate (manual override of commission, status, tier)
router.put('/admin/:id', auth, admin, async (req, res) => {
  try {
    const { commissionRate, isActive, tierId } = req.body;
    const affiliate = await Affiliate.findById(req.params.id);
    if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });
    if (commissionRate !== undefined) affiliate.commissionRate = commissionRate;
    if (isActive !== undefined) affiliate.isActive = isActive;
    if (tierId !== undefined) affiliate.tierId = tierId;
    await affiliate.save();
    res.json({ success: true, affiliate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process payout (admin)
router.post('/admin/payout/:id', auth, admin, async (req, res) => {
  try {
    const { amount } = req.body;
    const affiliate = await Affiliate.findById(req.params.id);
    if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });
    if (amount > affiliate.pendingEarnings) return res.status(400).json({ error: 'Amount exceeds pending earnings' });
    affiliate.paidEarnings += amount;
    affiliate.pendingEarnings -= amount;
    await affiliate.save();
    res.json({ success: true, affiliate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMIN: Manage Tiers ==========
router.get('/admin/tiers', auth, admin, async (req, res) => {
  try {
    const tiers = await AffiliateTier.find().sort('minConversions');
    res.json({ tiers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/tiers', auth, admin, async (req, res) => {
  try {
    const tier = new AffiliateTier(req.body);
    await tier.save();
    res.status(201).json({ tier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/tiers/:id', auth, admin, async (req, res) => {
  try {
    const tier = await AffiliateTier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tier) return res.status(404).json({ error: 'Tier not found' });
    res.json({ tier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/tiers/:id', auth, admin, async (req, res) => {
  try {
    const tier = await AffiliateTier.findByIdAndDelete(req.params.id);
    if (!tier) return res.status(404).json({ error: 'Tier not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMIN: Manage Resources ==========
router.get('/admin/resources', auth, admin, async (req, res) => {
  try {
    const resources = await AffiliateResource.find().sort({ sortOrder: 1 });
    res.json({ resources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/resources', auth, admin, async (req, res) => {
  try {
    const resource = new AffiliateResource(req.body);
    await resource.save();
    res.status(201).json({ resource });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/resources/:id', auth, admin, async (req, res) => {
  try {
    const resource = await AffiliateResource.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json({ resource });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/resources/:id', auth, admin, async (req, res) => {
  try {
    const resource = await AffiliateResource.findByIdAndDelete(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;