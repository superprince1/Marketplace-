const mongoose = require('mongoose');

const DisputeSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    required: true,
    enum: ['item_not_received', 'item_not_as_described', 'damaged', 'wrong_item', 'other'],
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  evidence: [{
    type: String, // URLs of uploaded images/documents
  }],
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'cancelled'],
    default: 'open',
  },
  resolution: {
    type: String,
    enum: ['refunded', 'partial_refund', 'rejected', 'replacement', 'other'],
  },
  resolutionNote: String,
  refundAmount: Number,
  adminNotes: String,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

DisputeSchema.index({ orderId: 1, buyerId: 1 });
module.exports = mongoose.model('Dispute', DisputeSchema);