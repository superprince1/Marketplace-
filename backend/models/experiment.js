const mongoose = require('mongoose');

const TargetRuleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['new_user', 'returning_user', 'country', 'device', 'browser', 'custom'],
    required: true,
  },
  operator: {
    type: String,
    enum: ['eq', 'neq', 'in', 'contains', 'regex'],
    default: 'eq',
  },
  value: mongoose.Schema.Types.Mixed,
});

const VariantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  weight: { type: Number, default: 1, min: 0 }, // traffic percentage weight (sum of weights across variants = 100%)
  config: { type: mongoose.Schema.Types.Mixed, default: {} }, // any data: layout name, price modifier, banner id, etc.
  isControl: { type: Boolean, default: false }, // if true, this is the control group (baseline)
});

const ExperimentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    status: { type: String, enum: ['draft', 'active', 'paused', 'completed'], default: 'draft' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    variants: [VariantSchema],
    targetRules: [TargetRuleSchema], // if empty, applies to all users
    // Traffic allocation: percentage of total users that will see this experiment
    trafficAllocation: { type: Number, default: 100, min: 0, max: 100 },
    // Objective (primary metric)
    objective: { type: String, enum: ['conversion', 'revenue', 'click', 'engagement'], default: 'conversion' },
    // Stats
    impressions: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ExperimentSchema.methods.getTotalWeight = function() {
  return this.variants.reduce((sum, v) => sum + v.weight, 0);
};

ExperimentSchema.methods.normalizeWeights = function() {
  const total = this.getTotalWeight();
  if (total === 0) return;
  this.variants.forEach(v => {
    v.weight = (v.weight / total) * 100;
  });
};

module.exports = mongoose.model('Experiment', ExperimentSchema);