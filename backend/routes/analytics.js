const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

router.get('/seller', auth, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Orders containing seller's items
    const orders = await Order.find({
      'items.sellerId': sellerId,
      createdAt: { $gte: startDate },
      paymentStatus: 'paid',
    });

    // Sales per day
    const dailySales = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      dailySales[key] = 0;
    }
    for (const order of orders) {
      const sellerItems = order.items.filter(item => item.sellerId.toString() === sellerId);
      const sellerTotal = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (dailySales[dateKey] !== undefined) dailySales[dateKey] += sellerTotal;
    }
    const salesChart = Object.entries(dailySales).map(([date, total]) => ({ date, total })).reverse();

    // Top products
    const productSales = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (item.sellerId.toString() === sellerId) {
          productSales[item.productId] = (productSales[item.productId] || 0) + (item.price * item.quantity);
        }
      }
    }
    const topProducts = await Promise.all(
      Object.entries(productSales)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5)
        .map(async ([id, revenue]) => {
          const product = await Product.findById(id).select('name images');
          return { product, revenue, quantity: 0 };
        })
    );

    // Summary
    const totalRevenue = Object.values(productSales).reduce((a,b) => a+b, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    res.json({
      success: true,
      analytics: {
        summary: { totalRevenue, totalOrders, averageOrderValue },
        salesChart,
        topProducts,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;