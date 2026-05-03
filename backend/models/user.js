const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * User Schema for Marketplace
 * Supports buyers, sellers, and admins
 * Includes wishlist, chat, monetization (balance, subscriptions, premium shop),
 * STORE CREDIT (for gift cards / buyer credit),
 * GDPR / PRIVACY deletion request fields,
 * and MULTI‑LANGUAGE (i18n) language preference.
 */
const UserSchema = new mongoose.Schema(
  {
    // ========== BASIC INFO ==========
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer',
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: 'default-avatar.png',
    },
    phone: {
      type: String,
      match: [/^[0-9]{10,15}$/, 'Please add a valid phone number'],
      required: false,
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String, default: 'USA' },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // ========== WISHLIST & CHAT ==========
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    conversations: [String],

    // ========== MONETIZATION FIELDS (for sellers) ==========
    balance: {
      type: Number,
      default: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    pendingWithdrawal: {
      type: Number,
      default: 0,
    },
    subscription: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
      startDate: Date,
      endDate: Date,
      isActive: { type: Boolean, default: false },
    },
    premiumShopPurchased: { type: Boolean, default: false },
    premiumShopPurchasedAt: Date,

    // ========== STORE CREDIT (for buyers / gift cards) ==========
    storeCredit: {
      type: Number,
      default: 0,
      min: 0,
    },
    storeCreditHistory: [
      {
        amount: { type: Number, required: true },
        type: {
          type: String,
          enum: ['gift_card_redemption', 'admin_adjustment', 'refund', 'order_application'],
          required: true,
        },
        description: { type: String, default: '' },
        giftCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'GiftCard' },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // for order applications
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ========== GDPR / PRIVACY FIELDS ==========
    deletionRequestedAt: {
      type: Date,
      default: null,
    },
    deletionScheduledFor: {
      type: Date,
      default: null,
    },

    // ========== MULTI‑LANGUAGE PREFERENCE ==========
    preferredLanguage: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja'],
      description: 'User’s preferred language code (ISO 639‑1)',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========== MIDDLEWARE ==========
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.pre('remove', async function (next) {
  if (this.role === 'seller') {
    await this.model('Product').deleteMany({ sellerId: this._id });
  }
  next();
});

// ========== INSTANCE METHODS ==========
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, isAdmin: this.isAdmin },
    process.env.JWT_SECRET || 'secretkey',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Wishlist
UserSchema.methods.addToWishlist = async function (productId) {
  if (!this.wishlist.includes(productId)) {
    this.wishlist.push(productId);
    await this.save();
  }
  return this.wishlist;
};

UserSchema.methods.removeFromWishlist = async function (productId) {
  this.wishlist = this.wishlist.filter(id => id.toString() !== productId.toString());
  await this.save();
  return this.wishlist;
};

UserSchema.methods.isInWishlist = function (productId) {
  return this.wishlist.some(id => id.toString() === productId.toString());
};

// ========== BALANCE & WITHDRAWAL METHODS (for sellers) ==========
UserSchema.methods.addEarnings = async function (amount) {
  this.balance += amount;
  this.totalEarned += amount;
  await this.save();
};

UserSchema.methods.calculateWithdrawalFee = async function (amount) {
  const PlatformSettings = require('./PlatformSettings');
  const settings = await PlatformSettings.getSettings();
  if (!settings.enableWithdrawalFee) return 0;
  let fee = settings.withdrawalFeeFixed;
  fee += amount * (settings.withdrawalFeePercent / 100);
  return Math.min(fee, amount);
};

UserSchema.methods.requestWithdrawal = async function (amount) {
  const fee = await this.calculateWithdrawalFee(amount);
  const netAmount = amount - fee;
  if (netAmount <= 0) throw new Error('Withdrawal amount too small after fee');
  if (this.balance < amount) throw new Error('Insufficient balance');
  this.balance -= amount;
  this.pendingWithdrawal += netAmount;
  await this.save();
  return netAmount;
};

UserSchema.methods.completeWithdrawal = async function (amount) {
  this.pendingWithdrawal -= amount;
  await this.save();
};

// ========== SUBSCRIPTION METHODS ==========
UserSchema.methods.hasActiveSubscription = function () {
  return this.subscription.isActive && this.subscription.endDate > new Date();
};

UserSchema.methods.getEffectiveCommissionRate = async function () {
  const PlatformSettings = require('./PlatformSettings');
  const settings = await PlatformSettings.getSettings();
  if (!settings.enableCommission) return 0;
  if (this.hasActiveSubscription()) {
    const plan = settings.subscriptionPlans.id(this.subscription.planId);
    if (plan) return plan.commissionRate;
  }
  return settings.commissionRate;
};

// ========== STORE CREDIT METHODS (for buyers / gift cards) ==========
/**
 * Add store credit to user's account
 * @param {number} amount - Positive amount to add
 * @param {string} type - 'gift_card_redemption', 'admin_adjustment', or 'refund'
 * @param {string} description - Optional description
 * @param {ObjectId} giftCardId - Optional gift card ID
 * @returns {Promise<number>} New store credit balance
 */
UserSchema.methods.addStoreCredit = async function (amount, type, description = '', giftCardId = null) {
  if (amount <= 0) throw new Error('Amount must be positive');
  this.storeCredit += amount;
  this.storeCreditHistory.push({
    amount,
    type,
    description,
    giftCardId,
  });
  await this.save();
  return this.storeCredit;
};

/**
 * Use (deduct) store credit from user's account
 * @param {number} amount - Positive amount to deduct
 * @param {string} description - Optional description (e.g., order number)
 * @param {ObjectId} orderId - Order ID where credit was applied
 * @returns {Promise<number>} New store credit balance
 */
UserSchema.methods.useStoreCredit = async function (amount, description = '', orderId = null) {
  if (amount <= 0) throw new Error('Amount must be positive');
  if (amount > this.storeCredit) throw new Error('Insufficient store credit');
  this.storeCredit -= amount;
  this.storeCreditHistory.push({
    amount: -amount,
    type: 'order_application',
    description,
    orderId,
  });
  await this.save();
  return this.storeCredit;
};

// ========== STATIC METHODS ==========
UserSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.getAllSellers = function () {
  return this.find({ role: 'seller', isActive: true }).select(
    'name email avatar phone address balance totalEarned'
  );
};

// ========== VIRTUAL PROPERTIES ==========
UserSchema.virtual('fullAddress').get(function () {
  if (!this.address) return '';
  const { street, city, state, zipCode, country } = this.address;
  return `${street ? street + ', ' : ''}${city ? city + ', ' : ''}${
    state ? state + ' ' : ''
  }${zipCode ? zipCode + ', ' : ''}${country || ''}`;
});

UserSchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'sellerId',
  count: true,
});

module.exports = mongoose.model('User', UserSchema);