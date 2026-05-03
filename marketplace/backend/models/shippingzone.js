const mongoose = require('mongoose');

const ShippingZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g., "US Domestic", "Europe"
    countries: [{ type: String, required: true }], // ISO country codes (e.g., "US", "CA", "GB")
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShippingZone', ShippingZoneSchema);