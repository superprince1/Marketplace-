const express = require('express');
const router = express.Router();
const currencyMiddleware = require('../middleware/currency');
const { fetchExchangeRates } = require('../services/currencyService');

/**
 * @route   GET /api/currency/detect
 * @desc    Detect user's currency based on IP (or fallback to USD)
 * @access  Public
 */
router.get('/detect', currencyMiddleware, (req, res) => {
  res.json({ success: true, currency: req.targetCurrency });
});

/**
 * @route   GET /api/currency/supported
 * @desc    Get list of all supported currencies (from exchange rate API)
 * @access  Public
 */
router.get('/supported', async (req, res) => {
  try {
    const rates = await fetchExchangeRates();
    const currencies = Object.keys(rates).sort();
    res.json({ success: true, currencies });
  } catch (err) {
    console.error('Failed to fetch supported currencies:', err);
    res.status(500).json({ success: false, error: 'Failed to load currency list' });
  }
});

module.exports = router;