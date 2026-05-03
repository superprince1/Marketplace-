import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExperimentProvider } from './context/ExperimentContext';
import { CartProvider } from './context/CartContext'; // ✅ Cart context provider
import useCart from './hooks/useCart';               // ✅ Cart hook
import API from './services/api';
import './App.css';

// Layout Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import LoadingSpinner from './components/UI/LoadingSpinner';
import NotFound from './components/UI/NotFound';
import CookieConsent from './components/UI/CookieConsent';

// Google Analytics Tracker
import GoogleAnalyticsTracker from './components/GoogleAnalyticsTracker';

// Lazy load page components
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductList = lazy(() => import('./components/Products/ProductList'));
const ProductDetail = lazy(() => import('./components/Products/ProductDetail'));
const Cart = lazy(() => import('./components/Cart/Cart'));
const Login = lazy(() => import('./components/Auth/Login'));
const Register = lazy(() => import('./components/Auth/Register'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const BlogList = lazy(() => import('./components/Blog/BlogList'));
const BlogPost = lazy(() => import('./components/Blog/BlogPost'));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
const UserGuide = lazy(() => import('./pages/UserGuide'));
const OrderHistory = lazy(() => import('./components/Orders/OrderHistory'));
const OrderDetail = lazy(() => import('./components/Orders/OrderDetail'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));
const SellerDashboard = lazy(() => import('./components/Seller/SellerDashboard'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AIChatbot = lazy(() => import('./components/AIChatbot'));
const GDPRSettings = lazy(() => import('./components/Privacy/GDPRSettings'));
const PageView = lazy(() => import('./components/Pages/PageView'));

/**
 * Protected Route Component
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingSpinner message="Checking authentication..." />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  if (allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.includes(user?.role) || user?.isAdmin;
    if (!hasRequiredRole) return <Navigate to="/" replace />;
  }
  return children;
};

/**
 * Main App Content Component
 * Uses useCart hook for cart state and actions.
 */
function AppContent() {
  const { user } = useAuth();
  const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, cartCount } = useCart();

  // ========== ABANDONED CART TRACKING ==========
  useEffect(() => {
    if (!user) return;

    const trackCart = async () => {
      try {
        if (cartItems.length === 0) {
          await API.delete('/cart/clear');
        } else {
          const items = cartItems.map(item => ({
            productId: item._id,
            name: item.name,
            price: item.priceAtAdd || item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
            selectedVariations: item.selectedVariations || {},
          }));
          const subtotal = cartItems.reduce((sum, i) => sum + ((i.priceAtAdd || i.price) * i.quantity), 0);
          const shipping = subtotal >= 50 ? 0 : 5.99;
          const tax = subtotal * 0.08;
          const total = subtotal + shipping + tax;
          await API.post('/cart/track', {
            email: user.email,
            items,
            subtotal,
            shippingCost: shipping,
            tax,
            total,
          });
        }
      } catch (err) {
        console.error('Failed to track abandoned cart:', err);
      }
    };

    trackCart();
  }, [cartItems, user]);

  return (
    <Router>
      <GoogleAnalyticsTracker />
      <div className="app-wrapper">
        <Navbar cartCount={cartCount} />
        <main className="main-content">
          <div className="container">
            <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage addToCart={addItem} />} />
                <Route path="/products" element={<ProductList addToCart={addItem} />} />
                <Route path="/product/:id" element={<ProductDetail addToCart={addItem} />} />
                <Route
                  path="/cart"
                  element={
                    <Cart
                      cart={cartItems}
                      removeFromCart={removeItem}
                      updateQuantity={updateQuantity}
                      clearCart={clearCart}
                    />
                  }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/shop/:slug" element={<ShopPage addToCart={addItem} />} />
                <Route path="/blog" element={<BlogList />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/newsletter" element={<NewsletterPage />} />
                <Route path="/help" element={<UserGuide />} />
                <Route path="/pages/:slug" element={<PageView />} />

                {/* Authenticated Routes */}
                <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
                <Route path="/order/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
                <Route path="/affiliate" element={<ProtectedRoute><AffiliateDashboard /></ProtectedRoute>} />
                <Route path="/seller/*" element={<ProtectedRoute allowedRoles={['seller']}><SellerDashboard /></ProtectedRoute>} />
                <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>} />
                <Route path="/privacy-settings" element={<ProtectedRoute><GDPRSettings /></ProtectedRoute>} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </main>
        <Suspense fallback={null}>
          <AIChatbot />
        </Suspense>
        <Footer />
      </div>
      <CookieConsent />
    </Router>
  );
}

/**
 * Root App Component
 * Wraps with providers: Helmet, Auth, Experiment, and Cart.
 */
function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <ExperimentProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </ExperimentProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;