/**
 * API Service – Marketplace Frontend
 * 
 * This module handles all HTTP requests to the backend.
 * Features:
 * - Centralized base URL configuration
 * - Automatic JWT token injection
 * - Response interceptor for token expiration (401)
 * - Blob handling for file downloads (CSV exports)
 * - Comprehensive error handling
 * - Organized by feature (Auth, Products, Orders, Admin, Payment)
 */

import axios from 'axios';

// ========== CONFIGURATION ==========
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Create axios instance
const API = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: DEFAULT_TIMEOUT,
});

// ========== REQUEST INTERCEPTOR ==========
// Automatically attach JWT token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ========== RESPONSE INTERCEPTOR ==========
// Handle global errors (401, network issues)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      console.warn('[API] Unauthorized – clearing token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Log network errors
    if (error.message === 'Network Error') {
      console.error('[API] Network error – backend may be down');
    }
    
    return Promise.reject(error);
  }
);

// ========== HELPER: Error Normalization ==========
const normalizeError = (error, defaultMessage = 'An error occurred') => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return defaultMessage;
};

// ========== AUTHENTICATION ENDPOINTS ==========

/**
 * Register a new user
 * @param {Object} userData - { name, email, password, role, phone, address }
 * @returns {Promise<Object>} - { token, user }
 */
export const register = async (userData) => {
  try {
    const response = await API.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Registration failed'));
  }
};

/**
 * Login user
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} - { token, user }
 */
export const login = async (credentials) => {
  try {
    const response = await API.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Login failed'));
  }
};

/**
 * Get current logged-in user
 * @returns {Promise<Object>} - { user }
 */
export const getCurrentUser = async () => {
  try {
    const response = await API.get('/auth/me');
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to get user'));
  }
};

/**
 * Update user profile
 * @param {Object} profileData - { name, phone, address, avatar }
 * @returns {Promise<Object>} - { user }
 */
export const updateProfile = async (profileData) => {
  try {
    const response = await API.put('/auth/profile', profileData);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Profile update failed'));
  }
};

/**
 * Change user password
 * @param {Object} passwordData - { currentPassword, newPassword }
 * @returns {Promise<Object>} - { message }
 */
export const changePassword = async (passwordData) => {
  try {
    const response = await API.put('/auth/change-password', passwordData);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Password change failed'));
  }
};

// ========== PRODUCT ENDPOINTS (PUBLIC & SELLER) ==========

/**
 * Get products with filtering, sorting, pagination
 * @param {Object} params - { page, limit, sort, category, minPrice, maxPrice, search, sellerId, featured }
 * @returns {Promise<Object>} - { products, pagination }
 */
export const getProducts = async (params = {}) => {
  try {
    const response = await API.get('/products', { params });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load products'));
  }
};

/**
 * Get single product by ID
 * @param {string} id - Product ID
 * @returns {Promise<Object>} - { product }
 */
export const getProduct = async (id) => {
  try {
    const response = await API.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load product'));
  }
};

/**
 * Get products by seller (seller only, can include inactive)
 * @param {string} sellerId - Seller user ID
 * @param {boolean} includeInactive - Whether to include inactive products
 * @returns {Promise<Object>} - { products }
 */
export const getSellerProducts = async (sellerId, includeInactive = false) => {
  try {
    const response = await API.get(`/products/seller/${sellerId}`, {
      params: { includeInactive },
    });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load seller products'));
  }
};

/**
 * Create new product (seller only)
 * @param {Object} productData - Product details
 * @returns {Promise<Object>} - { product }
 */
export const createProduct = async (productData) => {
  try {
    const response = await API.post('/products', productData);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to create product'));
  }
};

/**
 * Update product (seller only, must own product)
 * @param {string} id - Product ID
 * @param {Object} productData - Updated fields
 * @returns {Promise<Object>} - { product }
 */
export const updateProduct = async (id, productData) => {
  try {
    const response = await API.put(`/products/${id}`, productData);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to update product'));
  }
};

/**
 * Soft delete product (seller only)
 * @param {string} id - Product ID
 * @returns {Promise<Object>} - { message }
 */
export const deleteProduct = async (id) => {
  try {
    const response = await API.delete(`/products/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to delete product'));
  }
};

/**
 * Restore soft-deleted product (seller only)
 * @param {string} id - Product ID
 * @returns {Promise<Object>} - { product }
 */
export const restoreProduct = async (id) => {
  try {
    const response = await API.post(`/products/${id}/restore`);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to restore product'));
  }
};

// ========== ORDER ENDPOINTS (BUYER & SELLER) ==========

/**
 * Create new order from cart (checkout)
 * @param {Object} orderData - { items, shippingAddress, paymentMethod, buyerNotes }
 * @returns {Promise<Object>} - { order, paymentInstructions }
 */
export const checkout = async (orderData) => {
  try {
    const response = await API.post('/orders/checkout', orderData);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Checkout failed'));
  }
};

/**
 * Simulate payment for an order (legacy – use real gateways now)
 * @param {string} id - Order ID
 * @param {string} paymentId - Payment transaction ID
 * @returns {Promise<Object>} - { order, message }
 */
export const payOrder = async (id, paymentId) => {
  try {
    const response = await API.post(`/orders/${id}/pay`, { paymentId });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Payment failed'));
  }
};

/**
 * Get buyer's order history
 * @param {Object} params - { page, limit, status }
 * @returns {Promise<Object>} - { orders, pagination }
 */
export const getMyOrders = async (params = {}) => {
  try {
    const response = await API.get('/orders', { params });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load orders'));
  }
};

/**
 * Get single order by ID (buyer or seller)
 * @param {string} id - Order ID
 * @returns {Promise<Object>} - { order }
 */
export const getOrder = async (id) => {
  try {
    const response = await API.get(`/orders/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load order'));
  }
};

/**
 * Cancel order (buyer only, before shipping)
 * @param {string} id - Order ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} - { order, message }
 */
export const cancelOrder = async (id, reason) => {
  try {
    const response = await API.put(`/orders/${id}/cancel`, { reason });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to cancel order'));
  }
};

/**
 * Get orders containing seller's items (seller only)
 * @param {Object} params - { page, limit, status }
 * @returns {Promise<Object>} - { orders, pagination }
 */
export const getSellerOrders = async (params = {}) => {
  try {
    const response = await API.get('/orders/seller/orders', { params });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load seller orders'));
  }
};

/**
 * Update order status (seller only)
 * @param {string} id - Order ID
 * @param {string} status - New status
 * @param {string} trackingNumber - Optional tracking number
 * @param {string} carrier - Optional carrier
 * @returns {Promise<Object>} - { order, message }
 */
export const updateOrderStatus = async (id, status, trackingNumber = null, carrier = null) => {
  try {
    const response = await API.put(`/orders/${id}/status`, { status, trackingNumber, carrier });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to update order status'));
  }
};

/**
 * Add tracking info to order (seller only)
 * @param {string} id - Order ID
 * @param {string} trackingNumber - Tracking number
 * @param {string} carrier - Carrier name
 * @returns {Promise<Object>} - { order, message }
 */
export const addTracking = async (id, trackingNumber, carrier) => {
  try {
    const response = await API.post(`/orders/${id}/tracking`, { trackingNumber, carrier });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to add tracking'));
  }
};

// ========== ADMIN ENDPOINTS (admin only) ==========

/**
 * Get platform statistics (dashboard)
 * @returns {Promise<Object>} - { stats }
 */
export const getAdminStats = async () => {
  try {
    const response = await API.get('/admin/stats');
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load statistics'));
  }
};

// ----- User Management -----
export const getAdminUsers = async (params = {}) => {
  try {
    const response = await API.get('/admin/users', { params });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load users'));
  }
};

export const getAdminUser = async (id) => {
  try {
    const response = await API.get(`/admin/users/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load user'));
  }
};

export const updateAdminUser = async (id, updates) => {
  try {
    const response = await API.put(`/admin/users/${id}`, updates);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to update user'));
  }
};

export const deleteAdminUser = async (id) => {
  try {
    const response = await API.delete(`/admin/users/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to delete user'));
  }
};

// ----- Product Management (Admin Override) -----
export const getAdminProducts = async (params = {}) => {
  try {
    const response = await API.get('/admin/products', { params });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load products'));
  }
};

export const updateAdminProduct = async (id, updates) => {
  try {
    const response = await API.put(`/admin/products/${id}`, updates);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to update product'));
  }
};

export const deleteAdminProduct = async (id) => {
  try {
    const response = await API.delete(`/admin/products/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to delete product'));
  }
};

// ----- Order Management (Admin Override) -----
export const getAdminOrders = async (params = {}) => {
  try {
    const response = await API.get('/admin/orders', { params });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load orders'));
  }
};

export const updateAdminOrder = async (id, updates) => {
  try {
    const response = await API.put(`/admin/orders/${id}`, updates);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to update order'));
  }
};

// ----- Bulk Actions -----
export const bulkUsersAction = async (userIds, action) => {
  try {
    const response = await API.post('/admin/bulk/users', { userIds, action });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Bulk action failed'));
  }
};

export const bulkProductsAction = async (productIds, action) => {
  try {
    const response = await API.post('/admin/bulk/products', { productIds, action });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Bulk action failed'));
  }
};

export const bulkOrdersAction = async (orderIds, action) => {
  try {
    const response = await API.post('/admin/bulk/orders', { orderIds, action });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Bulk action failed'));
  }
};

// ----- Export Reports (CSV) -----
export const exportReport = async (type) => {
  try {
    const response = await API.get(`/admin/export/${type}`, { responseType: 'blob' });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Export failed'));
  }
};

// ----- System Settings -----
export const getAdminSettings = async () => {
  try {
    const response = await API.get('/admin/settings');
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load settings'));
  }
};

export const updateAdminSettings = async (settings) => {
  try {
    const response = await API.put('/admin/settings', settings);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to save settings'));
  }
};

// ----- Notifications -----
export const sendNotification = async (userIds, subject, message) => {
  try {
    const response = await API.post('/admin/notify', { userIds, subject, message });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to send notifications'));
  }
};

// ----- Activity Logs -----
export const getActivityLogs = async (params = {}) => {
  try {
    const response = await API.get('/admin/logs', { params });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to load activity logs'));
  }
};

// ========== PAYMENT GATEWAY ENDPOINTS ==========

// ---------- Stripe ----------
/**
 * Create a Stripe Payment Intent
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - { clientSecret, paymentIntentId }
 */
export const createStripePaymentIntent = async (orderId) => {
  try {
    const response = await API.post('/payment/create-stripe-payment-intent', { orderId });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to initialize Stripe payment'));
  }
};

// ---------- PayPal ----------
/**
 * Create a PayPal order
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - { orderID }
 */
export const createPayPalOrder = async (orderId) => {
  try {
    const response = await API.post('/payment/create-paypal-order', { orderId });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to create PayPal order'));
  }
};

/**
 * Capture a PayPal order after buyer approval
 * @param {string} orderID - PayPal order ID
 * @param {string} orderId - Marketplace order ID
 * @returns {Promise<Object>} - { success, transactionId }
 */
export const capturePayPalOrder = async (orderID, orderId) => {
  try {
    const response = await API.post('/payment/capture-paypal-order', { orderID, orderId });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to capture PayPal payment'));
  }
};

// ---------- Paystack ----------
/**
 * Initialize Paystack transaction
 * @param {string} orderId - Order ID
 * @param {string} email - Customer email
 * @returns {Promise<Object>} - { authorizationUrl, reference }
 */
export const initializePaystack = async (orderId, email) => {
  try {
    const response = await API.post('/payment/initialize-paystack', { orderId, email });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to initialize Paystack payment'));
  }
};

/**
 * Verify Paystack transaction (called after redirect)
 * @param {string} reference - Paystack transaction reference
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - redirects to success/failure page
 */
export const verifyPaystack = async (reference, orderId) => {
  try {
    const response = await API.get(`/payment/verify-paystack?reference=${reference}&orderId=${orderId}`);
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Paystack verification failed'));
  }
};

// ---------- Coinbase Commerce (Crypto) ----------
/**
 * Create a Coinbase charge
 * @param {string} orderId - Order ID
 * @param {string} name - Customer name
 * @param {string} email - Customer email
 * @returns {Promise<Object>} - { hostedUrl, chargeId, chargeCode }
 */
export const createCoinbaseCharge = async (orderId, name, email) => {
  try {
    const response = await API.post('/payment/create-coinbase-charge', { orderId, name, email });
    return response.data;
  } catch (error) {
    throw new Error(normalizeError(error, 'Failed to create crypto payment'));
  }
};

// ========== EXPORT DEFAULT INSTANCE ==========
export default API;