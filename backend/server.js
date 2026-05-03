/**
 * Server Entry Point - Production Ready Marketplace Server
 * Final Optimized Version (2026) - Fully Fixed with All Cron Jobs, Winston Logging & Custom Headers
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const responseTime = require('response-time');
const statusMonitor = require('express-status-monitor')();
const compression = require('compression');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
dotenv.config();

// ==================== LOGGER (Winston) ====================
const logger = require('./config/logger');

// Override console methods to use Winston
console.log = (...args) => logger.info(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));

const app = express();
const server = http.createServer(app);

// ==================== CUSTOM HEADERS MIDDLEWARE ====================
// Must be placed after helmet but before routes
const setCustomHeaders = require('./middleware/headers');

// ==================== SENTRY (MONITORING) ====================

let Sentry;
try {
  Sentry = require('@sentry/node');

  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1
    });

    // The request handler must be the first middleware on the app
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }
} catch (e) {
  logger.warn('Sentry disabled or not installed');
}

// ==================== DATABASE & CACHE ====================

const { connectDB } = require('./config/db');
const redisClient = require('./config/redis');

// ==================== CRON JOBS ====================

require('./jobs/retryWebhooks');
require('./jobs/abandonedCartReminder');
require('./jobs/updateBadges');
require('./jobs/refreshSitemap');
require('./jobs/accountDeletion');

// ==================== STRIPE WEBHOOK (CRITICAL FIX) ====================

const stripeWebhookRoutes = require('./routes/stripeWebhook');

// Stripe requires the raw body for signature verification.
// This MUST be defined before express.json()
app.use(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookRoutes
);

// ==================== SECURITY & PERFORMANCE ====================

app.set('trust proxy', 1); // Required for rate limiting behind proxies
app.use(helmet());
app.use(setCustomHeaders);      // ✅ Custom security & performance headers
app.use(compression());
app.use(cookieParser());

// HTTP request logging middleware (Winston)
app.use(logger.httpMiddleware());

app.use(responseTime((req, res, time) => {
  if (time > 500) {
    logger.warn(`⚠️ Slow request: ${req.method} ${req.url} ${Math.round(time)}ms`);
  }
}));

app.use('/status', statusMonitor);

// ==================== CORS (FIXED) ====================

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow mobile apps/server-to-server (no origin) or whitelisted domains
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Accept-Language', 'X-Session-Id']
}));

// ==================== BODY PARSING ====================

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ==================== SESSION TRACKING ====================

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    if (!req.cookies.session_id) {
      const sessionId = crypto.randomUUID();
      res.cookie('session_id', sessionId, {
        httpOnly: true,
        maxAge: 2592000000, // 30 days
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      req.cookies.session_id = sessionId;
    }
  }
  next();
});

// ==================== i18n + RECURSIVE SANITIZE ====================

app.use((req, res, next) => {
  // Language detection
  const lang =
    req.query.lang ||
    req.headers['accept-language']?.split(',')[0].split('-')[0] ||
    'en';
  req.lang = /^[a-z]{2}$/.test(lang) ? lang : 'en';

  // Recursive Sanitization for deep objects/arrays
  const sanitize = (val) => {
    if (typeof val === 'string') {
      return val.replace(/[<>]/g, '').trim();
    }
    if (Array.isArray(val)) {
      return val.map(sanitize);
    }
    if (val !== null && typeof val === 'object') {
      Object.keys(val).forEach(k => {
        val[k] = sanitize(val[k]);
      });
    }
    return val;
  };

  if (req.body) req.body = sanitize(req.body);
  next();
});

// ==================== RATE LIMITING ====================

const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ==================== ROUTES ====================

const routesMap = {
  auth: './routes/auth',
  products: './routes/products',
  orders: './routes/orders',
  reviews: './routes/reviews',
  wishlist: './routes/wishlist',
  chat: './routes/chat',
  shop: './routes/shop',
  coupons: './routes/coupons',
  analytics: './routes/analytics',
  blog: './routes/blog',
  newsletter: './routes/newsletter',
  upload: './routes/upload',
  digital: './routes/digital',
  affiliate: './routes/affiliate',
  ai: './routes/ai',
  cart: './routes/cart',
  subscription: './routes/subscription',
  notifications: './routes/notifications',
  currency: './routes/currency',
  disputes: './routes/disputes',
  'gift-cards': './routes/giftCards',
  'buyer-subscription': './routes/buyerSubscription',
  social: './routes/social',
  gdpr: './routes/gdpr',
  pages: './routes/pages',
  shipping: './routes/shipping',
  tax: './routes/tax',
  experiments: './routes/experiments',
  user: './routes/user'
};

Object.entries(routesMap).forEach(([pathName, file]) => {
  app.use(`/api/${pathName}`, require(file));
});

// Admin nested routes
app.use('/api/admin/homepage', require('./routes/adminHomepage'));
app.use('/api/admin/settings', require('./routes/adminSettings'));
app.use('/api/admin/fraud', require('./routes/adminFraud'));
app.use('/api/admin', require('./routes/adminWebhooks'));

// Specific recommendations router
app.use('/api/recommendations', require('./routes/recommendations').router);

// SEO Files
app.use('/', require('./routes/sitemap'));
app.use('/', require('./routes/robots'));

// ==================== SOCKET.IO ====================

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('joinConversation', id => socket.join(id));
  socket.on('sendMessage', data => io.to(data.conversationId).emit('newMessage', data));
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// ==================== STATIC ASSETS / SPA (PRODUCTION) ====================
// Serves the built React frontend and ensures client‑side routing works.
// This MUST be placed after all API routes but before the API 404 handler.
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(buildPath));

  // Catch‑all route: serve index.html for any request that is not an API route.
  // React Router will handle the client‑side routing.
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(buildPath, 'index.html'));
  });
}

// ==================== API 404 HANDLER ====================
// Any request starting with /api/ that wasn't matched by an API route returns a JSON 404.
// This prevents API calls from accidentally receiving the HTML file.
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// ==================== ERROR HANDLING ====================

if (Sentry) app.use(Sentry.Handlers.errorHandler());

app.use((err, req, res, next) => {
  logger.error('🔥 Server error:', { error: err.message, stack: err.stack, url: req.url, method: req.method });

  const status = err.name === 'ValidationError' ? 400 : (err.status || 500);
  
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    logger.info('✅ Database connected');
    
    try {
      await redisClient.ping();
      logger.info('✅ Redis connected');
    } catch (e) {
      logger.warn('⚠️ Redis offline - caching/sessions may be limited');
    }

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (err) {
    logger.error('❌ Startup error:', err);
    process.exit(1);
  }
};

// ==================== GRACEFUL SHUTDOWN ====================

const shutdown = () => {
  logger.info('🛑 Shutting down gracefully...');
  
  // Close socket connections
  io.close();

  server.close(async () => {
    logger.info('✅ HTTP server closed');
    await redisClient.quit().catch(() => {});
    process.exit(0);
  });

  // Force exit if shutdown takes too long
  setTimeout(() => {
    logger.error('⚠️ Shutdown timed out, forcing exit');
    process.exit(1);
  }, 5000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (require.main === module) startServer();

module.exports = { app, server, startServer };