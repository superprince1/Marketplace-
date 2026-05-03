const express = require('express');
const router = express.Router();
const FraudAlert = require('../models/FraudAlert');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// GET all fraud alerts with filter
router.get('/alerts', auth, admin, async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const alerts = await FraudAlert.find(filter).populate('orderId', 'orderNumber total');
  res.json({ success: true, alerts });
});

// UPDATE fraud alert status
router.put('/alerts/:id', auth, admin, async (req, res) => {
  const { status, notes } = req.body;
  const alert = await FraudAlert.findById(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  alert.status = status;
  if (notes) alert.notes = notes;
  alert.reviewedBy = req.user.id;
  alert.reviewedAt = new Date();
  await alert.save();
  res.json({ success: true, alert });
});

module.exports = router;