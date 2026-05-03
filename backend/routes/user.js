const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const { invalidatePattern } = require('../middleware/cache');

/**
 * @route   GET /api/user/profile
 * @desc    Get current user's profile (excluding sensitive fields)
 * @access  Private
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/user/profile
 * @desc    Update user's profile (name, phone, address, avatar)
 * @access  Private
 */
router.put(
  '/profile',
  auth,
  [
    body('name').optional().trim().escape().isLength({ min: 2, max: 50 }),
    body('phone').optional().trim().matches(/^[0-9]{10,15}$/).withMessage('Invalid phone number'),
    body('address.street').optional().trim().escape(),
    body('address.city').optional().trim().escape(),
    body('address.state').optional().trim().escape(),
    body('address.zipCode').optional().trim().escape(),
    body('address.country').optional().trim().escape(),
    body('avatar').optional().isURL(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const updates = {};
      const allowedFields = ['name', 'phone', 'avatar'];
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });
      if (req.body.address) {
        updates.address = {};
        ['street', 'city', 'state', 'zipCode', 'country'].forEach(f => {
          if (req.body.address[f] !== undefined) updates.address[f] = req.body.address[f];
        });
      }

      const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true })
        .select('-password -resetPasswordToken -resetPasswordExpire');
      if (!user) return res.status(404).json({ error: 'User not found' });

      await invalidatePattern('cache:/api/user*');
      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @route   PUT /api/user/language
 * @desc    Update user's preferred language (i18n)
 * @access  Private
 */
router.put(
  '/language',
  auth,
  [body('language').isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja']).withMessage('Unsupported language')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { preferredLanguage: req.body.language },
        { new: true, select: 'preferredLanguage name email' }
      );
      res.json({ success: true, language: user.preferredLanguage });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @route   POST /api/user/change-password
 * @desc    Change user's password
 * @access  Private
 */
router.post(
  '/change-password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('+password');
      const isMatch = await user.matchPassword(req.body.currentPassword);
      if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });

      user.password = req.body.newPassword;
      await user.save();

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @route   GET /api/user/orders
 * @desc    Get current user's orders (shortcut, similar to /api/orders)
 * @access  Private
 */
router.get('/orders', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { buyerId: req.user.id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('items.productId', 'name images');

    const total = await Order.countDocuments(filter);
    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/user/credit-balance
 * @desc    Get user's store credit balance (for gift cards)
 * @access  Private
 */
router.get('/credit-balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('storeCredit storeCreditHistory');
    res.json({ success: true, storeCredit: user.storeCredit, history: user.storeCreditHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/user/account
 * @desc    Request account deletion (GDPR) – calls existing GDPR route
 * @access  Private
 */
router.delete('/account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.deletionRequestedAt) {
      return res.status(400).json({ error: 'Deletion already requested' });
    }
    user.deletionRequestedAt = new Date();
    user.deletionScheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.isActive = false;
    await user.save();
    // Invalidate token (force logout)
    res.json({ success: true, message: 'Account deletion requested. You have 30 days to cancel.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/user/cancel-deletion
 * @desc    Cancel pending account deletion
 * @access  Private
 */
router.post('/cancel-deletion', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.deletionRequestedAt) {
      return res.status(400).json({ error: 'No pending deletion request' });
    }
    user.deletionRequestedAt = null;
    user.deletionScheduledFor = null;
    user.isActive = true;
    await user.save();
    res.json({ success: true, message: 'Deletion cancelled. Account is active again.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;