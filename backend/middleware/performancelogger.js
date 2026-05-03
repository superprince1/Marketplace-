const performanceLogger = () => {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 500) {
        console.warn(`[SLOW API] ${req.method} ${req.url} - ${duration}ms`);
      }
    });
    next();
  };
};

module.exports = performanceLogger;