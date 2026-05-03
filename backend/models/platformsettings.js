const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Pro Seller"
  priceMonthly: { type: Number, required: true },
  commissionRate: { type: Number, required: true, min: 0, max: 100 },
  maxProducts: { type: Number, default: 0 }, // 0 = unlimited
  features: [String],
  isActive: { type: Boolean, default: true },
});

const PlatformSettingsSchema = new mongoose.Schema({
  // ===== Commission per sale =====
  enableCommission: { type: Boolean, default: true },
  commissionRate: { type: Number, default: 10, min: 0, max: 100 },

  // ===== Listing fees =====
  enableListingFee: { type: Boolean, default: false },
  listingFeeAmount: { type: Number, default: 0.5 }, // per product

  // ===== Promoted listings =====
  enablePromotedListings: { type: Boolean, default: false },
  promotedPricePerDay: { type: Number, default: 5 },

  // ===== Subscription plans (alternative to commission) =====
  enableSubscriptions: { type: Boolean, default: false },
  subscriptionPlans: [SubscriptionPlanSchema],

  // ===== Transaction fee markup =====
  enableTransactionFee: { type: Boolean, default: false },
  transactionFeePercent: { type: Number, default: 1 }, // extra % on top of gateway fee

  // ===== Shipping fee markup =====
  enableShippingMarkup: { type: Boolean, default: false },
  shippingMarkupAmount: { type: Number, default: 1 }, // flat per shipment

  // ===== Advertising banner (homepage) =====
  enableAdvertisingBanner: { type: Boolean, default: false },
  bannerHtml: { type: String, default: '' },
  bannerImage: { type: String, default: '' },
  bannerLink: { type: String, default: '' },

  // ===== Lead generation (email export) =====
  enableLeadGeneration: { type: Boolean, default: false },
  leadExportPrice: { type: Number, default: 99 }, // price for CSV export

  // ===== Withdrawal / payout fees =====
  enableWithdrawalFee: { type: Boolean, default: false },
  withdrawalFeeFixed: { type: Number, default: 1 },
  withdrawalFeePercent: { type: Number, default: 0 },

  // ===== Premium shop features (one‑time) =====
  enablePremiumShop: { type: Boolean, default: false },
  premiumShopPrice: { type: Number, default: 49 },
  premiumShopFeatures: [String],

  // ===== Abandoned cart emails =====
  enableAbandonedCartEmails: { type: Boolean, default: true },
  abandonedCartDelayHours: { type: Number, default: 1, min: 1, max: 72 },

  // ===== Cash on Delivery Monetization =====
  enableCodFee: { type: Boolean, default: false },
  codFeeType: { type: String, enum: ['flat', 'percent'], default: 'flat' },
  codFeeFlat: { type: Number, default: 2 },
  codFeePercent: { type: Number, default: 3, min: 0, max: 20 },
  enableCodCommission: { type: Boolean, default: false },
  codCommissionRate: { type: Number, default: 15, min: 0, max: 100 },
  enableCodHandlingFee: { type: Boolean, default: false },
  codHandlingFeeAmount: { type: Number, default: 2 },

  // ===== Fraud Detection =====
  enableFraudDetection: { type: Boolean, default: true },
  fraudScoreThreshold: { type: Number, default: 25, min: 0, max: 100 },

  // ===== Custom Domain Monetization =====
  enableCustomDomainFee: { type: Boolean, default: false },
  customDomainPrice: { type: Number, default: 19.99, min: 0 },

  // ========== TAX AUTOMATION (TaxJar / Avalara) ==========
  taxAutomation: {
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ['taxjar', 'avalara', 'none'], default: 'none' },
    apiKey: { type: String, default: '' },
    apiSecret: { type: String, default: '' }, // for Avalara
    fallbackRate: { type: Number, default: 8.0 }, // percentage (e.g., 8 = 8%)
    addressValidationEnabled: { type: Boolean, default: false },
    nexusAddresses: [{
      country: { type: String, default: 'US' },
      state: String,
      zipCode: String,
      city: String,
      street: String,
    }],
  },
}, { timestamps: true });

// Singleton helper – returns the single settings document (creates if none)
PlatformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('PlatformSettings', PlatformSettingsSchema);