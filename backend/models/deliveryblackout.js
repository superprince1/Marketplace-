const mongoose = require('mongoose');

const DeliveryBlackoutSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true },
    reason: { type: String, default: 'Holiday' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryBlackout', DeliveryBlackoutSchema);