const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can follow a seller only once
FollowSchema.index({ followerId: 1, sellerId: 1 }, { unique: true });

module.exports = mongoose.model('Follow', FollowSchema);