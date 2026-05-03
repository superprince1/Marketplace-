const mongoose = require('mongoose');

const BuyerSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerSubscriptionPlan', required: true },
    stripeSubscriptionId: { type: String, required: true }, // Stripe Subscription ID
    stripeCustomerId: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'],
      default: 'active',
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: Date,
    trialStart: Date,
    trialEnd: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  },
  { timestamps: true }
);

// Virtual: check if subscription is active (active status and not expired)
BuyerSubscriptionSchema.virtual('isActive').get(function () {
  return this.status === 'active' && this.currentPeriodEnd > new Date();
});

module.exports = mongoose.model('BuyerSubscription', BuyerSubscriptionSchema);