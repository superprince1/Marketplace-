const mongoose = require('mongoose');

const BundleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 },
  }],
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true }, // e.g., 15 for 15% or $10
  isActive: { type: Boolean, default: true },
  startDate: Date,
  endDate: Date,
  image: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bundle', BundleSchema);