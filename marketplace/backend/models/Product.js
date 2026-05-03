const mongoose = require('mongoose');

/**
 * Product Schema for Marketplace
 * Created by sellers, bought by buyers
 * Supports simple products, products with variations (size, color, material)
 * Promoted listings (monetization), digital products (files, license keys), geo‑location,
 * PRE‑ORDER / BACKORDER, TAX CODES (TaxJar/Avalara), and MULTI‑LANGUAGE (i18n) translations.
 */
const ProductSchema = new mongoose.Schema(
  {
    // ========== BASIC INFORMATION ==========
    name: {
      type: String,
      required: [true, 'Please add a product name'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: [0.01, 'Price must be at least 0.01'],
      max: [1000000, 'Price cannot exceed 1,000,000'],
    },
    comparePrice: {
      type: Number,
      min: 0,
      default: null,
      validate: {
        validator: function (val) {
          return val === null || val > this.price;
        },
        message: 'Compare price must be greater than regular price',
      },
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    shortDescription: {
      type: String,
      maxlength: [200, 'Short description max 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      enum: {
        values: [
          'Electronics',
          'Clothing',
          'Books',
          'Home & Garden',
          'Sports',
          'Toys',
          'Beauty',
          'Automotive',
          'Health',
          'Digital',
          'Other',
        ],
        message: '{VALUE} is not a supported category',
      },
    },

    // ========== IMAGES ==========
    images: [
      {
        url: { type: String, required: true },
        altText: { type: String, default: '' },
        isMain: { type: Boolean, default: false },
      },
    ],
    // Legacy / quick access main image URL
    imageUrl: {
      type: String,
      default: 'https://via.placeholder.com/300?text=No+Image',
    },

    // ========== INVENTORY (for physical products) ==========
    stock: {
      type: Number,
      required: [true, 'Please add stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },

    // ========== PRE‑ORDER / BACKORDER FIELDS ==========
    allowPreorder: {
      type: Boolean,
      default: false,
      description: 'Allow customers to order when stock is zero',
    },
    preorderStock: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Maximum preorder quantity (0 = unlimited)',
    },
    estimatedShipDate: {
      type: Date,
      default: null,
      description: 'Date when preordered items will be shipped',
    },
    preorderMessage: {
      type: String,
      default: 'This item is available for pre‑order. Your order will be shipped on or before the estimated date.',
    },

    // ========== DIGITAL PRODUCT FIELDS ==========
    isDigital: {
      type: Boolean,
      default: false,
    },
    downloadableFiles: [
      {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number },
        mimeType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    licenseKeys: [
      {
        key: { type: String, unique: true, sparse: true },
        isUsed: { type: Boolean, default: false },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        usedAt: Date,
      },
    ],
    maxDownloads: {
      type: Number,
      default: 3,
      min: 1,
      max: 100,
    },

    // ========== SELLER INFORMATION ==========
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Product must belong to a seller'],
    },
    sellerName: {
      type: String,
      required: true,
    },

    // ========== GEO‑LOCATION (for advanced search) ==========
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: false,
        index: '2dsphere', // MongoDB geo index
      },
      placeName: {
        type: String,
        trim: true,
      },
    },

    // ========== STATUS FLAGS ==========
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // ========== PROMOTED LISTINGS (Monetization) ==========
    isPromoted: {
      type: Boolean,
      default: false,
    },
    promotionEndDate: {
      type: Date,
      default: null,
    },
    promotionPricePaid: {
      type: Number,
      default: 0,
    },

    // ========== TAGS & SEO ==========
    tags: [String],

    // ========== TAX CODE (for TaxJar / Avalara) ==========
    taxCode: {
      type: String,
      default: null,
      description: 'Product tax code used by TaxJar/Avalara (e.g., "20010" for electronics)',
    },

    // ========== RATINGS & REVIEWS ==========
    ratings: {
      average: { type: Number, min: 0, max: 5, default: 0 },
      count: { type: Number, default: 0 },
    },

    // ========== SALES & ANALYTICS ==========
    soldCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },

    // ========== VARIATIONS (Size, Color, Material) ==========
    hasVariations: {
      type: Boolean,
      default: false,
    },
    variations: [
      {
        type: {
          type: String,
          enum: ['size', 'color', 'material'],
          required: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        options: [
          {
            value: {
              type: String,
              required: true,
              trim: true,
            },
            priceAdjustment: {
              type: Number,
              default: 0,
            },
            stock: {
              type: Number,
              default: 0,
            },
            sku: {
              type: String,
              trim: true,
            },
          },
        ],
      },
    ],

    // ========== MULTI-LANGUAGE TRANSLATIONS ==========
    translations: {
      type: Map,
      of: {
        name: { type: String, trim: true, maxlength: 100 },
        description: { type: String, maxlength: 5000 },
        shortDescription: { type: String, maxlength: 200 },
      },
      default: {},
      description: 'Map of language codes to translated fields (name, description, shortDescription)',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========== MIDDLEWARE ==========

// Generate slug from name before saving (priority: English name)
ProductSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    let slug = this.name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-');
    this.slug = slug;
  }

  // If no main image is set but images exist, set first image as main
  if (this.images && this.images.length > 0 && !this.images.some(img => img.isMain)) {
    this.images[0].isMain = true;
  }

  // Set imageUrl from main image or first image
  if (this.images && this.images.length > 0) {
    const mainImage = this.images.find(img => img.isMain) || this.images[0];
    this.imageUrl = mainImage.url;
  }

  next();
});

// Update seller name if seller changes (useful when seller updates profile)
ProductSchema.pre('save', async function (next) {
  if (this.isModified('sellerId')) {
    const User = mongoose.model('User');
    const seller = await User.findById(this.sellerId);
    if (seller) {
      this.sellerName = seller.name;
    }
  }
  next();
});

// ========== INSTANCE METHODS ==========

// Check if product is in stock (respects variations if selected)
ProductSchema.methods.isInStock = function (quantity = 1, selectedVariations = {}) {
  if (this.isDigital) return true; // digital products always "in stock"
  if (this.hasVariations && Object.keys(selectedVariations).length > 0) {
    const variationType = Object.keys(selectedVariations)[0];
    const selectedValue = Object.values(selectedVariations)[0];
    const variation = this.variations.find(v => v.type === variationType);
    const option = variation?.options.find(opt => opt.value === selectedValue);
    return option ? option.stock >= quantity : false;
  }
  return this.stock >= quantity;
};

// Reduce stock when purchased (handles variations & digital)
ProductSchema.methods.reduceStock = async function (quantity, selectedVariations = {}) {
  if (this.isDigital) return true; // no stock reduction
  if (this.hasVariations && Object.keys(selectedVariations).length > 0) {
    const variationType = Object.keys(selectedVariations)[0];
    const selectedValue = Object.values(selectedVariations)[0];
    const variation = this.variations.find(v => v.type === variationType);
    const option = variation?.options.find(opt => opt.value === selectedValue);
    if (!option) throw new Error('Variation option not found');
    if (option.stock < quantity) throw new Error(`Insufficient stock for ${selectedValue}`);
    option.stock -= quantity;
    await this.save();
    return true;
  }

  if (this.stock < quantity) throw new Error(`Insufficient stock. Only ${this.stock} left.`);
  this.stock -= quantity;
  this.soldCount += quantity;
  await this.save();
  return true;
};

// Reduce preorder stock when preorder is placed
ProductSchema.methods.reducePreorderStock = async function (quantity) {
  if (this.preorderStock > 0 && this.preorderStock < quantity) {
    throw new Error(`Preorder quantity limit exceeded. Only ${this.preorderStock} allowed.`);
  }
  if (this.preorderStock > 0) {
    this.preorderStock -= quantity;
    await this.save();
  }
  return true;
};

// Increase stock (for returns or restock) – handles variations
ProductSchema.methods.increaseStock = async function (quantity, selectedVariations = {}) {
  if (this.isDigital) return true;
  if (this.hasVariations && Object.keys(selectedVariations).length > 0) {
    const variationType = Object.keys(selectedVariations)[0];
    const selectedValue = Object.values(selectedVariations)[0];
    const variation = this.variations.find(v => v.type === variationType);
    const option = variation?.options.find(opt => opt.value === selectedValue);
    if (option) {
      option.stock += quantity;
      await this.save();
    }
    return true;
  }
  this.stock += quantity;
  await this.save();
  return true;
};

// Increment view count
ProductSchema.methods.incrementViews = async function () {
  this.views += 1;
  await this.save();
};

// Get price for a specific variation
ProductSchema.methods.getVariationPrice = function (selectedVariations = {}) {
  if (!this.hasVariations || Object.keys(selectedVariations).length === 0) return this.price;
  const variationType = Object.keys(selectedVariations)[0];
  const selectedValue = Object.values(selectedVariations)[0];
  const variation = this.variations.find(v => v.type === variationType);
  const option = variation?.options.find(opt => opt.value === selectedValue);
  return this.price + (option?.priceAdjustment || 0);
};

// Get stock for a specific variation
ProductSchema.methods.getVariationStock = function (selectedVariations = {}) {
  if (this.isDigital) return Infinity;
  if (!this.hasVariations || Object.keys(selectedVariations).length === 0) return this.stock;
  const variationType = Object.keys(selectedVariations)[0];
  const selectedValue = Object.values(selectedVariations)[0];
  const variation = this.variations.find(v => v.type === variationType);
  const option = variation?.options.find(opt => opt.value === selectedValue);
  return option ? option.stock : 0;
};

// Check if product is currently promoted (not expired)
ProductSchema.methods.isCurrentlyPromoted = function () {
  return this.isPromoted && (!this.promotionEndDate || this.promotionEndDate > new Date());
};

// Assign an unused license key for this product (used at checkout or download)
ProductSchema.methods.assignLicenseKey = async function (orderId) {
  const unusedKey = this.licenseKeys.find(k => !k.isUsed);
  if (!unusedKey) return null;
  unusedKey.isUsed = true;
  unusedKey.orderId = orderId;
  unusedKey.usedAt = new Date();
  await this.save();
  return unusedKey.key;
};

/**
 * Get product data translated to a specific language
 * @param {string} lang - Language code (e.g., 'es', 'fr')
 * @returns {Object} Product object with applied translation (if available)
 */
ProductSchema.methods.getTranslated = function (lang = 'en') {
  const product = this.toObject();
  if (lang === 'en') return product;
  const translation = this.translations?.get(lang);
  if (!translation) return product;
  if (translation.name) product.name = translation.name;
  if (translation.description) product.description = translation.description;
  if (translation.shortDescription) product.shortDescription = translation.shortDescription;
  return product;
};

// ========== STATIC METHODS ==========

// Get all products by seller (optionally include inactive)
ProductSchema.statics.findBySeller = function (sellerId, includeInactive = false) {
  const filter = { sellerId };
  if (!includeInactive) filter.isActive = true;
  return this.find(filter).sort('-createdAt');
};

// Search products (full‑text)
ProductSchema.statics.search = function (query) {
  return this.find(
    {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
      ],
      isActive: true,
    },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

// Get featured products
ProductSchema.statics.getFeatured = function (limit = 10) {
  return this.find({ isFeatured: true, isActive: true }).sort('-createdAt').limit(limit);
};

// Get promoted products (active and not expired)
ProductSchema.statics.getPromoted = function () {
  return this.find({
    isPromoted: true,
    promotionEndDate: { $gt: new Date() },
    isActive: true,
  }).sort({ createdAt: -1 });
};

// ========== VIRTUAL PROPERTIES ==========

ProductSchema.virtual('discountPercent').get(function () {
  if (!this.comparePrice || this.comparePrice <= this.price) return 0;
  return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
});

ProductSchema.virtual('formattedPrice').get(function () {
  return `$${this.price.toFixed(2)}`;
});

ProductSchema.virtual('formattedComparePrice').get(function () {
  return this.comparePrice ? `$${this.comparePrice.toFixed(2)}` : null;
});

ProductSchema.virtual('inStock').get(function () {
  if (this.isDigital) return true;
  return this.stock > 0;
});

// Indicates whether preorder/backorder is currently available
ProductSchema.virtual('isPreorderAvailable').get(function () {
  return (
    this.allowPreorder &&
    this.stock <= 0 &&
    (this.preorderStock === 0 || this.preorderStock > 0)
  );
});

ProductSchema.virtual('primaryImage').get(function () {
  return this.imageUrl;
});

ProductSchema.virtual('imageUrls').get(function () {
  return this.images ? this.images.map(img => img.url) : [this.imageUrl];
});

// ========== INDEXES ==========
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ sellerId: 1, createdAt: -1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ isPromoted: -1, promotionEndDate: 1 });
ProductSchema.index({ hasVariations: 1 });
ProductSchema.index({ isDigital: 1 });
ProductSchema.index({ allowPreorder: 1, stock: 1, estimatedShipDate: 1 });
// Geo‑location 2dsphere index for MongoDB geo queries
ProductSchema.index({ location: '2dsphere' });
// Tax code index (optional, for reporting)
ProductSchema.index({ taxCode: 1 });
// Multi‑language: no special index needed for Map; but we can index the translations keys if needed
// ProductSchema.index({ 'translations.name': 1 }); // optional

// ========== EXPORT ==========
module.exports = mongoose.model('Product', ProductSchema);