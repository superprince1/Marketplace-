const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PlatformSettings = require('../models/PlatformSettings');
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/subscription/plans
 * @desc    Get all active subscription plans
 * @access  Public
 */
router.get('/plans', async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const activePlans = settings.subscriptionPlans.filter(p => p.isActive);
    res.json({ success: true, plans: activePlans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/subscription/subscribe/:planId
 * @desc    Create Stripe Checkout session for subscription
 * @access  Private (Seller)
 */
router.post('/subscribe/:planId', auth, async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    if (!settings.enableSubscriptions) {
      return res.status(400).json({ error: 'Subscriptions are disabled' });
    }

    const plan = settings.subscriptionPlans.id(req.params.planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: 'Plan not found or inactive' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Marketplace Seller Plan: ${plan.name}`,
            description: plan.features?.join(', ') || '',
          },
          unit_amount: Math.round(plan.priceMonthly * 100), // in cents
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: `${process.env.CLIENT_URL}/seller/subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/seller/subscription?canceled=true`,
      metadata: {
        userId: user._id.toString(),
        planId: plan._id.toString(),
      },
    });

    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/subscription/webhook
 * @desc    Stripe webhook to handle subscription events
 * @access  Public (but verified by Stripe signature)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, planId } = session.metadata;
      const user = await User.findById(userId);
      if (user) {
        // Store Stripe subscription ID for future updates/cancellation
        const subscriptionId = session.subscription;
        user.subscription = {
          planId: planId,
          stripeSubscriptionId: subscriptionId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isActive: true,
        };
        await user.save();
      }
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      // Update end date, cancel status, etc.
      // Find user by stripeSubscriptionId
      const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
      if (user) {
        if (subscription.status === 'active') {
          user.subscription.isActive = true;
          user.subscription.endDate = new Date(subscription.current_period_end * 1000);
        } else if (subscription.status === 'canceled' || subscription.status === 'past_due') {
          user.subscription.isActive = false;
        }
        await user.save();
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
      if (user) {
        user.subscription.isActive = false;
        await user.save();
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * @route   GET /api/subscription/current
 * @desc    Get current user's subscription status
 * @access  Private
 */
router.get('/current', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const settings = await PlatformSettings.getSettings();
    let planDetails = null;
    if (user.subscription?.planId) {
      const plan = settings.subscriptionPlans.id(user.subscription.planId);
      if (plan) planDetails = plan;
    }
    res.json({
      success: true,
      subscription: user.subscription,
      plan: planDetails,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/subscription/cancel
 * @desc    Cancel current user's subscription (at period end)
 * @access  Private
 */
router.post('/cancel', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.subscription?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }
    // Cancel at period end in Stripe
    await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    // Update local record (optional)
    user.subscription.cancelAtPeriodEnd = true;
    await user.save();
    res.json({ success: true, message: 'Subscription will be cancelled at the end of the billing period.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;