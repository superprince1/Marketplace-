import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { login as loginApi, register as registerApi, getCurrentUser } from '../services/api';

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use auth context (makes it easier to consume)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * AuthProvider Component
 * Manages user authentication state, token storage, and user data
 * Features:
 * - Automatic token storage in localStorage
 * - Automatic user loading on app start
 * - Token expiration handling
 * - Login, Register, Logout functions
 * - Loading states for async operations
 * - Error handling for failed requests
 */
export const AuthProvider = ({ children }) => {
  // State variables
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Initial loading
  const [authLoading, setAuthLoading] = useState(false); // Login/register loading
  const [error, setError] = useState(null);

  // Get token from localStorage on mount
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('token');
    return storedToken || null;
  });

  /**
   * Load user data from API using stored token
   * Called on app start and when token changes
   */
  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getCurrentUser();
      const userData = response.data.user;
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Failed to load user:', err);
      // If token is invalid, clear it
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load user when token changes (on app start or login)
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /**
   * Login function
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User data
   */
  const login = async (email, password) => {
    setAuthLoading(true);
    setError(null);
    try {
      const response = await loginApi({ email, password });
      const { token: newToken, user: userData } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return userData;
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.error || 'Login failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Register function
   * @param {Object} userData - User registration data (name, email, password, role, etc.)
   * @returns {Promise<Object>} Created user data
   */
  const register = async (userData) => {
    setAuthLoading(true);
    setError(null);
    try {
      const response = await registerApi(userData);
      const { token: newToken, user: newUser } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      
      return newUser;
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Logout function
   * Clears token and user data from state and localStorage
   */
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  /**
   * Update user data (called after profile updates)
   * @param {Object} updatedUser - Updated user object
   */
  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  /**
   * Clear any authentication errors
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Check if user has a specific role
   * @param {string|string[]} roles - Single role or array of roles
   * @returns {boolean} True if user has any of the roles
   */
  const hasRole = (roles) => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role) || (user.isAdmin && roles.includes('admin'));
  };

  /**
   * Check if user is authenticated (logged in)
   * @returns {boolean}
   */
  const isAuthenticated = !!user && !!token;

  // Context value to be provided to consumers
  const value = {
    user,           // Current user object
    loading,        // Initial loading state (app boot)
    authLoading,    // Login/register loading state
    error,          // Any auth error
    isAuthenticated,// Boolean indicating if user is logged in
    login,
    register,
    logout,
    updateUser,
    clearError,
    hasRole,
    loadUser        // Expose for manual refresh if needed
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;