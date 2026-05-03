const mongoose = require('mongoose');

const PushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    required: true,
    unique: true,
  },
  keys: {
    p256dh: String,
    auth: String,
  },
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PushSubscription', PushSubscriptionSchema);