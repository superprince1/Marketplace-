const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Webhook = require('../models/Webhook');
const { dispatchEvent } = require('../services/webhookService');

// GET all webhooks
router.get('/webhooks', auth, admin, async (req, res) => {
  try {
    const webhooks = await Webhook.find().sort({ createdAt: -1 });
    res.json({ success: true, webhooks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single webhook
router.get('/webhooks/:id', auth, admin, async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    res.json({ success: true, webhook });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE webhook
router.post('/webhooks', auth, admin, async (req, res) => {
  try {
    const { name, url, events, secret } = req.body;
    const webhook = new Webhook({
      name,
      url,
      events,
      secret: secret || require('crypto').randomBytes(32).toString('hex'),
    });
    await webhook.save();
    res.status(201).json({ success: true, webhook });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE webhook
router.put('/webhooks/:id', auth, admin, async (req, res) => {
  try {
    const updates = req.body;
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    Object.assign(webhook, updates);
    await webhook.save();
    res.json({ success: true, webhook });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE webhook
router.delete('/webhooks/:id', auth, admin, async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndDelete(req.params.id);
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEST webhook (send a test event)
router.post('/webhooks/:id/test', auth, admin, async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook from your marketplace.',
    };
    const signature = require('crypto')
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(testPayload))
      .digest('hex');
    const axios = require('axios');
    await axios.post(webhook.url, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': 'test',
        'X-Webhook-Signature': signature,
      },
      timeout: 10000,
    });
    res.json({ success: true, message: 'Test webhook sent successfully' });
  } catch (err) {
    res.status(500).json({ error: `Test failed: ${err.message}` });
  }
});

module.exports = router;