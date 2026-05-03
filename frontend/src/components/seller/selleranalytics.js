import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../UI/LoadingSpinner';

const SellerAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await API.get('/analytics/seller?days=30');
      setData(res.data.analytics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return <div>No data available</div>;

  return (
    <div style={styles.container}>
      <h2>Sales Analytics</h2>
      <div style={styles.summary}>
        <div style={styles.card}>💰 Total Revenue: ${data.summary.totalRevenue.toFixed(2)}</div>
        <div style={styles.card}>📦 Total Orders: {data.summary.totalOrders}</div>
        <div style={styles.card}>📊 Avg Order Value: ${data.summary.averageOrderValue.toFixed(2)}</div>
      </div>
      <h3>Sales Trend (Last 30 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data.salesChart}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
          <Line type="monotone" dataKey="total" stroke="#007bff" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      <h3>Top 5 Products</h3>
      <table style={styles.table}>
        <thead><tr><th>Product</th><th>Revenue</th></tr></thead>
        <tbody>
          {data.topProducts.map(p => (
            <tr key={p.product._id}>
              <td>{p.product.name}</td>
              <td>${p.revenue.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  container: { padding: '20px' },
  summary: { display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' },
  card: { background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
};

export default SellerAnalytics;