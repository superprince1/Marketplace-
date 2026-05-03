const axios = require('axios');
const redisClient = require('../config/redis');

// Cache TTL for tax rates (1 hour)
const CACHE_TTL = 3600;

/**
 * Create a TaxJar service instance
 * @param {string} apiKey - TaxJar API key
 */
function createTaxJarService(apiKey) {
  const client = axios.create({
    baseURL: 'https://api.taxjar.com/v2',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  /**
   * Get tax rate for a shipping address
   * @param {Object} address - { country, state, city, zipCode, street? }
   * @returns {Promise<number>} tax rate as percentage (e.g., 8.25)
   */
  async function getRate(address) {
    const cacheKey = `tax:rate:${address.country}:${address.state}:${address.zipCode}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return parseFloat(cached);

    try {
      const params = {
        to_country: address.country,
        to_state: address.state,
        to_zip: address.zipCode,
        to_city: address.city,
      };
      if (address.street) params.to_street = address.street;
      const response = await client.get('/rates', { params });
      const rate = response.data.rate;
      // Combine state + combined district rate
      let totalRate = (rate.state_rate || 0) + (rate.county_rate || 0) + (rate.city_rate || 0) + (rate.combined_district_rate || 0);
      totalRate = Math.round(totalRate * 100) / 100;
      await redisClient.setex(cacheKey, CACHE_TTL, totalRate);
      return totalRate;
    } catch (err) {
      console.error('TaxJar rate error:', err.message);
      return null;
    }
  }

  /**
   * Calculate tax for an order (line items)
   * @param {Object} params - { from_address, to_address, line_items, shipping }
   * @returns {Promise<Object>} { amount_to_collect, breakdown }
   */
  async function calculateTax(params) {
    try {
      const response = await client.post('/taxes', {
        from_country: params.from_address.country,
        from_state: params.from_address.state,
        from_zip: params.from_address.zipCode,
        from_city: params.from_address.city,
        from_street: params.from_address.street,
        to_country: params.to_address.country,
        to_state: params.to_address.state,
        to_zip: params.to_address.zipCode,
        to_city: params.to_address.city,
        to_street: params.to_address.street,
        shipping: params.shipping || 0,
        line_items: params.line_items.map(li => ({
          quantity: li.quantity,
          unit_price: li.unit_price,
          product_tax_code: li.tax_code || null,
        })),
      });
      const tax = response.data.tax;
      return {
        amount_to_collect: tax.amount_to_collect,
        rate: tax.rate,
        breakdown: tax.breakdown,
      };
    } catch (err) {
      console.error('TaxJar calculation error:', err.message);
      return null;
    }
  }

  return { getRate, calculateTax };
}

/**
 * Generic tax calculation using active service or fallback
 * @param {Object} settings - PlatformSettings document
 * @param {Object} address - destination address
 * @param {Array} items - cart items with { unit_price, quantity, productTaxCode? }
 * @param {number} shippingCost - shipping cost
 * @returns {Promise<{ taxAmount: number, taxRate: number, breakdown: Object|null }>}
 */
async function calculateTaxForOrder(settings, address, items, shippingCost) {
  if (!settings.taxAutomation.enabled || settings.taxAutomation.provider === 'none') {
    const fallbackRate = settings.taxAutomation.fallbackRate || 0;
    const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    const taxableAmount = subtotal + (shippingCost || 0);
    return {
      taxAmount: (taxableAmount * fallbackRate) / 100,
      taxRate: fallbackRate,
      breakdown: null,
    };
  }

  if (settings.taxAutomation.provider === 'taxjar') {
    const service = createTaxJarService(settings.taxAutomation.apiKey);
    // Need origin address – take first nexus address or a default
    const nexus = settings.taxAutomation.nexusAddresses[0];
    if (!nexus) {
      console.warn('No nexus address configured for tax calculation');
      // fallback to simple rate
      const fallbackRate = settings.taxAutomation.fallbackRate || 0;
      const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
      const taxableAmount = subtotal + (shippingCost || 0);
      return {
        taxAmount: (taxableAmount * fallbackRate) / 100,
        taxRate: fallbackRate,
        breakdown: null,
      };
    }
    const result = await service.calculateTax({
      from_address: nexus,
      to_address: address,
      line_items: items.map(item => ({
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_code: item.productTaxCode || null,
      })),
      shipping: shippingCost,
    });
    if (result) {
      return {
        taxAmount: result.amount_to_collect,
        taxRate: result.rate,
        breakdown: result.breakdown,
      };
    } else {
      // fallback on error
      const fallbackRate = settings.taxAutomation.fallbackRate || 0;
      const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
      const taxableAmount = subtotal + (shippingCost || 0);
      return {
        taxAmount: (taxableAmount * fallbackRate) / 100,
        taxRate: fallbackRate,
        breakdown: null,
      };
    }
  }

  // Default fallback
  const fallbackRate = settings.taxAutomation.fallbackRate || 0;
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const taxableAmount = subtotal + (shippingCost || 0);
  return {
    taxAmount: (taxableAmount * fallbackRate) / 100,
    taxRate: fallbackRate,
    breakdown: null,
  };
}

module.exports = { createTaxJarService, calculateTaxForOrder };