const Shop = require('../models/Shop');
const Order = require('../models/Order');
const Dispute = require('../models/Dispute');

// Badge definitions – each returns true if seller qualifies
const BADGE_CRITERIA = {
  verified_seller: async (shop, metrics) => {
    // Example: shop must have logo, description, and verified email
    return !!(shop.logo && shop.description && shop.domainVerified);
  },
  top_rated: async (shop, metrics) => {
    return metrics.totalOrders >= 100 &&
           metrics.completedOrders / metrics.totalOrders > 0.95 &&
           metrics.disputeLost < 2;
  },
  on_time_shipping: async (shop, metrics) => {
    return metrics.totalShipments > 0 &&
           (metrics.onTimeShipments / metrics.totalShipments) >= 0.98;
  },
  fast_shipping: async (shop, metrics) => {
    return metrics.averageShippingTime > 0 && metrics.averageShippingTime < 2; // days
  },
  fast_responder: async (shop, metrics) => {
    return metrics.averageResponseTime > 0 && metrics.averageResponseTime < 1; // hours
  },
  pro_seller: async (shop, metrics) => {
    return metrics.totalOrders >= 500 && metrics.completedOrders / metrics.totalOrders > 0.97;
  },
  rising_star: async (shop, metrics) => {
    // New seller with good metrics in last 30 days
    return metrics.totalOrders >= 10 && metrics.totalOrders < 100 &&
           metrics.completedOrders / metrics.totalOrders > 0.95 &&
           metrics.disputeLost === 0;
  },
};

// Calculate seller metrics from order & dispute data
async function calculateSellerMetrics(sellerId) {
  // All orders where seller appears (any status)
  const allOrders = await Order.find({ 'items.sellerId': sellerId });
  const totalOrders = allOrders.length;
  const completedOrders = allOrders.filter(o => o.status === 'delivered').length;
  const cancelledOrders = allOrders.filter(o => o.status === 'cancelled').length;

  // Disputes lost (resolved against seller)
  const lostDisputes = await Dispute.countDocuments({
    sellerId,
    status: 'resolved',
    resolution: { $in: ['refunded', 'partial_refund'] },
  });

  // Average shipping time (days from shipped to delivered)
  const shippedOrders = allOrders.filter(o => o.shippedAt && o.deliveredAt);
  let avgShippingDays = 0;
  if (shippedOrders.length) {
    const totalDays = shippedOrders.reduce((sum, o) => {
      const days = (o.deliveredAt - o.shippedAt) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    avgShippingDays = totalDays / shippedOrders.length;
  }

  // On‑time shipments – needs expected ship date in order (optional)
  // For now, assume any shipment with tracking and delivered is on time
  const onTimeCount = shippedOrders.length; // simplified; you can add expectedShipDate to Order model

  // Response time – requires Conversation model. We'll skip if not present.
  let avgResponseHours = 0;
  try {
    const Conversation = require('../models/Conversation');
    const conv = await Conversation.aggregate([
      { $match: { sellerId, messages: { $exists: true, $not: { $size: 0 } } } },
      { $unwind: '$messages' },
      { $match: { 'messages.senderId': { $ne: sellerId } } },
      { $group: { _id: null, avg: { $avg: { $subtract: ['$messages.repliedAt', '$messages.createdAt'] } } } },
    ]);
    if (conv.length) avgResponseHours = conv[0].avg / (1000 * 60 * 60);
  } catch (err) {
    console.warn('Conversation model not available – skipping response time');
  }

  return {
    totalOrders,
    completedOrders,
    cancelledOrders,
    disputeLost: lostDisputes,
    averageResponseTime: avgResponseHours,
    averageShippingTime: avgShippingDays,
    onTimeShipments: onTimeCount,
    totalShipments: shippedOrders.length,
  };
}

// Update badges for a seller based on current metrics
async function updateSellerBadges(sellerId) {
  const shop = await Shop.findOne({ sellerId });
  if (!shop) return [];

  const metrics = await calculateSellerMetrics(sellerId);
  // Save metrics to shop for quick access
  shop.metrics = metrics;

  const newBadges = [];
  for (const [badgeName, checkFn] of Object.entries(BADGE_CRITERIA)) {
    const eligible = await checkFn(shop, metrics);
    if (eligible) newBadges.push({ name: badgeName, awardedAt: new Date() });
  }

  // Merge – keep original awardedAt dates for badges that remain, add new ones
  const existingMap = new Map(shop.badges.map(b => [b.name, b]));
  const finalBadges = newBadges.map(b => {
    const existing = existingMap.get(b.name);
    return existing ? { ...b, awardedAt: existing.awardedAt } : b;
  });
  shop.badges = finalBadges;
  await shop.save();

  return shop.badges;
}

module.exports = { calculateSellerMetrics, updateSellerBadges };