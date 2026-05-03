const mongoose = require('mongoose');

const WebhookSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
      default: () => require('crypto').randomBytes(32).toString('hex'),
    },
    events: {
      type: [String],
      enum: [
        'order.created',
        'order.paid',
        'order.shipped',
        'order.delivered',
        'order.cancelled',
        'product.created',
        'product.updated',
        'product.deleted',
        'user.registered',
        'user.updated',
        'review.created',
      ],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastTriggeredAt: Date,
    lastError: {
      message: String,
      statusCode: Number,
      timestamp: Date,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Webhook', WebhookSchema);