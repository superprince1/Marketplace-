const mongoose = require('mongoose');

const ProductLikeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ProductLikeSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('ProductLike', ProductLikeSchema);