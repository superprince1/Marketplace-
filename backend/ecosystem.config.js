/**
 * PM2 Ecosystem Configuration
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 reload ecosystem.config.js   (zero-downtime restart)
 *   pm2 delete ecosystem.config.js
 *   pm2 logs backend               (view logs)
 * 
 * Features:
 *   - Cluster mode (multi‑core) for high availability
 *   - Environment variables per stage (development, staging, production)
 *   - Automatic restart on crash
 *   - Log file management (error & output separated)
 *   - Graceful shutdown (SIGINT / SIGTERM)
 *   - Watch mode (disabled in production)
 *   - Merge logs to avoid corruption
 */
module.exports = {
  apps: [
    {
      // Application name (used by PM2 commands)
      name: 'marketplace-backend',

      // Entry point
      script: './server.js',

      // Run in cluster mode (use all CPU cores)
      instances: 'max',
      exec_mode: 'cluster',

      // Watch for changes (disabled in production – use reload instead)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],

      // Maximum memory before restart (e.g., 512M, 1G)
      max_memory_restart: '1G',

      // Restart policy
      autorestart: true,
      max_restarts: 10,               // Max consecutive restarts before stopping
      min_uptime: '10s',              // Minimum uptime before considered "started"
      restart_delay: 4000,            // Delay between restarts

      // Environment variables (default)
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        CLIENT_URL: 'http://localhost:3000',
        SENTRY_DSN: '',
        STRIPE_SECRET_KEY: '',
        STRIPE_WEBHOOK_SECRET: '',
        // Add other required env vars here
      },

      // Environment for staging (overrides default)
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5000,
        CLIENT_URL: 'https://staging.yourdomain.com',
        SENTRY_DSN: process.env.SENTRY_DSN,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      },

      // Environment for production (overrides default)
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        CLIENT_URL: 'https://yourdomain.com',
        SENTRY_DSN: process.env.SENTRY_DSN,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      },

      // Logging
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      merge_logs: true,               // Combine logs from all instances
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Time between keep‑alive pings (avoid idle timeouts)
      kill_timeout: 5000,             // Time to wait before force‑killing process
      listen_timeout: 5000,           // Time to wait for app to start listening

      // Instance variables (optional)
      instance_var: 'INSTANCE_ID',

      // Graceful shutdown – send SIGINT then wait before SIGKILL
      // (Your server.js should handle SIGINT gracefully)
      shutdown_with_message: false,
    },
  ],

  // Deploy configuration (optional – for PM2 deploy)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/marketplace-backend.git',
      path: '/var/www/marketplace-backend',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
    },
  },
};