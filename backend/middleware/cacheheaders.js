const cacheHeaders = (maxAge = 60) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`);
    }
    next();
  };
};

module.exports = cacheHeaders;