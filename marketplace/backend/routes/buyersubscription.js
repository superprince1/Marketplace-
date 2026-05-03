const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const auth = require('../middleware/auth');
const BuyerSubscriptionPlan = require('../models/BuyerSubscriptionPlan');
const BuyerSubscription = require('../models/BuyerSubscription');
const User = require('../models/User');
const { getUserActiveSubscription } = require('../services/subscriptionService');

// GET /api/buyer-subscription/plans – list available plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await BuyerSubscriptionPlan.find({ isActive: true }).sort('sortOrder');
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/buyer-subscription/create-checkout – create Stripe Checkout Session
router.post('/create-checkout', auth, async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const plan = await BuyerSubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const user = await User.findById(req.user.id);
    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl || `${process.env.CLIENT_URL}/buyer-subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.CLIENT_URL}/buyer-subscription`,
      metadata: { userId: user._id.toString(), planId: plan._id.toString() },
    });
    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/buyer-subscription/current – get current user's subscription
router.get('/current', auth, async (req, res) => {
  try {
    const subscription = await getUserActiveSubscription(req.user.id);
    res.json({ success: true, subscription });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/buyer-subscription/cancel – cancel subscription at period end
router.post('/cancel', auth, async (req, res) => {
  try {
    const subscription = await BuyerSubscription.findOne({ userId: req.user.id, status: 'active' });
    if (!subscription) return res.status(404).json({ error: 'No active subscription' });
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
    subscription.cancelAtPeriodEnd = true;
    await subscription.save();
    res.json({ success: true, message: 'Subscription will be canceled at the end of the period' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/buyer-subscription/reactivate – reactivate a subscription that was set to cancel
router.post('/reactivate', auth, async (req, res) => {
  try {
    const subscription = await BuyerSubscription.findOne({ userId: req.user.id, cancelAtPeriodEnd: true });
    if (!subscription) return res.status(404).json({ error: 'No subscription pending cancellation' });
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: false });
    subscription.cancelAtPeriodEnd = false;
    await subscription.save();
    res.json({ success: true, message: 'Subscription reactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;