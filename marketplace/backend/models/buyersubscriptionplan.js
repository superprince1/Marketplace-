const mongoose = require('mongoose');

const BuyerSubscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Premium Monthly", "Premium Yearly"
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 }, // amount in cents (or dollars, but consistent)
    currency: { type: String, default: 'usd' },
    interval: { type: String, enum: ['month', 'year'], required: true },
    intervalCount: { type: Number, default: 1 }, // e.g., every 3 months? but simple for now
    stripePriceId: { type: String, required: true }, // Stripe Price ID (created manually or via API)
    perks: {
      freeShipping: { type: Boolean, default: false },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 }, // e.g., 10% off all orders
      exclusiveAccess: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BuyerSubscriptionPlan', BuyerSubscriptionPlanSchema);