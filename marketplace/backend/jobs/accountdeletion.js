/**
 * jobs/accountDeletion.js
 * Deletes accounts that have passed the 30-day grace period.
 * Runs daily.
 */

const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Activity = require('../models/Activity');
const cron = require('node-cron');

async function processDeletions() {
  console.log('[GDPR] Processing account deletions...');
  const now = new Date();
  const usersToDelete = await User.find({
    deletionRequestedAt: { $ne: null },
    deletionScheduledFor: { $lte: now },
  });

  for (const user of usersToDelete) {
    console.log(`[GDPR] Deleting user ${user.email} (${user._id})`);
    // Anonymize or hard delete? GDPR allows anonymization.
    // We'll anonymize personal data and optionally keep order history for legal reasons.
    await User.updateOne({ _id: user._id }, {
      name: 'Deleted User',
      email: `deleted_${user._id}@anonymized.xyz`,
      phone: '',
      address: {},
      avatar: '',
      isActive: false,
      deletionRequestedAt: null,
      deletionScheduledFor: null,
      $unset: { password: 1, resetPasswordToken: 1, balance: 1, totalEarned: 1, storeCredit: 1 },
    });
    // Remove references in reviews
    await Review.updateMany({ userId: user._id }, { userId: null, name: 'Anonymous' });
    await Activity.updateMany({ userId: user._id }, { userId: null });
  }
  console.log(`[GDPR] Processed ${usersToDelete.length} deletions.`);
}

if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 3 * * *', processDeletions);
}

module.exports = processDeletions;