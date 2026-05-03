const express = require('express');
const router = express.Router();
const { addSubscriber } = require('../utils/mailchimp');

router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const listId = process.env.MAILCHIMP_AUDIENCE_ID;
    const result = await addSubscriber(email, listId, ['marketplace']);
    if (result.success) {
      res.json({ success: true, message: 'Subscribed successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;