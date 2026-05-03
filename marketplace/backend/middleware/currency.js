const geoip = require('geoip-lite');
const { convertPrice } = require('../services/currencyService');

// Mapping from country code to preferred currency
const currencyMap = {
  US: 'USD', GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR',
  NG: 'NGN', CA: 'CAD', AU: 'AUD', JP: 'JPY', IN: 'INR',
  // Add more as needed
};

/**
 * Detect currency from IP address (if no user preference)
 */
const detectCurrencyFromIP = (req) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    // Skip private IPs for development
    if (ip === '::1' || ip === '127.0.0.1') return null;
    const geo = geoip.lookup(ip);
    if (geo && currencyMap[geo.country]) {
      return currencyMap[geo.country];
    }
    return null;
  } catch (err) {
    console.error('GeoIP detection error:', err);
    return null;
  }
};

/**
 * Middleware to set target currency.
 * Priority: 1) Query param, 2) Header, 3) Cookie, 4) IP detection, 5) USD default
 */
const currencyMiddleware = async (req, res, next) => {
  let currency = null;

  // 1. Query parameter ?currency=EUR
  if (req.query.currency) {
    currency = req.query.currency.toUpperCase();
  }
  // 2. Header x-currency
  else if (req.headers['x-currency']) {
    currency = req.headers['x-currency'].toUpperCase();
  }
  // 3. Cookie
  else if (req.cookies?.currency) {
    currency = req.cookies.currency;
  }
  // 4. IP detection
  else {
    currency = detectCurrencyFromIP(req);
  }

  // Validate format (3 uppercase letters)
  if (!currency || !/^[A-Z]{3}$/.test(currency)) {
    currency = 'USD';
  }

  req.targetCurrency = currency;
  req.convertPrice = async (amount) => convertPrice(amount, currency);
  next();
};

module.exports = currencyMiddleware;