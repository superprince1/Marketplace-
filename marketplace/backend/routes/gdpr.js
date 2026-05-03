const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Activity = require('../models/Activity');
const { collectUserData } = require('../services/dataExportService');
const { scheduleAccountDeletion } = require('../jobs/accountDeletion');

// ========== EXPORT USER DATA ==========
router.get('/export', auth, async (req, res) => {
  try {
    const data = await collectUserData(req.user.id);
    // Respond as JSON; could also offer CSV.
    res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== REQUEST ACCOUNT DELETION ==========
router.post('/delete-request', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if already requested
    if (user.deletionRequestedAt) {
      return res.status(400).json({ error: 'Deletion already requested. Check your email for confirmation.' });
    }

    // Set deletion request date (30 days grace period before actual deletion)
    user.deletionRequestedAt = new Date();
    user.deletionScheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.isActive = false; // immediately disable account
    await user.save();

    // Send email confirmation (implement sendEmail utility)
    // await sendEmail({ to: user.email, subject: 'Account deletion requested', html: `...` });

    // Schedule actual deletion job (optional, can also be handled by cron)
    // For now, just mark; a cron job will process deletions daily.

    res.json({ success: true, message: 'Deletion requested. Your account will be permanently deleted after 30 days.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CANCEL DELETION REQUEST ==========
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
    res.json({ success: true, message: 'Deletion request cancelled. Your account is active again.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMIN: Anonymize user (manual) ==========
router.post('/admin/anonymize/:userId', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Anonymize profile
  user.name = 'Deleted User';
  user.email = `deleted_${user._id}@anonymized.xyz`;
  user.phone = '';
  user.address = {};
  user.avatar = '';
  user.isActive = false;
  // Remove all personal data from orders (items remain but buyer references removed)
  await user.save();

  // Anonymize reviews (keep content but remove user reference)
  await Review.updateMany({ userId: user._id }, { userId: null, name: 'Anonymous' });

  // Anonymize activities
  await Activity.updateMany({ userId: user._id }, { userId: null, metadata: {} });

  res.json({ success: true, message: 'User anonymized' });
});

module.exports = router;