const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  savePushSubscription,
} = require('../services/notificationService');

// Get user's notifications (paginated)
router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { notifications, total, unreadCount } = await getUserNotifications(req.user.id, parseInt(page), parseInt(limit));
  res.json({ success: true, notifications, total, unreadCount });
});

// Mark a single notification as read
router.put('/:id/read', auth, async (req, res) => {
  await markAsRead(req.params.id, req.user.id);
  res.json({ success: true });
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  await markAllAsRead(req.user.id);
  res.json({ success: true });
});

// Save push subscription (for web push)
router.post('/push-subscribe', auth, async (req, res) => {
  const { subscription, userAgent } = req.body;
  await savePushSubscription(req.user.id, subscription, userAgent);
  res.json({ success: true });
});

module.exports = router;