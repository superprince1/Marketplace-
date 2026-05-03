import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ManageProducts from './ManageProducts';
import SellerOrders from './SellerOrders';
import ShopProfile from './ShopProfile';
import CouponManager from './CouponManager';
import SellerAnalytics from './SellerAnalytics';
import API from '../../services/api';

/**
 * SellerDashboard Component - Main dashboard for sellers
 * Features:
 * - Tab navigation (Products, Orders, Shop Profile, Coupons, Analytics)
 * - Dashboard stats (total products, total sales, pending orders, total orders)
 * - Quick links to add product, view orders
 * - Welcome message with seller name
 */
const SellerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalSales: 0,
    averageRating: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user && user.role === 'seller') {
      fetchSellerStats();
    }
  }, [user]);

  const fetchSellerStats = async () => {
    setLoadingStats(true);
    try {
      // Fetch seller's products
      const productsRes = await API.get(`/products/seller/${user.id}`);
      const products = productsRes.data.products || [];
      const activeProducts = products.filter(p => p.isActive).length;

      // Fetch seller's orders (from the seller orders endpoint)
      const ordersRes = await API.get('/orders/seller/orders', { params: { limit: 100 } });
      const orders = ordersRes.data.orders || [];
      const pendingOrders = orders.filter(o => o.status === 'pending').length;

      // Calculate total sales (from paid orders)
      const totalSales = orders
        .filter(o => o.paymentStatus === 'paid')
        .reduce((sum, order) => {
          // Sum only seller's items in the order
          const sellerItems = order.items.filter(item => item.sellerId === user.id);
          const sellerTotal = sellerItems.reduce((s, item) => s + (item.price * item.quantity), 0);
          return sum + sellerTotal;
        }, 0);

      setStats({
        totalProducts: products.length,
        activeProducts,
        totalOrders: orders.length,
        pendingOrders,
        totalSales,
        averageRating: 4.5, // Placeholder – will be replaced when review system is fully integrated
      });
    } catch (err) {
      console.error('Error fetching seller stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, backgroundColor: color }}>{icon}</div>
      <div style={styles.statInfo}>
        <div style={styles.statValue}>{loadingStats ? '...' : value}</div>
        <div style={styles.statTitle}>{title}</div>
      </div>
    </div>
  );

  // Tab configuration
  const tabs = [
    { id: 'products', label: '📦 My Products', component: <ManageProducts /> },
    { id: 'orders', label: '📋 Orders', component: <SellerOrders /> },
    { id: 'shop', label: '🏪 Shop Profile', component: <ShopProfile /> },
    { id: 'coupons', label: '🏷️ Coupons', component: <CouponManager /> },
    { id: 'analytics', label: '📊 Analytics', component: <SellerAnalytics /> },
  ];

  return (
    <div style={styles.container}>
      {/* Welcome Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Seller Dashboard</h1>
          <p style={styles.welcome}>Welcome back, {user?.name || 'Seller'}!</p>
        </div>
        <button onClick={() => setActiveTab('products')} style={styles.addProductBtn}>
          + Add New Product
        </button>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <StatCard title="Total Products" value={stats.totalProducts} icon="📦" color="#007bff" />
        <StatCard title="Active Products" value={stats.activeProducts} icon="✅" color="#28a745" />
        <StatCard title="Total Orders" value={stats.totalOrders} icon="🛒" color="#17a2b8" />
        <StatCard title="Pending Orders" value={stats.pendingOrders} icon="⏳" color="#ffc107" />
        <StatCard title="Total Sales" value={formatCurrency(stats.totalSales)} icon="💰" color="#28a745" />
        <StatCard title="Avg. Rating" value={`${stats.averageRating} ★`} icon="⭐" color="#ffc107" />
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {tabs.find((t) => t.id === activeTab)?.component}
      </div>

      {/* Quick Tips for Sellers */}
      <div style={styles.tipsCard}>
        <h4 style={styles.tipsTitle}>💡 Seller Tips</h4>
        <ul style={styles.tipsList}>
          <li>Add high-quality images to increase sales by up to 40%</li>
          <li>Respond to customer messages quickly to build trust</li>
          <li>Keep your inventory updated to avoid out-of-stock issues</li>
          <li>Offer competitive pricing and occasional discounts</li>
          <li>Ship orders promptly and provide tracking information</li>
        </ul>
      </div>
    </div>
  );
};

// ========== STYLES ==========
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  },
  welcome: {
    fontSize: '16px',
    color: '#666',
  },
  addProductBtn: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: 'white',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: '13px',
    color: '#666',
    marginTop: '4px',
  },
  tabsContainer: {
    marginBottom: '24px',
    borderBottom: '1px solid #e0e0e0',
  },
  tabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0',
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#666',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#007bff',
    borderBottom: '2px solid #007bff',
  },
  tabContent: {
    marginBottom: '32px',
  },
  tipsCard: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeeba',
    borderRadius: '8px',
    padding: '16px 20px',
    marginTop: '24px',
  },
  tipsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#856404',
    marginBottom: '12px',
  },
  tipsList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#856404',
    fontSize: '13px',
    lineHeight: '1.6',
  },
};

export default SellerDashboard;