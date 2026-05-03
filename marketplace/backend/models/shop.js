/**
 * Shop Model – Represents a seller's storefront
 * Features:
 * - Custom URL slug (e.g., /shop/johns-electronics)
 * - Branding (logo, banner)
 * - Business policies (returns, shipping, payment)
 * - Social media links
 * - Contact information
 * - Custom domain (seller's own domain) with verification & monetization
 * 
 * ========== TRUST & REPUTATION BADGES (ADDED) ==========
 * - badges[]: array of earned badges (verified_seller, top_rated, etc.)
 * - metrics{}: cached performance data used to award badges
 */
const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema(
  {
    // ========== BASIC INFORMATION ==========
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    logo: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      maxlength: 5000,
      default: '',
    },
    policies: {
      returns: { type: String, default: '' },
      shipping: { type: String, default: '' },
      payment: { type: String, default: '' },
      privacy: { type: String, default: '' },
    },
    socialLinks: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ========== CUSTOM DOMAIN ==========
    customDomain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    domainVerified: {
      type: Boolean,
      default: false,
    },
    domainVerificationToken: {
      type: String,
    },

    // ========== CUSTOM DOMAIN MONETIZATION ==========
    customDomainPaid: {
      type: Boolean,
      default: false,
    },
    customDomainPaidAt: {
      type: Date,
    },
    customDomainPaymentId: {
      type: String,
    },

    // =============== SELLER TRUST & REPUTATION BADGES (NEW) ===============
    /**
     * badges: Array of earned trust badges.
     * Each badge contains:
     *  - name: enum of badge types
     *  - awardedAt: when the badge was first earned
     *  - expiresAt: optional expiration (for time‑limited badges)
     *  - metadata: extra info (e.g., reason for manual assignment)
     */
    badges: [
      {
        name: {
          type: String,
          enum: [
            'verified_seller',     // identity & shop verified
            'top_rated',           // high‑volume, high‑satisfaction
            'fast_shipping',       // average delivery < 2 days
            'on_time_shipping',    // ships orders on/before promised date
            'fast_responder',      // replies to messages within 1 hour average
            'pro_seller',          // 500+ orders, 97% completion
            'rising_star',         // new seller with excellent start
          ],
        },
        awardedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, default: null },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],

    /**
     * metrics: Cached performance numbers used by badgeService.
     * Updated daily by a cron job or triggered on significant events.
     */
    metrics: {
      totalOrders: { type: Number, default: 0 },
      completedOrders: { type: Number, default: 0 },
      cancelledOrders: { type: Number, default: 0 },
      disputeLost: { type: Number, default: 0 },        // disputes resolved against seller
      averageResponseTime: { type: Number, default: 0 }, // in hours
      averageShippingTime: { type: Number, default: 0 }, // in days (shipped → delivered)
      onTimeShipments: { type: Number, default: 0 },
      totalShipments: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========== VIRTUALS ==========
// Full shop URL (default path)
ShopSchema.virtual('shopUrl').get(function () {
  return `/shop/${this.slug}`;
});

// Convenience: check if shop has a specific badge
ShopSchema.virtual('hasBadge').get(function (badgeName) {
  return this.badges.some(b => b.name === badgeName);
});

// Convenience: list of active badge names (for quick display)
ShopSchema.virtual('activeBadgeNames').get(function () {
  return this.badges.map(b => b.name);
});

// ========== PRE‑SAVE MIDDLEWARE ==========
// Ensure slug is unique and URL‑friendly
ShopSchema.pre('save', async function (next) {
  if (this.isModified('slug')) {
    this.slug = this.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const existing = await mongoose.model('Shop').findOne({ slug: this.slug, _id: { $ne: this._id } });
    if (existing) {
      this.slug = `${this.slug}-${Date.now().toString().slice(-4)}`;
    }
  }
  next();
});

// ========== INSTANCE METHODS (for badge management) ==========
/**
 * Add a badge to the shop (if not already present)
 * @param {string} badgeName - one of the allowed badge names
 * @param {object} metadata - optional extra data
 * @returns {Promise<boolean>} true if added, false if already existed
 */
ShopSchema.methods.addBadge = async function (badgeName, metadata = {}) {
  if (!this.badges.some(b => b.name === badgeName)) {
    this.badges.push({ name: badgeName, metadata });
    await this.save();
    return true;
  }
  return false;
};

/**
 * Remove a badge from the shop
 * @param {string} badgeName
 * @returns {Promise<boolean>} true if removed, false if wasn't present
 */
ShopSchema.methods.removeBadge = async function (badgeName) {
  const initialLength = this.badges.length;
  this.badges = this.badges.filter(b => b.name !== badgeName);
  if (this.badges.length !== initialLength) {
    await this.save();
    return true;
  }
  return false;
};

/**
 * Refresh metrics (called by badgeService)
 * @param {object} newMetrics - calculated metrics object
 */
ShopSchema.methods.updateMetrics = async function (newMetrics) {
  this.metrics = { ...this.metrics, ...newMetrics };
  await this.save();
};

// ========== STATIC METHODS ==========
/**
 * Find all shops that have a particular badge
 * @param {string} badgeName
 * @returns {Query}
 */
ShopSchema.statics.findByBadge = function (badgeName) {
  return this.find({ 'badges.name': badgeName });
};

/**
 * Get top‑performing shops (by completed orders)
 * @param {number} limit
 * @returns {Query}
 */
ShopSchema.statics.getTopSellers = function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'metrics.completedOrders': -1 })
    .limit(limit)
    .populate('sellerId', 'name email');
};

module.exports = mongoose.model('Shop', ShopSchema);