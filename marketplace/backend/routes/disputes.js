const express = require('express');
const router = express.Router();
const Dispute = require('../models/Dispute');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { notifyUser } = require('../services/notificationService');

// Buyer: open a dispute
router.post('/', auth, async (req, res) => {
  try {
    const { orderId, reason, description, evidence } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    // Check if already has a dispute
    const existing = await Dispute.findOne({ orderId, status: { $ne: 'cancelled' } });
    if (existing) return res.status(400).json({ error: 'A dispute already exists for this order' });

    const dispute = new Dispute({
      orderId,
      buyerId: req.user.id,
      sellerId: order.items[0].sellerId,
      reason,
      description,
      evidence: evidence || [],
    });
    await dispute.save();

    // Notify admin (optional) and seller
    await notifyUser(order.items[0].sellerId, 'system', 'Dispute opened', `A buyer opened a dispute for order ${order.orderNumber}`, `/admin/disputes/${dispute._id}`);

    res.status(201).json({ success: true, dispute });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buyer: add evidence to existing dispute
router.put('/:id/evidence', auth, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    if (dispute.buyerId.toString() !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    const { evidence } = req.body;
    dispute.evidence.push(...evidence);
    await dispute.save();
    res.json({ success: true, dispute });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buyer: cancel dispute (only if still open)
router.delete('/:id/cancel', auth, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    if (dispute.buyerId.toString() !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    if (dispute.status !== 'open') return res.status(400).json({ error: 'Dispute cannot be cancelled' });
    dispute.status = 'cancelled';
    await dispute.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get buyer's disputes
router.get('/my', auth, async (req, res) => {
  const disputes = await Dispute.find({ buyerId: req.user.id }).populate('orderId', 'orderNumber total');
  res.json({ success: true, disputes });
});

// Seller: get disputes where they are seller
router.get('/seller', auth, async (req, res) => {
  const sellerId = req.user.id;
  const disputes = await Dispute.find({ sellerId }).populate('orderId', 'orderNumber total').populate('buyerId', 'name email');
  res.json({ success: true, disputes });
});

// Admin: get all disputes
router.get('/admin/all', auth, admin, async (req, res) => {
  const disputes = await Dispute.find().populate('orderId', 'orderNumber total').populate('buyerId', 'name email').populate('sellerId', 'name email');
  res.json({ success: true, disputes });
});

// Admin: update dispute (resolve, add notes)
router.put('/admin/:id', auth, admin, async (req, res) => {
  try {
    const { status, resolution, resolutionNote, refundAmount } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    dispute.status = status || dispute.status;
    dispute.resolution = resolution;
    dispute.resolutionNote = resolutionNote;
    dispute.refundAmount = refundAmount;
    dispute.resolvedBy = req.user.id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    // If resolution is refund, we would need to trigger a refund via payment gateway.
    // For now, notify buyer and seller.
    await notifyUser(dispute.buyerId, 'system', `Dispute resolved for order #${dispute.orderId.orderNumber}`, resolutionNote || `Status: ${status}`, `/orders/${dispute.orderId._id}`);
    await notifyUser(dispute.sellerId, 'system', `Dispute resolved for order #${dispute.orderId.orderNumber}`, resolutionNote || `Status: ${status}`, `/seller/orders/${dispute.orderId._id}`);

    res.json({ success: true, dispute });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;