const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getShippingMethods, getAvailableDeliveryDates } = require('../services/shippingService');

router.post('/methods', async (req, res) => {
  try {
    const { country, weight, destination, origin } = req.body;
    const methods = await getShippingMethods(country, weight, origin, destination);
    res.json({ methods });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/delivery-dates', async (req, res) => {
  try {
    const dates = await getAvailableDeliveryDates();
    res.json({ dates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;