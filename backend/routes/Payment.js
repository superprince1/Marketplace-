// backend/routes/payment.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const Paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);
const CoinbaseCommerce = require('coinbase-commerce-node');
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Initialize Coinbase Commerce
const Client = CoinbaseCommerce.Client;
Client.init(process.env.COINBASE_API_KEY);
const resources = CoinbaseCommerce.resources;

// ========== HELPER FUNCTIONS ==========
const updateOrderPayment = async (orderId, transactionId = null) => {
  const updateData = { paymentStatus: 'paid', paidAt: new Date() };
  if (transactionId) updateData.paymentId = transactionId;
  await Order.findByIdAndUpdate(orderId, updateData);
};

// ========== STRIPE ==========
/**
 * Create Stripe Payment Intent
 * POST /api/payment/create-stripe-payment-intent
 */
router.post('/create-stripe-payment-intent', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // amount in cents
      currency: 'usd',
      metadata: { orderId: order._id.toString() },
      receipt_email: order.buyerInfo?.email,
    });
    
    res.json({ 
      clientSecret: paymentIntent.client_secret, 
      paymentIntentId: paymentIntent.id 
    });
  } catch (err) {
    console.error('Stripe payment intent error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Stripe Webhook
 * POST /api/payment/stripe-webhook
 */
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;
      await updateOrderPayment(orderId, paymentIntent.id);
      console.log(`✅ Order ${orderId} paid via Stripe (${paymentIntent.id})`);
      break;
    case 'payment_intent.payment_failed':
      console.log(`❌ Stripe payment failed: ${event.data.object.id}`);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  res.json({ received: true });
});

// ========== PAYPAL ==========
// Configure PayPal environment
let paypalEnvironment;
if (process.env.PAYPAL_MODE === 'live') {
  paypalEnvironment = new paypal.core.LiveEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
} else {
  paypalEnvironment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
}
const paypalClient = new paypal.core.PayPalHttpClient(paypalEnvironment);

/**
 * Create PayPal Order
 * POST /api/payment/create-paypal-order
 */
router.post('/create-paypal-order', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { 
          currency_code: 'USD', 
          value: order.total.toFixed(2) 
        },
        custom_id: orderId,
      }],
      application_context: {
        return_url: `${process.env.CLIENT_URL}/payment-success`,
        cancel_url: `${process.env.CLIENT_URL}/payment-failed`,
      },
    });
    const response = await paypalClient.execute(request);
    res.json({ orderID: response.result.id });
  } catch (err) {
    console.error('PayPal order creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Capture PayPal Order (after approval)
 * POST /api/payment/capture-paypal-order
 */
router.post('/capture-paypal-order', auth, async (req, res) => {
  try {
    const { orderID, orderId } = req.body;
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    const response = await paypalClient.execute(request);
    
    if (response.result.status === 'COMPLETED') {
      const transactionId = response.result.purchase_units[0].payments.captures[0].id;
      await updateOrderPayment(orderId, transactionId);
      res.json({ success: true, transactionId });
    } else {
      res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (err) {
    console.error('PayPal capture error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PayPal Webhook (optional)
 * POST /api/payment/paypal-webhook
 */
router.post('/paypal-webhook', express.json(), async (req, res) => {
  const event = req.body;
  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const transactionId = event.resource.id;
    const customId = event.resource.custom_id; // orderId
    if (customId) await updateOrderPayment(customId, transactionId);
  }
  res.json({ received: true });
});

// ========== PAYSTACK ==========
/**
 * Initialize Paystack Transaction
 * POST /api/payment/initialize-paystack
 */
router.post('/initialize-paystack', auth, async (req, res) => {
  try {
    const { orderId, email } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const response = await Paystack.transaction.initialize({
      amount: Math.round(order.total * 100), // amount in kobo (cents)
      email,
      metadata: { orderId: order._id.toString() },
      callback_url: `${process.env.CLIENT_URL}/payment-verify?orderId=${orderId}`,
    });
    
    if (response.status) {
      // Store reference temporarily (you might want to save in order)
      res.json({ 
        authorizationUrl: response.data.authorization_url, 
        reference: response.data.reference 
      });
    } else {
      throw new Error(response.message);
    }
  } catch (err) {
    console.error('Paystack initialization error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Verify Paystack Transaction (callback)
 * GET /api/payment/verify-paystack
 */
router.get('/verify-paystack', async (req, res) => {
  const { reference, orderId } = req.query;
  if (!reference || !orderId) {
    return res.redirect(`${process.env.CLIENT_URL}/payment-failed`);
  }
  
  try {
    const response = await Paystack.transaction.verify(reference);
    if (response.data.status === 'success') {
      await updateOrderPayment(orderId, reference);
      res.redirect(`${process.env.CLIENT_URL}/payment-success?orderId=${orderId}`);
    } else {
      res.redirect(`${process.env.CLIENT_URL}/payment-failed`);
    }
  } catch (err) {
    console.error('Paystack verification error:', err);
    res.redirect(`${process.env.CLIENT_URL}/payment-failed`);
  }
});

// ========== COINBASE COMMERCE (CRYPTO) ==========
/**
 * Create Coinbase Charge
 * POST /api/payment/create-coinbase-charge
 */
router.post('/create-coinbase-charge', auth, async (req, res) => {
  try {
    const { orderId, name, email } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const chargeData = {
      name: `Order #${order.orderNumber}`,
      description: `Marketplace order ${order.orderNumber}`,
      pricing_type: 'fixed_price',
      local_price: { 
        amount: order.total.toFixed(2), 
        currency: 'USD' 
      },
      metadata: { 
        orderId: order._id.toString(),
        customerEmail: email 
      },
      redirect_url: `${process.env.CLIENT_URL}/payment-success?orderId=${orderId}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-failed`,
    };
    
    const charge = await resources.Charge.create(chargeData);
    res.json({ 
      hostedUrl: charge.hosted_url, 
      chargeId: charge.id,
      chargeCode: charge.code 
    });
  } catch (err) {
    console.error('Coinbase charge error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Coinbase Webhook
 * POST /api/payment/coinbase-webhook
 */
router.post('/coinbase-webhook', express.json(), async (req, res) => {
  const event = req.body;
  
  // Coinbase sends events: charge:created, charge:confirmed, charge:failed, etc.
  if (event.type === 'charge:confirmed') {
    const orderId = event.data.metadata.orderId;
    const chargeId = event.data.id;
    await updateOrderPayment(orderId, chargeId);
    console.log(`✅ Crypto payment confirmed for order ${orderId}`);
  }
  
  res.json({ received: true });
});

module.exports = router;