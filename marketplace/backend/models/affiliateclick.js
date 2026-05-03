const mongoose = require('mongoose');

const AffiliateClickSchema = new mongoose.Schema({
  affiliateCode: {
    type: String,
    required: true,
    index: true,
  },
  ipAddress: String,
  userAgent: String,
  referrer: String,
  landedUrl: String,
  converted: {
    type: Boolean,
    default: false,
  },
  conversionOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 90, // auto-delete after 90 days
  },
});

module.exports = mongoose.model('AffiliateClick', AffiliateClickSchema);