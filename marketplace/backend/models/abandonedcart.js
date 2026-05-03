const mongoose = require('mongoose');

const AbandonedCartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  guestId: {
    type: String,
    index: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number,
    imageUrl: String,
    selectedVariations: mongoose.Schema.Types.Mixed,
  }],
  subtotal: Number,
  shippingCost: Number,
  tax: Number,
  total: Number,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7 * 24 * 60 * 60, // auto-delete after 7 days
  },
  remindedAt: Date,
  reminderCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('AbandonedCart', AbandonedCartSchema);