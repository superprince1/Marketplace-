const User = require('../models/User');
const Affiliate = require('../models/Affiliate');

const addEarningsToSeller = async (order) => {
  if (!order.sellerEarnings) return;
  const seller = await User.findById(order.items[0].sellerId);
  if (seller) {
    await seller.addEarnings(order.sellerEarnings);
  }
};

const addAffiliateCommission = async (order) => {
  if (!order.referredBy) return;
  const affiliate = await Affiliate.findOne({ affiliateCode: order.referredBy });
  if (affiliate) {
    const commission = (order.total * affiliate.commissionRate) / 100;
    affiliate.pendingEarnings += commission;
    affiliate.totalEarnings += commission;
    await affiliate.save();
  }
};

module.exports = { addEarningsToSeller, addAffiliateCommission };