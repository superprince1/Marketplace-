const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'purchase',
        'like',
        'follow',
        'review',
        'shared_purchase',
        'joined',
      ],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      refPath: 'referenceModel',
    },
    referenceModel: {
      type: String,
      enum: ['Product', 'Order', 'Review', 'User'],
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for feed queries
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ 'metadata.sellerId': 1, createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);