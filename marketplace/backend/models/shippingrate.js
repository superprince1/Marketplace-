const mongoose = require('mongoose');

const ShippingRateSchema = new mongoose.Schema(
  {
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShippingZone', required: true },
    name: { type: String, required: true }, // e.g., "Standard", "Express", "Overnight"
    type: {
      type: String,
      enum: ['flat', 'weight_based', 'carrier'],
      default: 'flat',
    },
    // Flat rate fields
    flatRate: { type: Number, default: 0 },
    // Weight‑based fields
    weightBasedRanges: [
      {
        minWeight: { type: Number, required: true }, // in kg
        maxWeight: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    // Carrier integration
    carrier: {
      type: String,
      enum: ['ups', 'fedex', 'usps'],
    },
    carrierService: { type: String }, // e.g., "GROUND", "2ND_DAY_AIR"
    // Meta
    estimatedDaysMin: { type: Number },
    estimatedDaysMax: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShippingRate', ShippingRateSchema);