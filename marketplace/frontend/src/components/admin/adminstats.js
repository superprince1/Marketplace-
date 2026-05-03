import React, { useState, useEffect } from 'react';
import { getAdminStats } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * AdminStats Component
 * 
 * Displays platform statistics:
 * - Total users, sellers, buyers
 * - Total products, active/inactive
 * - Total orders, pending/completed
 * - Total revenue
 * - Monthly revenue chart (last 6 months)
 */
const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getAdminStats();
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError(err.response?.data?.error || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading statistics..." />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!stats) return null;

  return (
    <div>
      {/* Stats Cards Grid */}
      <div style={styles.statsGrid}>
        {/* Users Card */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>{stats.users.total.toLocaleString()}</div>
            <div style={styles.statLabel}>Total Users</div>
            <div style={styles.statDetail}>
              <span style={{ color: '#28a745' }}>Sellers: {stats.users.sellers}</span> | 
              <span style={{ color: '#007bff' }}> Buyers: {stats.users.buyers}</span>
            </div>
          </div>
        </div>

        {/* Products Card */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📦</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>{stats.products.total.toLocaleString()}</div>
            <div style={styles.statLabel}>Total Products</div>
            <div style={styles.statDetail}>
              <span style={{ color: '#28a745' }}>Active: {stats.products.active}</span> | 
              <span style={{ color: '#dc3545' }}> Inactive: {stats.products.inactive}</span>
            </div>
          </div>
        </div>

        {/* Orders Card */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🛒</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>{stats.orders.total.toLocaleString()}</div>
            <div style={styles.statLabel}>Total Orders</div>
            <div style={styles.statDetail}>
              <span style={{ color: '#ffc107' }}>Pending: {stats.orders.pending}</span> | 
              <span style={{ color: '#28a745' }}> Completed: {stats.orders.completed}</span>
            </div>
          </div>
        </div>

        {/* Revenue Card */}
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statInfo}>
            <div style={styles.statValue}>${stats.revenue.total.toFixed(2)}</div>
            <div style={styles.statLabel}>Total Revenue</div>
            <div style={styles.statDetail}>From paid orders</div>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div style={styles.chartContainer}>
        <h3 style={styles.chartTitle}>Monthly Revenue (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={stats.revenue.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="month" tick={{ fill: '#666' }} />
            <YAxis
              tickFormatter={(value) => `$${value}`}
              tick={{ fill: '#666' }}
            />
            <Tooltip
              formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#007bff"
              strokeWidth={3}
              dot={{ fill: '#007bff', r: 5 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
  },
  statIcon: {
    fontSize: '42px',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a2e',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  statDetail: {
    fontSize: '12px',
    color: '#999',
    marginTop: '8px',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#333',
  },
};

export default AdminStats;