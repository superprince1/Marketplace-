const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Experiment = require('../models/Experiment');
const { getVariant, trackConversion } = require('../services/experimentService');

// ========== PUBLIC (for client) ==========
// Get variant assignment for an experiment
router.get('/:experimentName', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
    const variant = await getVariant(req.params.experimentName, userId, sessionId);
    res.json({ variant: variant ? variant.name : null, config: variant?.config || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track conversion event
router.post('/track', async (req, res) => {
  try {
    const { experimentName, metadata } = req.body;
    const userId = req.user?.id || null;
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
    await trackConversion(experimentName, userId, sessionId, metadata);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMIN ROUTES ==========
router.get('/admin/all', auth, admin, async (req, res) => {
  const experiments = await Experiment.find().sort({ createdAt: -1 });
  res.json({ experiments });
});

router.post('/admin', auth, admin, async (req, res) => {
  const experiment = new Experiment(req.body);
  experiment.normalizeWeights();
  await experiment.save();
  res.status(201).json({ experiment });
});

router.put('/admin/:id', auth, admin, async (req, res) => {
  const experiment = await Experiment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (experiment) experiment.normalizeWeights();
  await experiment?.save();
  res.json({ experiment });
});

router.delete('/admin/:id', auth, admin, async (req, res) => {
  await Experiment.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;