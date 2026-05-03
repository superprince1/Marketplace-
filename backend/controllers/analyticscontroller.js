const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const mongoose = require('mongoose');

/**
 * @desc    Get seller sales analytics
 * @route   GET /api/analytics/seller
 * @access  Private (Seller)
 */
exports.getSellerAnalytics = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { period = '30days' } = req.query;
    let startDate = new Date();
    if (period === '7days') startDate.setDate(startDate.getDate() - 7);
    else if (period === '30days') startDate.setDate(startDate.getDate() - 30);
    else if (period === '90days') startDate.setDate(startDate.getDate() - 90);
    else startDate = new Date(0);

    // Orders containing seller's products, paid, within period
    const orders = await Order.find({
      'items.sellerId': sellerId,
      paymentStatus: 'paid',
      paidAt: { $gte: startDate },
    });

    // Calculate revenue
    let totalRevenue = 0;
    let totalOrders = orders.length;
    let totalItemsSold = 0;
    orders.forEach(order => {
      const sellerItems = order.items.filter(i => i.sellerId.toString() === sellerId);
      sellerItems.forEach(item => {
        totalRevenue += item.price * item.quantity;
        totalItemsSold += item.quantity;
      });
    });

    // Top selling products
    const productSales = {};
    for (const order of orders) {
      const sellerItems = order.items.filter(i => i.sellerId.toString() === sellerId);
      for (const item of sellerItems) {
        const prodId = item.productId.toString();
        productSales[prodId] = (productSales[prodId] || 0) + item.quantity;
      }
    }
    const topProductsIds = Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5).map(([id]) => id);
    const topProducts = await Product.find({ _id: { $in: topProductsIds } }).select('name price imageUrl');

    // Monthly revenue chart (last 6 months)
    const monthlyRevenue = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthlyOrders = await Order.find({
        'items.sellerId': sellerId,
        paymentStatus: 'paid',
        paidAt: { $gte: start, $lte: end },
      });
      let revenue = 0;
      monthlyOrders.forEach(order => {
        const sellerItems = order.items.filter(i => i.sellerId.toString() === sellerId);
        sellerItems.forEach(item => revenue += item.price * item.quantity);
      });
      monthlyRevenue.push({ month: start.toLocaleString('default', { month: 'short' }), revenue });
    }

    res.json({
      success: true,
      summary: { totalRevenue, totalOrders, totalItemsSold, averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0 },
      topProducts,
      monthlyRevenue,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/analytics/admin
 * @access  Private (Admin)
 */
exports.getAdminAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSellers = await User.countDocuments({ role: 'seller' });
    const totalBuyers = await User.countDocuments({ role: 'buyer' });
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const paidOrders = await Order.find({ paymentStatus: 'paid' });
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const monthlyRevenue = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const orders = await Order.find({ paymentStatus: 'paid', paidAt: { $gte: start, $lte: end } });
      const revenue = orders.reduce((sum, o) => sum + o.total, 0);
      monthlyRevenue.push({ month: start.toLocaleString('default', { month: 'short' }), revenue });
    }
    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, sellers: totalSellers, buyers: totalBuyers },
        products: { total: totalProducts, active: activeProducts, inactive: totalProducts - activeProducts },
        orders: { total: totalOrders, pending: pendingOrders, completed: totalOrders - pendingOrders },
        revenue: { total: totalRevenue, monthly: monthlyRevenue },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get platform growth (daily new users/orders)
 * @route   GET /api/analytics/growth
 * @access  Private (Admin)
 */
exports.getGrowthMetrics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const orderGrowth = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, userGrowth, orderGrowth });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};