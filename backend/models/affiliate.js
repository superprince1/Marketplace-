const mongoose = require('mongoose');

/**
 * Affiliate Schema
 * 
 * Tracks affiliates (users who refer customers) and their earnings.
 * Now supports:
 * - Tiered commission rates (Bronze/Silver/Gold) via AffiliateTier model
 * - Custom commission override per affiliate
 * - Automatic tier upgrade based on conversions/earnings
 * - Integration with AffiliateCoupon and AffiliateResource
 */
const AffiliateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    affiliateCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    
    // ========== COMMISSION & EARNINGS ==========
    // Base commission rate (used if no tier and no override)
    commissionRate: {
      type: Number,
      default: 5, // percentage
      min: 0,
      max: 50,
    },
    // Override commission rate (if set, this takes precedence over tier)
    customCommissionRate: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    // Reference to the current tier (Bronze, Silver, Gold)
    tierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AffiliateTier',
      default: null,
    },
    
    // Earnings tracking
    totalEarnings: {
      type: Number,
      default: 0,
    },
    paidEarnings: {
      type: Number,
      default: 0,
    },
    pendingEarnings: {
      type: Number,
      default: 0,
    },
    
    // Performance metrics
    clicks: {
      type: Number,
      default: 0,
    },
    conversions: {
      type: Number,
      default: 0,
    }, // number of referred orders
    totalOrdersValue: {
      type: Number,
      default: 0,
    }, // total value of referred orders (without commission)
    
    // ========== STATUS ==========
    isActive: {
      type: Boolean,
      default: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    
    // ========== PAYMENT DETAILS ==========
    paymentMethod: {
      type: String,
      enum: ['paypal', 'bank', 'crypto', ''],
      default: '',
    },
    paymentEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      routingNumber: String,
    },
    
    // ========== LAST NOTIFICATION ==========
    lastTierUpgradeNotified: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========== INDEXES ==========
AffiliateSchema.index({ affiliateCode: 1 });
AffiliateSchema.index({ userId: 1 });
AffiliateSchema.index({ conversions: -1 });
AffiliateSchema.index({ tierId: 1 });

// ========== PRE-SAVE HOOK ==========
// Generate a unique affiliate code if not provided
AffiliateSchema.pre('save', async function (next) {
  if (!this.affiliateCode) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(this.userId.toString()).digest('hex').substring(0, 8);
    this.affiliateCode = `REF${hash.toUpperCase()}`;
    // Ensure uniqueness
    let existing = await mongoose.model('Affiliate').findOne({ affiliateCode: this.affiliateCode });
    let suffix = 1;
    while (existing) {
      this.affiliateCode = `REF${hash.toUpperCase()}${suffix}`;
      existing = await mongoose.model('Affiliate').findOne({ affiliateCode: this.affiliateCode });
      suffix++;
    }
  }
  next();
});

// ========== INSTANCE METHODS ==========

/**
 * Get the effective commission rate for this affiliate.
 * Priority: customCommissionRate > tier.commissionRate > commissionRate.
 * @returns {Promise<number>}
 */
AffiliateSchema.methods.getEffectiveCommissionRate = async function () {
  if (this.customCommissionRate !== null && this.customCommissionRate !== undefined) {
    return this.customCommissionRate;
  }
  if (this.tierId) {
    const tier = await mongoose.model('AffiliateTier').findById(this.tierId);
    if (tier) return tier.commissionRate;
  }
  return this.commissionRate;
};

/**
 * Update affiliate tier based on current conversions and totalEarnings.
 * Fetches the highest tier for which affiliate meets minConversions and minEarnings.
 * @returns {Promise<boolean>} true if tier changed
 */
AffiliateSchema.methods.updateTier = async function () {
  const AffiliateTier = mongoose.model('AffiliateTier');
  const tiers = await AffiliateTier.find({ isActive: true }).sort('minConversions');
  let newTier = null;
  for (const tier of tiers) {
    if (this.conversions >= tier.minConversions && 
        (tier.minEarnings === 0 || this.totalEarnings >= tier.minEarnings)) {
      newTier = tier;
    } else {
      break;
    }
  }
  if (newTier && (!this.tierId || this.tierId.toString() !== newTier._id.toString())) {
    this.tierId = newTier._id;
    await this.save();
    return true;
  }
  return false;
};

/**
 * Add earnings from a referred order.
 * @param {number} orderTotal - Total value of the order
 * @param {number} commissionRate - Effective commission rate (already calculated)
 */
AffiliateSchema.methods.addEarnings = async function (orderTotal, commissionRate) {
  const commission = (orderTotal * commissionRate) / 100;
  this.pendingEarnings += commission;
  this.totalEarnings += commission;
  this.conversions += 1;
  this.totalOrdersValue += orderTotal;
  await this.save();
  // Check for tier upgrade after earnings update
  await this.updateTier();
  return commission;
};

/**
 * Mark a payout as processed (admin action)
 * @param {number} amount - Amount to mark as paid (deducts from pending)
 */
AffiliateSchema.methods.processPayout = async function (amount) {
  if (amount > this.pendingEarnings) throw new Error('Amount exceeds pending earnings');
  this.pendingEarnings -= amount;
  this.paidEarnings += amount;
  await this.save();
};

/**
 * Generate a referral link (with affiliate code)
 * @param {string} baseUrl - e.g., https://marketplace.com
 * @param {string} destinationPath - e.g., '/product/iphone'
 * @returns {string}
 */
AffiliateSchema.methods.getReferralLink = function (baseUrl, destinationPath = '') {
  return `${baseUrl}/api/affiliate/go/${this.affiliateCode}?url=${encodeURIComponent(destinationPath)}`;
};

// ========== STATIC METHODS ==========

/**
 * Find or create affiliate record for a user.
 * @param {string} userId
 * @returns {Promise<Affiliate>}
 */
AffiliateSchema.statics.findOrCreate = async function (userId) {
  let affiliate = await this.findOne({ userId });
  if (!affiliate) {
    affiliate = new this({ userId });
    await affiliate.save();
  }
  return affiliate;
};

/**
 * Get top affiliates by earnings or conversions.
 * @param {string} sortBy - 'earnings' or 'conversions'
 * @param {number} limit
 */
AffiliateSchema.statics.getTopAffiliates = function (sortBy = 'earnings', limit = 10) {
  const sortField = sortBy === 'earnings' ? { totalEarnings: -1 } : { conversions: -1 };
  return this.find({ isActive: true }).sort(sortField).limit(limit).populate('userId', 'name email');
};

// ========== VIRTUAL PROPERTIES ==========
AffiliateSchema.virtual('referralLink').get(function () {
  const baseUrl = process.env.CLIENT_URL || 'https://yourdomain.com';
  return `${baseUrl}/api/affiliate/go/${this.affiliateCode}`;
});

AffiliateSchema.virtual('effectiveCommissionRate').get(async function () {
  return await this.getEffectiveCommissionRate();
});

module.exports = mongoose.model('Affiliate', AffiliateSchema);