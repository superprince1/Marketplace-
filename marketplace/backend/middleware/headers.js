/**
 * Custom Headers Middleware
 * 
 * Sets additional security and performance headers that complement Helmet.
 * Features:
 * - Strict Transport Security (HSTS) – enforce HTTPS
 * - Content Security Policy (CSP) with custom directives
 * - Permission Policy (formerly Feature Policy)
 * - Remove X-Powered-By (Helmet already does this, but kept as example)
 * - Custom API version header
 * - Request ID header for tracing
 * - Cache control for API responses
 */

const crypto = require('crypto');

/**
 * Generate unique request ID for tracing
 */
function generateRequestId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Main header middleware
 */
function setCustomHeaders(req, res, next) {
  // Request ID (for logging & debugging)
  const requestId = req.headers['x-request-id'] || generateRequestId();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Strict Transport Security (HSTS) – enforce HTTPS
  // Only set in production, and only if request is over HTTPS
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Content Security Policy (CSP)
  // Customize these directives based on your needs
  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", 'https://js.stripe.com', 'https://www.google.com/recaptcha/'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'https://res.cloudinary.com', 'https://via.placeholder.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'https://api.stripe.com', 'wss://yourdomain.com'],
    'frame-src': ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  // Build CSP string
  const csp = Object.entries(cspDirectives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');

  res.setHeader('Content-Security-Policy', csp);

  // Permission Policy (formerly Feature Policy)
  // Disable unnecessary browser features
  const permissions = {
    geolocation: "'none'",
    microphone: "'none'",
    camera: "'none'",
    payment: "'self'",
    usb: "'none'",
    magnetometer: "'none'",
    accelerometer: "'none'",
    gyroscope: "'none'",
    speaker: "'none'",
    vibrate: "'none'",
    fullscreen: "'self'",
  };
  const permissionPolicy = Object.entries(permissions)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
  res.setHeader('Permissions-Policy', permissionPolicy);

  // Cache control for API responses (prevent caching of sensitive data)
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Cross-Origin-Resource-Policy (prevent cross-origin resource loading)
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Cross-Origin-Opener-Policy (isolate browsing context)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Cross-Origin-Embedder-Policy (require explicit permission for cross-origin resources)
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  // API version header (you can set from environment)
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');

  next();
}

module.exports = setCustomHeaders;