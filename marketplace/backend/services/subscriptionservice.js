const BuyerSubscription = require('../models/BuyerSubscription');
const BuyerSubscriptionPlan = require('../models/BuyerSubscriptionPlan');

/**
 * Get active subscription for a user
 * @param {string} userId
 * @returns {Promise<Object|null>} Subscription object with plan details
 */
async function getUserActiveSubscription(userId) {
  const subscription = await BuyerSubscription.findOne({
    userId,
    status: 'active',
    currentPeriodEnd: { $gt: new Date() },
  }).populate('planId');
  return subscription;
}

/**
 * Apply subscription perks to cart totals
 * @param {Object} cart - cart object with subtotal, shipping, etc.
 * @param {Object} subscription - subscription document with populated planId
 * @returns {Object} modified cart totals
 */
async function applySubscriptionPerks(cart, subscription) {
  if (!subscription || !subscription.planId) return cart;

  const perks = subscription.planId.perks;
  let discountedSubtotal = cart.subtotal;
  if (perks.discountPercent > 0) {
    discountedSubtotal = cart.subtotal * (1 - perks.discountPercent / 100);
  }
  let shippingCost = cart.shippingCost;
  if (perks.freeShipping) {
    shippingCost = 0;
  }
  return {
    ...cart,
    subtotal: discountedSubtotal,
    shippingCost,
    total: discountedSubtotal + cart.tax + shippingCost,
    subscriptionDiscount: cart.subtotal - discountedSubtotal,
  };
}

module.exports = { getUserActiveSubscription, applySubscriptionPerks };