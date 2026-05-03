const express = require('express');
const router = express.Router();
const PlatformSettings = require('../models/PlatformSettings');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const sendEmail = require('../utils/sendEmail');

// ========== GET settings ==========
router.get('/monetization', auth, admin, async (req, res) => {
  const settings = await PlatformSettings.getSettings();
  res.json({ success: true, settings });
});

// ========== UPDATE settings (all toggles and values) ==========
router.put('/monetization', auth, admin, async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) settings = new PlatformSettings();
    Object.assign(settings, req.body);
    await settings.save();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== Manage subscription plans (CRUD) ==========
router.get('/subscription-plans', auth, admin, async (req, res) => {
  const settings = await PlatformSettings.getSettings();
  res.json({ success: true, plans: settings.subscriptionPlans });
});

router.post('/subscription-plans', auth, admin, async (req, res) => {
  const settings = await PlatformSettings.getSettings();
  settings.subscriptionPlans.push(req.body);
  await settings.save();
  res.json({ success: true, plan: settings.subscriptionPlans[settings.subscriptionPlans.length - 1] });
});

router.put('/subscription-plans/:planId', auth, admin, async (req, res) => {
  const settings = await PlatformSettings.getSettings();
  const plan = settings.subscriptionPlans.id(req.params.planId);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  Object.assign(plan, req.body);
  await settings.save();
  res.json({ success: true, plan });
});

router.delete('/subscription-plans/:planId', auth, admin, async (req, res) => {
  const settings = await PlatformSettings.getSettings();
  settings.subscriptionPlans.id(req.params.planId).remove();
  await settings.save();
  res.json({ success: true });
});

// ========== Lead generation: export email list ==========
router.post('/export-emails', auth, admin, async (req, res) => {
  const settings = await PlatformSettings.getSettings();
  if (!settings.enableLeadGeneration) {
    return res.status(403).json({ error: 'Lead generation is disabled' });
  }
  // For demo, we export all buyer emails (you can filter by role)
  const users = await User.find({ role: 'buyer' }).select('email name createdAt');
  let csv = 'Name,Email,Joined Date\n';
  users.forEach(u => {
    csv += `"${u.name}","${u.email}","${u.createdAt.toISOString()}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
  res.send(csv);
});

module.exports = router;