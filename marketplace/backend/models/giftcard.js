const mongoose = require('mongoose');

const GiftCardSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    remainingBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    recipientName: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    expiryDate: {
      type: Date,
      default: null, // null = never expires
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usedOrders: [
      {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        amountUsed: Number,
        usedAt: { type: Date, default: Date.now },
      },
    ],
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Generate a unique gift card code before saving
GiftCardSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };
  let code = generateCode();
  let existing = await mongoose.model('GiftCard').findOne({ code });
  while (existing) {
    code = generateCode();
    existing = await mongoose.model('GiftCard').findOne({ code });
  }
  this.code = code;
  this.remainingBalance = this.originalAmount;
  next();
});

// Virtual: check if expired
GiftCardSchema.virtual('isExpired').get(function () {
  return this.expiryDate ? new Date() > this.expiryDate : false;
});

// Virtual: available balance (non-expired, active)
GiftCardSchema.virtual('availableBalance').get(function () {
  if (!this.isActive || this.isExpired) return 0;
  return this.remainingBalance;
});

module.exports = mongoose.model('GiftCard', GiftCardSchema);