const ShippingZone = require('../models/ShippingZone');
const ShippingRate = require('../models/ShippingRate');
const DeliveryBlackout = require('../models/DeliveryBlackout');
const { getCarrierRate } = require('./shippingCarrierService');

/**
 * Find the shipping zone for a given country (ISO code)
 * @param {string} countryCode
 * @returns {Promise<Object|null>} Zone document
 */
async function findZoneByCountry(countryCode) {
  const zone = await ShippingZone.findOne({
    countries: countryCode,
    active: true,
  });
  return zone;
}

/**
 * Calculate shipping cost based on zone, rate, weight, and origin/destination (for carriers)
 * @param {Object} zone - ShippingZone document
 * @param {Object} rate - ShippingRate document
 * @param {number} weight - total weight in kg
 * @param {Object} origin - { country, state, city, zipCode }
 * @param {Object} destination - { country, state, city, zipCode }
 * @returns {Promise<number|null>}
 */
async function calculateRateCost(zone, rate, weight, origin, destination) {
  if (!rate.isActive) return null;
  if (rate.type === 'flat') {
    return rate.flatRate;
  } else if (rate.type === 'weight_based') {
    const range = rate.weightBasedRanges.find(
      r => weight >= r.minWeight && weight <= r.maxWeight
    );
    return range ? range.price : null;
  } else if (rate.type === 'carrier') {
    return await getCarrierRate(rate, origin, destination, weight);
  }
  return null;
}

/**
 * Get all available shipping methods for a destination and cart weight
 * @param {string} countryCode - ISO country code of destination
 * @param {number} weight - total cart weight in kg
 * @param {Object} origin - seller's shipping origin (from shop settings)
 * @param {Object} destination - buyer's address
 * @returns {Promise<Array>} List of methods with name, price, estimated days
 */
async function getShippingMethods(countryCode, weight, origin, destination) {
  const zone = await findZoneByCountry(countryCode);
  if (!zone) return [];

  const rates = await ShippingRate.find({ zoneId: zone._id, isActive: true });
  const methods = [];
  for (const rate of rates) {
    const cost = await calculateRateCost(zone, rate, weight, origin, destination);
    if (cost !== null && cost >= 0) {
      methods.push({
        id: rate._id,
        name: rate.name,
        price: cost,
        estimatedDays: rate.estimatedDaysMax
          ? `${rate.estimatedDaysMin || 1}-${rate.estimatedDaysMax} days`
          : null,
      });
    }
  }
  // Sort by price ascending
  return methods.sort((a, b) => a.price - b.price);
}

/**
 * Get available delivery dates (e.g., next 14 days, excluding blackout dates and weekends? optional)
 * @param {number} leadTimeDays - days from today required to process order
 * @returns {Promise<Array>} List of date strings (YYYY-MM-DD)
 */
async function getAvailableDeliveryDates(leadTimeDays = 1) {
  const blackouts = await DeliveryBlackout.find({ date: { $gte: new Date() } }).select('date');
  const blackoutSet = new Set(blackouts.map(b => b.date.toISOString().split('T')[0]));

  const dates = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + leadTimeDays);
  for (let i = 0; i < 30; i++) {
    const candidate = new Date(startDate);
    candidate.setDate(startDate.getDate() + i);
    const dateStr = candidate.toISOString().split('T')[0];
    if (!blackoutSet.has(dateStr)) {
      dates.push(dateStr);
    }
    if (dates.length >= 14) break; // show up to 14 dates
  }
  return dates;
}

module.exports = {
  findZoneByCountry,
  getShippingMethods,
  getAvailableDeliveryDates,
};