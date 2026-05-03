const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ActivityLog = require('../models/ActivityLog');
const Setting = require('../models/Setting');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { sendEmail } = require('../utils/email');

// ========== HELPER FUNCTIONS ==========
const jsonToCsv = (data, fields) => {
  const escape = (str) => `"${String(str).replace(/"/g, '""')}"`;
  const header = fields.join(',');
  const rows = data.map(row =>
    fields.map(f => escape(row[f] || '')).join(',')
  );
  return [header, ...rows].join('\n');
};

// ========== DASHBOARD STATS ==========
router.get('/stats', auth, admin, async (req, res) => {
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
        revenue: { total: totalRevenue, monthly: monthlyRevenue }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== USER MANAGEMENT ==========
router.get('/users', auth, admin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, isActive, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page-1)*limit)
      .limit(parseInt(limit));
    const total = await User.countDocuments(filter);
    res.json({ success: true, users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total/limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', auth, admin, async (req, res) => {
  try {
    const { role, isActive, isAdmin } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (req.params.id === req.user.id && isAdmin === false) {
      return res.status(400).json({ error: 'Cannot remove your own admin status' });
    }
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (isAdmin !== undefined) user.isAdmin = isAdmin;
    await user.save();
    await ActivityLog.create({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'UPDATE_USER',
      targetType: 'User',
      targetId: user._id,
      details: { role, isActive, isAdmin },
      ipAddress: req.ip
    });
    res.json({ success: true, user: user.toObject({ getters: true, versionKey: false }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await user.remove(); // cascade deletes products if seller
    await ActivityLog.create({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'DELETE_USER',
      targetType: 'User',
      targetId: user._id,
      details: { name: user.name, email: user.email },
      ipAddress: req.ip
    });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PRODUCT MANAGEMENT (ADMIN OVERRIDE) ==========
router.get('/products', auth, admin, async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive, sellerId, search } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (sellerId) filter.sellerId = sellerId;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const products = await Product.find(filter)
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page-1)*limit)
      .limit(parseInt(limit));
    const total = await Product.countDocuments(filter);
    res.json({ success: true, products, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total/limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/products/:id', auth, admin, async (req, res) => {
  try {
    const { isFeatured, isActive, price, name, category } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (isActive !== undefined) product.isActive = isActive;
    if (price) product.price = price;
    if (name) product.name = name;
    if (category) product.category = category;
    await product.save();
    await ActivityLog.create({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'UPDATE_PRODUCT',
      targetType: 'Product',
      targetId: product._id,
      details: { isFeatured, isActive, price, name, category },
      ipAddress: req.ip
    });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/products/:id', auth, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await product.remove();
    await ActivityLog.create({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'DELETE_PRODUCT',
      targetType: 'Product',
      targetId: product._id,
      details: { name: product.name },
      ipAddress: req.ip
    });
    res.json({ success: true, message: 'Product permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ORDER MANAGEMENT ==========
router.get('/orders', auth, admin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus, startDate, endDate } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const orders = await Order.find(filter)
      .populate('buyerId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page-1)*limit)
      .limit(parseInt(limit));
    const total = await Order.countDocuments(filter);
    res.json({ success: true, orders, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total/limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/orders/:id', auth, admin, async (req, res) => {
  try {
    const { status, paymentStatus, trackingNumber, carrier } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier) order.carrier = carrier;
    await order.save();
    await ActivityLog.create({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'UPDATE_ORDER',
      targetType: 'Order',
      targetId: order._id,
      details: { status, paymentStatus, trackingNumber, carrier },
      ipAddress: req.ip
    });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== BULK ACTIONS ==========
router.post('/bulk/users', auth, admin, async (req, res) => {
  const { userIds, action } = req.body;
  try {
    let update = {};
    switch (action) {
      case 'delete':
        await User.deleteMany({ _id: { $in: userIds } });
        break;
      case 'activate':
        update = { isActive: true };
        await User.updateMany({ _id: { $in: userIds } }, { $set: update });
        break;
      case 'deactivate':
        update = { isActive: false };
        await User.updateMany({ _id: { $in: userIds } }, { $set: update });
        break;
      case 'make-admin':
        update = { isAdmin: true, role: 'admin' };
        await User.updateMany({ _id: { $in: userIds } }, { $set: update });
        break;
      case 'remove-admin':
        update = { isAdmin: false, role: 'buyer' };
        await User.updateMany({ _id: { $in: userIds } }, { $set: update });
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    await ActivityLog.create({
      adminId: req.user.id,
      adminName: req.user.name,
      action: `BULK_USERS_${action.toUpperCase()}`,
      targetType: 'User',
      details: { userIds, action },
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk/products', auth, admin, async (req, res) => {
  const { productIds, action } = req.body;
  try {
    let update = {};
    switch (action) {
      case 'delete':
        await Product.deleteMany({ _id: { $in: productIds } });
        break;
      case 'activate':
        update = { isActive: true };
        await Product.updateMany({ _id: { $in: productIds } }, { $set: update });
        break;
      case 'deactivate':
        update = { isActive: false };
        await Product.updateMany({ _id: { $in: productIds } }, { $set: update });
        break;
      case 'feature':
        update = { isFeatured: true };
        await Product.updateMany({ _id: { $in: productIds } }, { $set: update });
        break;
      case 'unfeature':
        update = { isFeatured: false };
        await Product.updateMany({ _id: { $in: productIds } }, { $set: update });
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    await ActivityLog.create({
      adminId: req.user.id,
      adminName: req.user.name,
      action: `BULK_PRODUCTS_${action.toUpperCase()}`,
      targetType: 'Product',
      details: { productIds, action },
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk/orders', auth, admin, async (req, res) => {
  const { orderIds, action } = req.body;
  try {
    let update = {};
    switch (action) {
      case 'cancel':
        update = { status: 'cancelled' };
        break;
      case 'mark-paid':
        update = { paymentStatus: 'paid', paidAt: new Date() };
        break;
      case 'mark-shipped':
        update = { status: 'shipped' };
        break;
      case 'mark-delivered':
        update = { status: 'delivered', deliveredAt: new Date() };
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    await Order.updateMany({ _id: { $in: orderIds } }, { $set: update });
    await ActivityLog.create({
      adminId: req.user.id,
      adminName: req.user.name,
      action: `BULK_ORDERS_${action.toUpperCase()}`,
      targetType: 'Order',
      details: { orderIds, action },
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== EXPORT REPORTS ==========
router.get('/export/:type', auth, admin, async (req, res) => {
  const { type } = req.params;
  let data, fields;
  try {
    if (type === 'users') {
      data = await User.find().select('-password');
      fields = ['_id', 'name', 'email', 'role', 'isAdmin', 'isActive', 'createdAt'];
    } else if (type === 'products') {
      data = await Product.find().populate('sellerId', 'name');
      fields = ['_id', 'name', 'price', 'category', 'stock', 'isActive', 'isFeatured', 'sellerId.name', 'createdAt'];
    } else if (type === 'orders') {
      data = await Order.find().populate('buyerId', 'name email');
      fields = ['_id', 'orderNumber', 'total', 'status', 'paymentStatus', 'createdAt', 'buyerId.name'];
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
    const csv = jsonToCsv(data, fields);
    res.header('Content-Type', 'text/csv');
    res.attachment(`${type}-export-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== SYSTEM SETTINGS ==========
router.get('/settings', auth, admin, async (req, res) => {
  try {
    const settings = await Setting.find();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', auth, admin, async (req, res) => {
  try {
    const updates = req.body;
    const adminUser = await User.findById(req.user.id);
    for (const [key, value] of Object.entries(updates)) {
      await Setting.findOneAndUpdate(
        { key },
        { value, updatedBy: req.user.id, updatedAt: new Date() },
        { upsert: true }
      );
    }
    await ActivityLog.create({
      adminId: req.user.id,
      adminName: adminUser.name,
      action: 'UPDATE_SETTINGS',
      targetType: 'Setting',
      details: updates,
      ipAddress: req.ip
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== NOTIFICATIONS ==========
router.post('/notify', auth, admin, async (req, res) => {
  const { userIds, subject, message } = req.body;
  try {
    const users = await User.find({ _id: { $in: userIds } });
    let sentCount = 0;
    for (const user of users) {
      const success = await sendEmail(user.email, subject, `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2>${subject}</h2>
          <p>${message}</p>
          <br>
          <p style="color: #666;">Marketplace Admin</p>
        </div>
      `);
      if (success) sentCount++;
    }
    await ActivityLog.create({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'SEND_NOTIFICATION',
      targetType: 'Notification',
      details: { userIds, subject, message, sentCount },
      ipAddress: req.ip
    });
    res.json({ success: true, sentCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ACTIVITY LOGS ==========
router.get('/logs', auth, admin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, startDate, endDate } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page-1)*limit)
      .limit(parseInt(limit));
    const total = await ActivityLog.countDocuments(filter);
    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total/limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;