const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const webpush = require('web-push');

// Configure web‑push (use VAPID keys)
webpush.setVapidDetails(
  'mailto:' + process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Create an in‑app notification and also send a push notification if the user is subscribed.
 */
const notifyUser = async (userId, type, title, message, link = '', metadata = {}) => {
  // Save to database
  const notification = new Notification({
    userId,
    type,
    title,
    message,
    link,
    metadata,
  });
  await notification.save();

  // Send push notification to all user's subscriptions
  const subscriptions = await PushSubscription.find({ userId });
  const payload = JSON.stringify({
    title,
    body: message,
    icon: '/logo192.png',
    badge: '/badge.png',
    data: { url: link, notificationId: notification._id.toString() },
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      );
    } catch (err) {
      // If subscription is invalid, remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await PushSubscription.deleteOne({ endpoint: sub.endpoint });
      } else {
        console.error(`Push error for user ${userId}:`, err.message);
      }
    }
  }

  return notification;
};

/**
 * Get user's notifications (paginated)
 */
const getUserNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const total = await Notification.countDocuments({ userId });
  const unreadCount = await Notification.countDocuments({ userId, read: false });
  return { notifications, total, unreadCount };
};

/**
 * Mark a notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const notif = await Notification.findOne({ _id: notificationId, userId });
  if (notif) {
    notif.read = true;
    await notif.save();
  }
  return notif;
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId) => {
  await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
};

/**
 * Save a push subscription
 */
const savePushSubscription = async (userId, subscription, userAgent) => {
  // Remove old identical endpoint if exists
  await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
  const newSub = new PushSubscription({
    userId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    userAgent,
  });
  await newSub.save();
  return newSub;
};

module.exports = {
  notifyUser,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  savePushSubscription,
};