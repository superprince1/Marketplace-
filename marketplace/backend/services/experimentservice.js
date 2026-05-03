const crypto = require('crypto');
const Experiment = require('../models/Experiment');

// Deterministically assign a user to a variant based on userId (or sessionId) and experimentId
function getVariantAssignment(userId, experiment, sessionId = null) {
  const identifier = userId || sessionId || crypto.randomUUID();
  const hash = crypto.createHash('md5').update(`${experiment._id}:${identifier}`).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const percent = hashInt % 100;

  // Check traffic allocation: only a percentage of users see the experiment
  if (percent >= experiment.trafficAllocation) {
    return null; // user not in experiment (control outside experiment)
  }

  // Determine variant by weights
  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (percent < cumulative) {
      return variant;
    }
  }
  return experiment.variants[0] || null;
}

// Get variant for a user, optionally store assignment in session (or cache)
async function getVariant(experimentName, userId, sessionId = null) {
  const experiment = await Experiment.findOne({ name: experimentName, status: 'active' });
  if (!experiment) return null;
  // Optionally apply target rules (simplified: check against user object)
  // We'll handle target rules in the route.
  const variant = getVariantAssignment(userId, experiment, sessionId);
  if (variant) {
    // Record impression (increment counter)
    await Experiment.updateOne({ _id: experiment._id }, { $inc: { impressions: 1 } });
  }
  return variant;
}

// Track conversion for an experiment
async function trackConversion(experimentName, userId, sessionId = null, metadata = {}) {
  const experiment = await Experiment.findOne({ name: experimentName });
  if (!experiment) return false;
  // Optionally check if user was assigned to this experiment (could use assignment cookie/storage)
  // For simplicity, just increment conversions
  await Experiment.updateOne({ _id: experiment._id }, { $inc: { conversions: 1 } });
  return true;
}

module.exports = { getVariant, trackConversion };