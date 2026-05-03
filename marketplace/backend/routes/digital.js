const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary'); // reuse existing Cloudinary upload config

// Helper: generate secure token
const generateToken = () => crypto.randomBytes(32).toString('hex');

// ========== SELLER ROUTES ==========

/**
 * @route   POST /api/digital/upload/:productId
 * @desc    Upload digital file for a product (seller only)
 * @access  Private (Seller)
 */
router.post('/upload/:productId', auth, upload.single('file'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (product.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    product.downloadableFiles.push({
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
    await product.save();

    res.json({
      success: true,
      file: product.downloadableFiles[product.downloadableFiles.length - 1],
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/digital/licenses/:productId
 * @desc    Add license keys to a product (seller only)
 * @access  Private (Seller)
 */
router.post('/licenses/:productId', auth, async (req, res) => {
  try {
    const { keys } = req.body; // array of strings
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ success: false, error: 'Keys array required' });
    }
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (product.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const newKeys = keys.map(k => ({ key: k.trim() }));
    product.licenseKeys.push(...newKeys);
    await product.save();

    res.json({ success: true, added: newKeys.length });
  } catch (err) {
    console.error('Add licenses error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== BUYER ROUTES ==========

/**
 * @route   POST /api/digital/download/:orderId/:itemIndex
 * @desc    Request a download token for a digital item (buyer only)
 * @access  Private (Buyer)
 */
router.post('/download/:orderId/:itemIndex', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const itemIndex = parseInt(req.params.itemIndex);
    const item = order.items[itemIndex];
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

    const product = await Product.findById(item.productId);
    if (!product || !product.isDigital) {
      return res.status(400).json({ success: false, error: 'Not a digital product' });
    }

    // Check if already has a valid token (not expired and downloads left)
    let tokenDoc = item.downloadTokens?.find(t => t.expiresAt > new Date() && t.downloadCount < t.maxDownloads);
    if (!tokenDoc) {
      // Create new token
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 3600000); // 7 days
      tokenDoc = {
        token,
        expiresAt,
        downloadCount: 0,
        maxDownloads: product.maxDownloads || 3,
        ipAddress: req.ip,
        createdAt: new Date(),
      };
      if (!item.downloadTokens) item.downloadTokens = [];
      item.downloadTokens.push(tokenDoc);
      await order.save();
    }

    // Return token info and file list (without actual file URL for security)
    res.json({
      success: true,
      token: tokenDoc.token,
      expiresAt: tokenDoc.expiresAt,
      maxDownloads: tokenDoc.maxDownloads,
      remaining: tokenDoc.maxDownloads - tokenDoc.downloadCount,
      files: product.downloadableFiles.map(f => ({ filename: f.originalName, id: f._id })),
      // For license keys, send only if this is the first download (or always? seller may want to show key only once)
      licenseKey: product.licenseKeys.find(k => !k.isUsed)?.key || null,
    });
  } catch (err) {
    console.error('Download request error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   GET /api/digital/file/:token
 * @desc    Serve the actual digital file (valid token required)
 * @access  Private (via token)
 */
router.get('/file/:token', auth, async (req, res) => {
  try {
    const { token } = req.params;
    // Find order containing this token
    const order = await Order.findOne({ 'items.downloadTokens.token': token });
    if (!order) return res.status(404).json({ success: false, error: 'Invalid token' });

    let tokenDoc = null;
    let itemIndex = -1;
    for (let i = 0; i < order.items.length; i++) {
      const t = order.items[i].downloadTokens?.find(tok => tok.token === token);
      if (t) {
        tokenDoc = t;
        itemIndex = i;
        break;
      }
    }
    if (!tokenDoc) return res.status(404).json({ success: false, error: 'Token not found' });
    if (tokenDoc.expiresAt < new Date()) {
      return res.status(410).json({ success: false, error: 'Token expired' });
    }
    if (tokenDoc.downloadCount >= tokenDoc.maxDownloads) {
      return res.status(429).json({ success: false, error: 'Download limit exceeded' });
    }

    const item = order.items[itemIndex];
    const product = await Product.findById(item.productId);
    if (!product || product.downloadableFiles.length === 0) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Increment download count
    tokenDoc.downloadCount++;
    tokenDoc.ipAddress = req.ip;
    await order.save();

    // If product uses license keys, mark one as used and send it
    let licenseKey = null;
    if (product.licenseKeys && product.licenseKeys.length > 0 && tokenDoc.downloadCount === 1) {
      const unusedKey = product.licenseKeys.find(k => !k.isUsed);
      if (unusedKey) {
        unusedKey.isUsed = true;
        unusedKey.orderId = order._id;
        unusedKey.usedAt = new Date();
        await product.save();
        licenseKey = unusedKey.key;
      }
    }

    // Return the file URL (signed or direct)
    const file = product.downloadableFiles[0]; // return first file for simplicity
    res.json({
      success: true,
      downloadUrl: file.url,
      filename: file.originalName,
      licenseKey,
    });
  } catch (err) {
    console.error('File serve error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;