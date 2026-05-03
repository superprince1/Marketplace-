const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const GiftCard = require('../models/GiftCard');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

// ========== Purchase a gift card (buyer pays with real money) ==========
// This endpoint creates a gift card (unpaid until payment completes).
// For simplicity, we assume the payment is processed separately;
// here we just record the gift card after successful payment.
// Usually you would integrate with your existing checkout: add a product "Gift Card $X".
// We'll provide a direct creation endpoint for simplicity.
router.post(
  '/purchase',
  auth,
  [
    body('amount').isFloat({ min: 5, max: 1000 }).toFloat(),
    body('recipientEmail').optional().isEmail().normalizeEmail(),
    body('recipientName').optional().trim().escape(),
    body('message').optional().trim().escape().isLength({ max: 500 }),
    body('sendViaEmail').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { amount, recipientEmail, recipientName, message, sendViaEmail } = req.body;
      const buyerId = req.user.id;

      // Create gift card (balance = amount)
      const giftCard = new GiftCard({
        originalAmount: amount,
        remainingBalance: amount,
        buyerId,
        recipientEmail: recipientEmail || req.user.email,
        recipientName: recipientName || req.user.name,
        message: message || '',
      });
      await giftCard.save();

      // Optionally send email to recipient
      if (sendViaEmail && recipientEmail) {
        const subject = `You've received a $${amount} gift card!`;
        const html = `
          <h2>Gift Card from ${req.user.name}</h2>
          <p>${message || 'Enjoy shopping with us!'}</p>
          <p><strong>Code:</strong> ${giftCard.code}</p>
          <p>Amount: $${amount}</p>
          <p>Click <a href="${process.env.CLIENT_URL}/redeem-gift-card?code=${giftCard.code}">here</a> to redeem.</p>
        `;
        await sendEmail(recipientEmail, subject, html);
      }

      // For actual payment, you would integrate with your payment gateway.
      // For now, we assume the card is paid. In production, you'd wait for payment confirmation.

      res.status(201).json({
        success: true,
        giftCard: {
          code: giftCard.code,
          amount: giftCard.originalAmount,
          recipientEmail: giftCard.recipientEmail,
        },
      });
    } catch (err) {
      console.error('Purchase gift card error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ========== Get my gift cards (as buyer) ==========
router.get('/my', auth, async (req, res) => {
  try {
    const giftCards = await GiftCard.find({ buyerId: req.user.id }).sort({ purchasedAt: -1 });
    res.json({ success: true, giftCards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Redeem gift card (apply to user's store credit) ==========
router.post('/redeem', auth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  try {
    const giftCard = await GiftCard.findOne({ code: code.toUpperCase() });
    if (!giftCard) return res.status(404).json({ error: 'Invalid gift card code' });
    if (!giftCard.isActive) return res.status(400).json({ error: 'Gift card is inactive' });
    if (giftCard.isExpired) return res.status(400).json({ error: 'Gift card has expired' });
    if (giftCard.remainingBalance <= 0) return res.status(400).json({ error: 'Gift card has no balance' });

    const user = await User.findById(req.user.id);
    await user.addStoreCredit(
      giftCard.remainingBalance,
      'gift_card_redemption',
      `Redeemed gift card ${giftCard.code}`,
      giftCard._id
    );
    // Mark gift card as fully used
    giftCard.remainingBalance = 0;
    giftCard.isActive = false;
    await giftCard.save();

    res.json({ success: true, newBalance: user.storeCredit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Apply store credit to an order (called at checkout) ==========
// Note: this would be integrated into the order creation flow,
// but we provide a separate endpoint to check available credit.
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('storeCredit');
    res.json({ success: true, storeCredit: user.storeCredit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Admin: adjust store credit for a user ==========
router.post('/admin/credit', auth, async (req, res) => {
  // You must have admin middleware; for brevity, check isAdmin
  const { userId, amount, reason } = req.body;
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await user.addStoreCredit(amount, 'admin_adjustment', reason);
  res.json({ success: true, newBalance: user.storeCredit });
});

module.exports = router;