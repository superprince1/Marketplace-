const mongoose = require('mongoose');

/**
 * Order Schema for Marketplace
 * Tracks purchases from buyers, including product variations, digital products,
 * PRE‑ORDER / BACKORDER items, ADVANCED SHIPPING (real‑time rates, delivery date),
 * STORE CREDIT, and BUYER SUBSCRIPTION perks.
 */
const OrderSchema = new mongoose.Schema(
  {
    // Unique order number for customers (e.g., ORD-20241215-ABC123)
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a buyer'],
    },
    // Snapshot of buyer info at order time (in case profile changes later)
    buyerInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true, default: 'USA' },
      instructions: String,
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    // Items in the order (snapshot of product details, including variations)
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        sellerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        imageUrl: String,
        sku: String,
        // Store selected variation options (e.g., { size: 'M', color: 'Red' })
        selectedVariations: {
          type: Map,
          of: String,
          default: {},
        },
        // Digital product download tokens (one per item, per buyer)
        downloadTokens: [
          {
            token: { type: String, unique: true, sparse: true },
            expiresAt: Date,
            downloadCount: { type: Number, default: 0 },
            maxDownloads: { type: Number, default: 3 },
            ipAddress: String,
            createdAt: { type: Date, default: Date.now },
          },
        ],

        // ========== PRE‑ORDER / BACKORDER FIELDS ==========
        isPreorder: {
          type: Boolean,
          default: false,
          description: 'True if this item was ordered while out of stock (preorder)',
        },
        estimatedShipDate: {
          type: Date,
          default: null,
          description: 'The date the seller promised to ship this preorder item',
        },
        preorderMessage: {
          type: String,
          default: '',
          description: 'Snapshot of the preorder message shown to customer at order time',
        },
      },
    ],
    // Totals
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 }, // also used for subscription discount
    total: { type: Number, required: true, min: 0 },
    // Payment information
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'paypal', 'bank_transfer', 'cash_on_delivery', 'paystack', 'coinbase'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentId: { type: String, unique: true, sparse: true },
    paidAt: Date,
    refundAmount: { type: Number, default: 0 },
    refundReason: String,
    refundedAt: Date,
    // Order status workflow
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    statusHistory: [
      {
        status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
        note: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    // Shipping tracking
    trackingNumber: String,
    carrier: { type: String, enum: ['usps', 'fedex', 'ups', 'dhl', 'other'] },
    estimatedDelivery: Date,
    deliveredAt: Date,
    // Buyer notes
    buyerNotes: String,
    internalNotes: String,
    // Cancellation
    cancelledAt: Date,
    cancelReason: String,
    // Payment gateway reference
    paymentGateway: {
      type: String,
      enum: ['stripe', 'paypal', 'paystack', 'coinbase', 'cash_on_delivery', 'simulated'],
      default: 'simulated',
    },
    paymentGatewayReference: String,

    // ========== ADVANCED SHIPPING FIELDS ==========
    shippingMethodName: { type: String, default: '' },
    shippingMethodId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShippingRate', default: null },
    selectedDeliveryDate: { type: Date, default: null },
    totalWeight: { type: Number, default: 0 }, // in kg

    // ========== STORE CREDIT FIELDS ==========
    storeCreditUsed: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 }, // amount actually paid after credit

    // ========== BUYER SUBSCRIPTION PERKS ==========
    subscriptionDiscount: { type: Number, default: 0 }, // amount deducted (already stored in discount field as well)
    subscriptionFreeShippingApplied: { type: Boolean, default: false },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerSubscription', default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========== INDEXES ==========
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ buyerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, paymentStatus: 1 });
OrderSchema.index({ 'items.sellerId': 1 });
OrderSchema.index({ 'items.downloadTokens.token': 1 }); // for token lookup
OrderSchema.index({ 'items.isPreorder': 1, 'items.estimatedShipDate': 1 }); // for preorder queries
OrderSchema.index({ selectedDeliveryDate: 1 }); // for delivery date filtering
OrderSchema.index({ shippingMethodId: 1 }); // for lookups

// ========== MIDDLEWARE ==========

// Generate unique order number before saving
OrderSchema.pre('save', async function (next) {
  if (!this.isNew) {
    this.updatedAt = Date.now();
    return next();
  }
  if (!this.orderNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderNumber = `ORD-${dateStr}-${random}`;
    let existing = await mongoose.model('Order').findOne({ orderNumber: this.orderNumber });
    let counter = 1;
    while (existing) {
      this.orderNumber = `ORD-${dateStr}-${random}-${counter}`;
      existing = await mongoose.model('Order').findOne({ orderNumber: this.orderNumber });
      counter++;
    }
  }
  next();
});

// Auto-add status history entry when status changes
OrderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const previousStatus = this.statusHistory.length > 0 ? this.statusHistory[this.statusHistory.length - 1].status : null;
    if (previousStatus !== this.status) {
      this.statusHistory.push({
        status: this.status,
        note: `Order ${this.status}`,
        timestamp: new Date(),
      });
    }
  }
  next();
});

// Auto-set paidAt / deliveredAt / cancelledAt
OrderSchema.pre('save', function (next) {
  if (this.isModified('paymentStatus') && this.paymentStatus === 'paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
  if (this.isModified('status') && this.status === 'delivered' && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }
  if (this.isModified('status') && this.status === 'cancelled' && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }
  next();
});

// ========== INSTANCE METHODS ==========

// Check if order can be cancelled (before shipping)
OrderSchema.methods.canCancel = function () {
  return ['pending', 'processing'].includes(this.status);
};

// Cancel order (restore stock and refund if paid)
OrderSchema.methods.cancel = async function (reason) {
  if (!this.canCancel()) throw new Error(`Cannot cancel order with status: ${this.status}`);
  this.status = 'cancelled';
  this.cancelReason = reason;
  await this.save();
  return true;
};

// Mark as paid (external payment confirmation)
OrderSchema.methods.markAsPaid = async function (paymentId) {
  this.paymentStatus = 'paid';
  this.paymentId = paymentId;
  this.paidAt = new Date();
  await this.save();
  return true;
};

// Refund order (partial or full)
OrderSchema.methods.refund = async function (amount, reason) {
  if (this.paymentStatus !== 'paid') throw new Error('Cannot refund unpaid order');
  if (amount > this.total) throw new Error('Refund amount exceeds order total');
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  this.paymentStatus = amount >= this.total ? 'refunded' : 'paid';
  await this.save();
  return true;
};

// Update shipping info
OrderSchema.methods.addTracking = async function (trackingNumber, carrier) {
  this.trackingNumber = trackingNumber;
  this.carrier = carrier;
  if (this.status === 'processing') this.status = 'shipped';
  await this.save();
  return true;
};

// ========== DIGITAL PRODUCT METHODS ==========

/**
 * Generate a download token for a specific item (digital product)
 * @param {number} itemIndex - Index in items array
 * @param {number} maxDownloads - Max downloads allowed (default from product)
 * @returns {Promise<Object>} Token object
 */
OrderSchema.methods.assignDownloadToken = async function (itemIndex, maxDownloads = 3) {
  const item = this.items[itemIndex];
  if (!item) throw new Error('Item not found');

  // Check if a valid token already exists
  const existingToken = item.downloadTokens?.find(t => t.expiresAt > new Date() && t.downloadCount < t.maxDownloads);
  if (existingToken) return existingToken;

  // Create new token
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600000); // 7 days

  const newToken = {
    token,
    expiresAt,
    downloadCount: 0,
    maxDownloads,
    createdAt: new Date(),
  };
  if (!item.downloadTokens) item.downloadTokens = [];
  item.downloadTokens.push(newToken);
  await this.save();
  return newToken;
};

/**
 * Get download token info by token string
 * @param {string} tokenStr - The token
 * @returns {Object|null} Token document and item index
 */
OrderSchema.methods.getDownloadToken = function (tokenStr) {
  for (let i = 0; i < this.items.length; i++) {
    const tokenDoc = this.items[i].downloadTokens?.find(t => t.token === tokenStr);
    if (tokenDoc) {
      return { tokenDoc, itemIndex: i };
    }
  }
  return null;
};

/**
 * Mark a download as used (increment count, store IP)
 * @param {string} tokenStr - The token
 * @param {string} ipAddress - Buyer's IP address
 * @returns {Promise<boolean>}
 */
OrderSchema.methods.markDownloadUsed = async function (tokenStr, ipAddress) {
  const result = this.getDownloadToken(tokenStr);
  if (!result) throw new Error('Invalid token');
  const { tokenDoc, itemIndex } = result;
  if (tokenDoc.expiresAt < new Date()) throw new Error('Token expired');
  if (tokenDoc.downloadCount >= tokenDoc.maxDownloads) throw new Error('Download limit exceeded');
  tokenDoc.downloadCount++;
  tokenDoc.ipAddress = ipAddress;
  await this.save();
  return true;
};

/**
 * Assign a license key for a digital product (if any)
 * @param {string} productId - Product ID
 * @param {string} orderId - Order ID
 * @returns {Promise<string|null>} License key or null
 */
OrderSchema.methods.assignLicenseKey = async function (productId, orderId) {
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId);
  if (!product || !product.isDigital) return null;
  return product.assignLicenseKey(orderId);
};

// ========== PRE‑ORDER METHODS ==========

/**
 * Check if the order contains any preorder items
 * @returns {boolean}
 */
OrderSchema.methods.hasPreorderItems = function () {
  return this.items.some(item => item.isPreorder === true);
};

/**
 * Get the earliest estimated ship date among preorder items (for display)
 * @returns {Date|null}
 */
OrderSchema.methods.getEarliestPreorderShipDate = function () {
  const preorderItems = this.items.filter(item => item.isPreorder && item.estimatedShipDate);
  if (preorderItems.length === 0) return null;
  return new Date(Math.min(...preorderItems.map(item => new Date(item.estimatedShipDate))));
};

// ========== STATIC METHODS ==========

// Get orders by buyer with pagination
OrderSchema.statics.getByBuyer = function (buyerId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return this.find({ buyerId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

// Get orders by seller (based on items.sellerId)
OrderSchema.statics.getBySeller = function (sellerId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return this.find({ 'items.sellerId': sellerId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

// Get pending orders (for admin dashboard)
OrderSchema.statics.getPendingOrders = function () {
  return this.find({ status: 'pending', paymentStatus: 'paid' }).sort({ createdAt: 1 }).populate('buyerId', 'name email');
};

// Get sales statistics for a seller
OrderSchema.statics.getSellerStats = async function (sellerId) {
  const orders = await this.find({ 'items.sellerId': sellerId, paymentStatus: 'paid' });
  const totalSales = orders.reduce((sum, order) => {
    const sellerItems = order.items.filter(item => item.sellerId.toString() === sellerId.toString());
    const sellerTotal = sellerItems.reduce((s, item) => s + item.price * item.quantity, 0);
    return sum + sellerTotal;
  }, 0);
  const orderCount = orders.length;
  const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
  return { totalSales, orderCount, averageOrderValue };
};

// Get all preorder orders (orders containing at least one preorder item)
OrderSchema.statics.getPreorderOrders = function (status = null) {
  const filter = { 'items.isPreorder': true };
  if (status) filter.status = status;
  return this.find(filter).sort({ createdAt: -1 }).populate('buyerId', 'name email');
};

// ========== VIRTUAL PROPERTIES ==========

// Check if order is fully paid
OrderSchema.virtual('isPaid').get(function () {
  return this.paymentStatus === 'paid';
});

// Check if order is delivered
OrderSchema.virtual('isDelivered').get(function () {
  return this.status === 'delivered';
});

// Days since order placed
OrderSchema.virtual('daysOld').get(function () {
  const diff = Date.now() - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Shipping status text
OrderSchema.virtual('shippingStatus').get(function () {
  if (this.status === 'delivered') return 'Delivered';
  if (this.status === 'shipped') return 'Shipped';
  if (this.trackingNumber) return 'Tracking available';
  return 'Not shipped';
});

// Formatted total with currency
OrderSchema.virtual('formattedTotal').get(function () {
  return `$${this.total.toFixed(2)}`;
});

// Total number of items (sum of quantities)
OrderSchema.virtual('totalItems').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Check if order contains any digital products
OrderSchema.virtual('isDigitalOrder').get(function () {
  // For simplicity, we'll add a field `hasDigital` during checkout.
  return this.hasDigital === true;
});

// Group items by seller (for multi-seller orders)
OrderSchema.virtual('itemsBySeller').get(function () {
  const grouped = {};
  this.items.forEach(item => {
    const sellerId = item.sellerId.toString();
    if (!grouped[sellerId]) {
      grouped[sellerId] = {
        sellerId,
        items: [],
        subtotal: 0,
        hasPreorder: false,
      };
    }
    grouped[sellerId].items.push(item);
    grouped[sellerId].subtotal += item.price * item.quantity;
    if (item.isPreorder) grouped[sellerId].hasPreorder = true;
  });
  return Object.values(grouped);
});

// Check if order has any preorder items (convenience)
OrderSchema.virtual('hasPreorder').get(function () {
  return this.items.some(item => item.isPreorder);
});

module.exports = mongoose.model('Order', OrderSchema);