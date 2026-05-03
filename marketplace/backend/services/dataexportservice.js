/**
 * services/dataExportService.js
 * Collects all user's personal data for GDPR data portability.
 * Returns a JSON object with profile, orders, reviews, wishlist, addresses, etc.
 */

const Order = require('../models/Order');
const Review = require('../models/Review');
const User = require('../models/User');

const collectUserData = async (userId) => {
  const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpire');
  if (!user) throw new Error('User not found');

  const orders = await Order.find({ buyerId: userId }).lean();
  const reviews = await Review.find({ userId }).populate('productId', 'name slug').lean();
  const wishlist = await User.findById(userId).populate('wishlist').select('wishlist').lean();

  // Sanitize any extremely sensitive info (like payment IDs) – but it's the user's own data.
  return {
    exportDate: new Date().toISOString(),
    profile: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
    orders: orders.map(o => ({
      orderNumber: o.orderNumber,
      total: o.total,
      status: o.status,
      paymentStatus: o.paymentStatus,
      items: o.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      createdAt: o.createdAt,
    })),
    reviews: reviews.map(r => ({
      productId: r.productId,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
    wishlist: wishlist?.wishlist || [],
  };
};

module.exports = { collectUserData };