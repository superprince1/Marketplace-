const mongoose = require('mongoose');

const AffiliateTierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Bronze, Silver, Gold
    minConversions: { type: Number, required: true, default: 0 }, // minimum conversions to reach this tier
    minEarnings: { type: Number, default: 0 }, // alternative: min earnings
    commissionRate: { type: Number, required: true, min: 0, max: 100 }, // percentage
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AffiliateTier', AffiliateTierSchema);