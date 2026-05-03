const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const auth = require('../middleware/auth');

// Validate coupon (public)
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' });
    const now = new Date();
    if (coupon.startDate > now) return res.status(400).json({ error: 'Coupon not yet active' });
    if (coupon.endDate && coupon.endDate < now) return res.status(400).json({ error: 'Coupon expired' });
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ error: 'Coupon usage limit reached' });
    if (subtotal < coupon.minOrderAmount) return res.status(400).json({ error: `Minimum order amount $${coupon.minOrderAmount} required` });
    let discount = coupon.discountType === 'percentage' ? (subtotal * coupon.discountValue / 100) : coupon.discountValue;
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) discount = coupon.maxDiscountAmount;
    res.json({ success: true, discount, coupon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seller creates coupon
router.post('/', auth, async (req, res) => {
  try {
    const coupon = new Coupon({ ...req.body, sellerId: req.user.id });
    await coupon.save();
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get seller's coupons
router.get('/my', auth, async (req, res) => {
  const coupons = await Coupon.find({ sellerId: req.user.id });
  res.json({ success: true, coupons });
});

module.exports = router;