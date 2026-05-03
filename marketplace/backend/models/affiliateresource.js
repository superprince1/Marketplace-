const mongoose = require('mongoose');

/**
 * AffiliateResource Schema
 * 
 * Stores promotional materials that affiliates can copy and share:
 * - Banners (images with optional link)
 * - Text links (HTML snippet)
 * - Social media posts (pre‑written text or click‑to‑tweet)
 * 
 * Added features:
 * - productId: link to a specific product (null = general shop/homepage)
 * - clickCount: track how many times the resource link was used (optional)
 * - previewImage: separate image for gallery view
 * - description: for admin reference
 * - soft deletion (deletedAt)
 * - indexes for performance
 * - static method to get active resources sorted by type/order
 */
const AffiliateResourceSchema = new mongoose.Schema(
  {
    // Basic info
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    type: {
      type: String,
      enum: ['banner', 'text_link', 'social_post'],
      required: true,
    },
    
    // Content fields
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      // For banners: image URL or HTML? We'll use imageUrl for image, content can be alt text or caption.
      // For text_link: the HTML snippet (e.g., '<a href="...">Shop Now</a>')
      // For social_post: the pre‑written message.
    },
    imageUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (this.type === 'banner' && !v) return false;
          return true;
        },
        message: 'Banner resources must have an imageUrl',
      },
    },
    previewImage: {
      type: String,
      trim: true,
      default: '',
    },
    link: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if ((this.type === 'banner' || this.type === 'text_link') && !v) return false;
          return true;
        },
        message: 'Banner and text_link resources must have a link',
      },
    },
    
    // Optional product association
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    
    // Stats (optional, for admin insight)
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Soft delete
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    
    // Ordering
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========== INDEXES ==========
AffiliateResourceSchema.index({ isActive: 1, sortOrder: 1, type: 1 });
AffiliateResourceSchema.index({ productId: 1 });
AffiliateResourceSchema.index({ deletedAt: 1 });

// ========== MIDDLEWARE ==========
// Soft delete instead of hard delete (if needed)
AffiliateResourceSchema.pre('remove', function(next) {
  this.deletedAt = new Date();
  this.isActive = false;
  this.save();
  next();
});

// ========== INSTANCE METHODS ==========
/**
 * Increment click count (called when an affiliate uses this link)
 */
AffiliateResourceSchema.methods.incrementClicks = async function() {
  this.clickCount += 1;
  await this.save();
};

/**
 * Generate the actual HTML/URL snippet based on resource type and affiliate code
 * @param {string} affiliateCode - The affiliate's tracking code to append to link
 * @returns {string} Ready‑to‑use HTML or plain text
 */
AffiliateResourceSchema.methods.getRenderedContent = function(affiliateCode) {
  let finalLink = this.link || '';
  if (affiliateCode && finalLink) {
    const separator = finalLink.includes('?') ? '&' : '?';
    finalLink = `${finalLink}${separator}ref=${affiliateCode}`;
  }
  
  switch (this.type) {
    case 'banner':
      return `<a href="${finalLink}" target="_blank"><img src="${this.imageUrl}" alt="${this.content}" style="max-width:100%;" /></a>`;
    case 'text_link':
      // 'content' is the anchor text, e.g., "Shop Now"
      return `<a href="${finalLink}" target="_blank">${this.content}</a>`;
    case 'social_post':
      // For social posts, append referral link at end
      return `${this.content} ${finalLink ? `\n\n${finalLink}` : ''}`;
    default:
      return finalLink;
  }
};

// ========== STATIC METHODS ==========
/**
 * Get all active resources, optionally filtered by type and sorted.
 * @param {string} type - Optional: 'banner', 'text_link', 'social_post'
 * @returns {Promise<Array>}
 */
AffiliateResourceSchema.statics.getActiveResources = function(type = null) {
  const filter = { isActive: true, deletedAt: null };
  if (type) filter.type = type;
  return this.find(filter).sort({ sortOrder: 1, createdAt: -1 });
};

/**
 * Get resources for a specific product (if productId provided)
 * @param {string} productId
 * @returns {Promise<Array>}
 */
AffiliateResourceSchema.statics.getByProduct = function(productId) {
  return this.find({ productId, isActive: true, deletedAt: null }).sort({ sortOrder: 1 });
};

/**
 * Bulk deactivate (soft delete) resources by IDs
 * @param {string[]} ids - Array of resource _id
 * @returns {Promise<UpdateResult>}
 */
AffiliateResourceSchema.statics.bulkDeactivate = function(ids) {
  return this.updateMany(
    { _id: { $in: ids }, deletedAt: null },
    { isActive: false, deletedAt: new Date() },
    { multi: true }
  );
};

// ========== VIRTUAL PROPERTIES ==========
AffiliateResourceSchema.virtual('isDeleted').get(function() {
  return this.deletedAt !== null;
});

module.exports = mongoose.model('AffiliateResource', AffiliateResourceSchema);