/**
 * Database Configuration Module
 * 
 * This module handles the MongoDB connection using Mongoose.
 * It includes:
 * - Connection pooling
 * - Retry logic for failed connections
 * - Event listeners for connection status
 * - Graceful shutdown support
 * - Environment-based configuration
 */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * @param {Object} options - Optional Mongoose connection options
 * @returns {Promise<mongoose.Connection>} Mongoose connection object
 */
const connectDB = async (options = {}) => {
  try {
    // Get MongoDB URI from environment variables
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/marketplace';
    
    // Default Mongoose options
    const defaultOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,    // Timeout after 5 seconds
      socketTimeoutMS: 45000,            // Close sockets after 45 seconds
      family: 4,                         // Use IPv4, skip IPv6
      maxPoolSize: 10,                   // Maximum number of connections in pool
      minPoolSize: 2,                    // Minimum number of connections in pool
    };
    
    // Merge default options with custom options
    const mongooseOptions = { ...defaultOptions, ...options };
    
    // Connect to MongoDB
    const conn = await mongoose.connect(mongoURI, mongooseOptions);
    
    // Log successful connection
    console.log(`✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    
    // Set up connection event listeners for monitoring
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected');
    });
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Retry connection after 5 seconds (useful for transient errors)
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(() => {
      connectDB(options);
    }, 5000);
    
    // Don't exit process immediately; let retry logic handle it
    // But throw error for the caller to handle if needed
    throw error;
  }
};

/**
 * Disconnect from MongoDB gracefully
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting MongoDB:', error.message);
    throw error;
  }
};

/**
 * Check if database is currently connected
 * @returns {boolean} True if connected, false otherwise
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get current connection status as string
 * @returns {string} Connection status
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

/**
 * Wait for database connection (useful for scripts)
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>} True if connected, false if timeout
 */
const waitForConnection = async (timeout = 30000) => {
  const start = Date.now();
  while (!isConnected()) {
    if (Date.now() - start > timeout) {
      console.error('❌ Database connection timeout');
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return true;
};

// Export all functions
module.exports = {
  connectDB,
  disconnectDB,
  isConnected,
  getConnectionStatus,
  waitForConnection
};