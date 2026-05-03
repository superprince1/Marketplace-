/**
 * Logger Configuration - Winston
 * 
 * Features:
 * - Console logging (colored, timestamped) for development
 * - File logging for production (error.log, combined.log, out.log)
 * - Daily rotation (keeps 14 days of logs)
 * - JSON format for structured logging
 * - Separate error log for critical issues
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Log directory
const logDir = path.join(__dirname, '../logs');

// Custom format for console (human‑readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// JSON format for files (structured, easier to parse)
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  transports: [
    // Console transport (for development/staging)
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log') }),
  ],
});

// Add file transports only in production (or always)
if (process.env.NODE_ENV === 'production' || true) { // Always enabled for this setup
  // Combined log (info, warn, error)
  const combinedRotate = new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: jsonFormat,
  });

  // Error-only log
  const errorRotate = new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: jsonFormat,
  });

  // All output (same as combined, but named out.log for compatibility)
  const outRotate = new DailyRotateFile({
    filename: path.join(logDir, 'out-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: jsonFormat,
  });

  logger.add(combinedRotate);
  logger.add(errorRotate);
  logger.add(outRotate);
}

// Helper to log HTTP requests (Express middleware)
logger.httpMiddleware = () => (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger.log({
      level: logLevel,
      message: 'HTTP Request',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  next();
};

// Helper for database queries (optional)
logger.dbQuery = (query, duration, success = true) => {
  logger.info('Database Query', {
    query: query.substring(0, 200),
    duration: `${duration}ms`,
    success,
  });
};

// Helper for API responses
logger.api = (req, res, data) => {
  logger.info('API Response', {
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    statusCode: res.statusCode,
    responseSize: JSON.stringify(data).length,
  });
};

module.exports = logger;