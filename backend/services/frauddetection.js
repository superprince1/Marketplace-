const geoip = require('geoip-lite');
const FraudAlert = require('../models/FraudAlert');
const Order = require('../models/Order');

// Helper: get IP from request
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
};

// Suspicious email domains (disposable / temporary)
const suspiciousDomains = [
  'tempmail', 'throwaway', 'guerrillamail', 'mailinator', '10minutemail',
  'yopmail', 'trashmail', 'temp-mail', 'fakeinbox', 'getairmail',
];

const isSuspiciousEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return suspiciousDomains.some(d => domain.includes(d));
};

// Suspicious address keywords
const suspiciousAddressKeywords = ['po box', 'p.o. box', 'post office box', 'null', 'none', 'n/a'];

const isSuspiciousAddress = (address) => {
  if (!address) return false;
  const lower = address.toLowerCase();
  return suspiciousAddressKeywords.some(k => lower.includes(k));
};

// Calculate risk score and reasons
const analyzeOrder = async (order, req) => {
  const reasons = [];
  let totalScore = 0;

  // 1. Order amount (compared to platform average)
  const allOrders = await Order.find({ paymentStatus: 'paid' });
  const avgOrderAmount = allOrders.reduce((sum, o) => sum + o.total, 0) / (allOrders.length || 1);
  if (order.total > avgOrderAmount * 3) {
    const points = Math.min(30, Math.floor((order.total / avgOrderAmount) * 10));
    totalScore += points;
    reasons.push({
      rule: 'order_amount_high',
      points,
      description: `Order amount $${order.total.toFixed(2)} exceeds 3x average ($${avgOrderAmount.toFixed(2)})`,
    });
  }

  // 2. Suspicious email domain
  if (isSuspiciousEmail(order.buyerInfo.email)) {
    totalScore += 20;
    reasons.push({
      rule: 'suspicious_email',
      points: 20,
      description: `Email domain ${order.buyerInfo.email.split('@')[1]} is known for disposable/temporary emails`,
    });
  }

  // 3. Suspicious shipping address
  const addressStr = `${order.shippingAddress.street} ${order.shippingAddress.city} ${order.shippingAddress.state}`;
  if (isSuspiciousAddress(addressStr)) {
    totalScore += 15;
    reasons.push({
      rule: 'suspicious_address',
      points: 15,
      description: `Shipping address contains suspicious keywords (PO Box, etc.)`,
    });
  }

  // 4. IP geolocation mismatch (if billing address country is set)
  const clientIp = getClientIp(req);
  if (clientIp && clientIp !== '::1' && order.billingAddress?.country) {
    const geo = geoip.lookup(clientIp);
    if (geo && geo.country !== order.billingAddress.country) {
      totalScore += 15;
      reasons.push({
        rule: 'ip_country_mismatch',
        points: 15,
        description: `IP (${clientIp}) location ${geo.country} does not match billing country ${order.billingAddress.country}`,
      });
    }
  }

  // 5. Multiple orders from same IP in last hour
  const recentOrders = await Order.find({
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
  });
  const ipOrders = recentOrders.filter(o => o.ipAddress === clientIp);
  if (ipOrders.length >= 3) {
    totalScore += 10;
    reasons.push({
      rule: 'multiple_orders_same_ip',
      points: 10,
      description: `${ipOrders.length} orders from same IP in the last hour`,
    });
  }

  // 6. User velocity (orders by same user in last hour)
  const userOrders = recentOrders.filter(o => o.buyerId.toString() === order.buyerId.toString());
  if (userOrders.length >= 2) {
    totalScore += 10;
    reasons.push({
      rule: 'high_order_velocity',
      points: 10,
      description: `${userOrders.length} orders by same user in last hour`,
    });
  }

  // Cap at 100
  totalScore = Math.min(100, totalScore);

  let riskLevel = 'low';
  if (totalScore >= 70) riskLevel = 'critical';
  else if (totalScore >= 50) riskLevel = 'high';
  else if (totalScore >= 25) riskLevel = 'medium';

  return { riskScore: totalScore, riskLevel, reasons };
};

const createFraudAlert = async (order, riskScore, riskLevel, reasons) => {
  const alert = new FraudAlert({
    orderId: order._id,
    riskScore,
    riskLevel,
    reasons,
    status: riskLevel === 'critical' || riskLevel === 'high' ? 'pending' : 'approved', // auto‑approve low/medium
  });
  await alert.save();
  return alert;
};

module.exports = { analyzeOrder, createFraudAlert };