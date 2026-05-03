const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: String,
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscountAmount: Number,
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // empty = all
  applicableCategories: [String],
  isActive: { type: Boolean, default: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = global admin coupon
}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);