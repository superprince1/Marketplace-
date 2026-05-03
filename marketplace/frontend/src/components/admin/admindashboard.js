// src/components/Admin/AdminDashboard.js
import React, { useState } from 'react';
import AdminStats from './AdminStats';
import AdminUsers from './AdminUsers';
import AdminProducts from './AdminProducts';
import AdminOrders from './AdminOrders';
import AdminSettings from './AdminSettings';
import AdminLogs from './AdminLogs';
import AdminMonetization from './AdminMonetization';
import AdminHomepage from './AdminHomepage';
import AdminAffiliates from './AdminAffiliates'; // ✅ Affiliate management

/**
 * AdminDashboard Component
 * 
 * Main container for the admin panel with tab navigation.
 * 
 * Features:
 * - Nine tabs: Statistics, Users, Products, Orders, Monetization, Homepage, Affiliates, Settings, Activity Logs
 * - Each tab renders its respective component
 * - Active tab state persists during session
 * - Responsive design with flex wrap
 * 
 * @returns {JSX.Element}
 */
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');

  const tabs = [
    { id: 'stats', label: '📊 Statistics', component: <AdminStats /> },
    { id: 'users', label: '👥 Users', component: <AdminUsers /> },
    { id: 'products', label: '📦 Products', component: <AdminProducts /> },
    { id: 'orders', label: '🛒 Orders', component: <AdminOrders /> },
    { id: 'monetization', label: '💰 Monetization', component: <AdminMonetization /> },
    { id: 'homepage', label: '🏠 Homepage', component: <AdminHomepage /> },
    { id: 'affiliates', label: '🤝 Affiliates', component: <AdminAffiliates /> }, // ✅ NEW
    { id: 'settings', label: '⚙️ Settings', component: <AdminSettings /> },
    { id: 'logs', label: '📜 Activity Logs', component: <AdminLogs /> },
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Admin Dashboard</h1>
      <div style={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            aria-label={`Switch to ${tab.label} tab`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={styles.content}>
        {tabs.find(t => t.id === activeTab)?.component}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: {
    fontSize: '32px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#1a1a2e',
    borderLeft: '4px solid #007bff',
    paddingLeft: '16px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #e0e0e0',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: '#f8f9fa',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    color: '#495057',
  },
  tabActive: {
    backgroundColor: '#007bff',
    color: '#ffffff',
    boxShadow: '0 -2px 4px rgba(0,0,0,0.05)',
  },
  content: {
    minHeight: '500px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    padding: '4px',
  },
};

export default AdminDashboard;