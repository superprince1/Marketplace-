const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const Paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);
const { CoinbaseCommerce } = require('coinbase-commerce-node');
const { addEarningsToSeller, addAffiliateCommission } = require('../utils/paymentUtils');

// Stripe webhook
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;
    const order = await Order.findById(orderId);
    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.paymentGateway = 'stripe';
      order.paymentId = session.payment_intent;
      order.paidAt = new Date();
      order.status = 'processing';
      await order.save();
      // Credit seller and affiliate
      await addEarningsToSeller(order);
      await addAffiliateCommission(order);
    }
  }
  res.json({ received: true });
});

// PayPal webhook (simplified – you'd verify the webhook signature)
router.post('/paypal', express.json(), async (req, res) => {
  const event = req.body;
  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const orderId = event.resource.custom_id || event.resource.reference_id;
    const order = await Order.findById(orderId);
    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.paymentGateway = 'paypal';
      order.paymentId = event.resource.id;
      order.paidAt = new Date();
      order.status = 'processing';
      await order.save();
      await addEarningsToSeller(order);
      await addAffiliateCommission(order);
    }
  }
  res.json({ received: true });
});

// Paystack webhook
router.post('/paystack', express.json(), async (req, res) => {
  const event = req.body;
  if (event.event === 'charge.success') {
    const reference = event.data.reference;
    const order = await Order.findOne({ paymentGatewayReference: reference });
    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.paymentGateway = 'paystack';
      order.paymentId = reference;
      order.paidAt = new Date();
      order.status = 'processing';
      await order.save();
      await addEarningsToSeller(order);
      await addAffiliateCommission(order);
    }
  }
  res.json({ received: true });
});

// Coinbase webhook
router.post('/coinbase', express.json(), async (req, res) => {
  const event = req.body;
  if (event.type === 'charge:confirmed') {
    const chargeId = event.data.id;
    const order = await Order.findOne({ paymentGatewayReference: chargeId });
    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.paymentGateway = 'coinbase';
      order.paymentId = chargeId;
      order.paidAt = new Date();
      order.status = 'processing';
      await order.save();
      await addEarningsToSeller(order);
      await addAffiliateCommission(order);
    }
  }
  res.json({ received: true });
});

module.exports = router;