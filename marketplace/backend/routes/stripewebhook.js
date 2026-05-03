const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const BuyerSubscription = require('../models/BuyerSubscription');
const BuyerSubscriptionPlan = require('../models/BuyerSubscriptionPlan');
const User = require('../models/User');
const { notifyUser } = require('../services/notificationService');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      // Session contains metadata: userId, planId
      const { userId, planId } = session.metadata;
      const subscriptionId = session.subscription;
      const customerId = session.customer;
      // Fetch subscription details from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      const plan = await BuyerSubscriptionPlan.findById(planId);
      if (!plan) break;
      // Save to database
      const buyerSub = new BuyerSubscription({
        userId,
        planId,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      });
      await buyerSub.save();
      // Notify user
      await notifyUser(userId, 'subscription', 'Subscription activated', `Your ${plan.name} subscription is now active.`, '/buyer-subscription');
      break;
    }
    case 'customer.subscription.updated': {
      const stripeSubscription = event.data.object;
      const subscription = await BuyerSubscription.findOne({ stripeSubscriptionId: stripeSubscription.id });
      if (!subscription) break;
      subscription.status = stripeSubscription.status;
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
      if (stripeSubscription.canceled_at) {
        subscription.canceledAt = new Date(stripeSubscription.canceled_at * 1000);
      }
      await subscription.save();
      if (stripeSubscription.status === 'past_due') {
        await notifyUser(subscription.userId, 'subscription', 'Payment issue', 'Your subscription payment is past due. Please update your payment method.', '/buyer-subscription');
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const stripeSubscription = event.data.object;
      const subscription = await BuyerSubscription.findOne({ stripeSubscriptionId: stripeSubscription.id });
      if (subscription) {
        subscription.status = 'canceled';
        await subscription.save();
        await notifyUser(subscription.userId, 'subscription', 'Subscription canceled', 'Your subscription has been canceled.', '/buyer-subscription');
      }
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  res.json({ received: true });
});

module.exports = router;