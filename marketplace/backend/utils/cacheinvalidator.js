const { invalidatePattern } = require('../middleware/cache');

const invalidateProductCaches = async () => {
  await invalidatePattern('cache:/api/products*');
  await invalidatePattern('cache:/api/admin/homepage/public');
};

module.exports = { invalidateProductCaches };