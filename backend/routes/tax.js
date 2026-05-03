const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PlatformSettings = require('../models/PlatformSettings');
const { calculateTaxForOrder } = require('../services/taxService');

/**
 * POST /api/tax/estimate
 * Given shipping address and cart items, return estimated tax.
 * @access Private (or public if we allow guest)
 */
router.post('/estimate', auth, async (req, res) => {
  try {
    const { shippingAddress, items, shippingCost = 0 } = req.body;
    if (!shippingAddress || !shippingAddress.country || !shippingAddress.state || !shippingAddress.zipCode) {
      return res.status(400).json({ error: 'Shipping address incomplete' });
    }
    const settings = await PlatformSettings.getSettings();
    const taxResult = await calculateTaxForOrder(settings, shippingAddress, items, shippingCost);
    res.json({ success: true, ...taxResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;