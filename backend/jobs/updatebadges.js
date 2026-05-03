const cron = require('node-cron');
const User = require('../models/User');
const { updateSellerBadges } = require('../services/badgeService');

async function runBadgeUpdate() {
  console.log('[Badge Job] Updating seller badges...');
  const sellers = await User.find({ role: 'seller' }).select('_id');
  for (const seller of sellers) {
    try {
      await updateSellerBadges(seller._id);
    } catch (err) {
      console.error(`Failed to update badges for seller ${seller._id}:`, err.message);
    }
  }
  console.log('[Badge Job] Update completed');
}

if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 2 * * *', runBadgeUpdate); // 2 AM daily
}

module.exports = runBadgeUpdate;