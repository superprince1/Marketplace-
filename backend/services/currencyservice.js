const axios = require('axios');
const redisClient = require('../config/redis');

const BASE_CURRENCY = 'USD';
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

// Fetch exchange rates from API and cache in Redis
const fetchExchangeRates = async () => {
  const cacheKey = `exchange_rates_${BASE_CURRENCY}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const response = await axios.get(EXCHANGE_API_URL);
    const rates = response.data.rates;
    // Cache for 12 hours (43200 seconds)
    await redisClient.setEx(cacheKey, 43200, JSON.stringify(rates));
    return rates;
  } catch (err) {
    console.error('Failed to fetch exchange rates:', err.message);
    // Return fallback rates (only USD if API fails)
    return { USD: 1 };
  }
};

// Convert amount from base currency to target currency
const convertPrice = async (amount, targetCurrency) => {
  if (targetCurrency === BASE_CURRENCY) return amount;
  const rates = await fetchExchangeRates();
  const rate = rates[targetCurrency];
  if (!rate) return amount; // fallback to base
  return amount * rate;
};

// Get exchange rate for a target currency
const getExchangeRate = async (targetCurrency) => {
  const rates = await fetchExchangeRates();
  return rates[targetCurrency] || 1;
};

module.exports = { convertPrice, getExchangeRate, fetchExchangeRates };