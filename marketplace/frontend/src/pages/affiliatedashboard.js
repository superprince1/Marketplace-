import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const AffiliateDashboard = () => {
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentEmail, setPaymentEmail] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (user) fetchAffiliateData();
  }, [user]);

  const fetchAffiliateData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/affiliate/dashboard');
      setAffiliate(res.data.affiliate);
      setClicks(res.data.clicks || []);
      setConversions(res.data.conversions || []);
      setPaymentMethod(res.data.affiliate.paymentMethod || '');
      setPaymentEmail(res.data.affiliate.paymentEmail || '');
    } catch (err) {
      console.error('Affiliate fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    if (!paymentMethod && !paymentEmail) {
      setMessage({ type: 'error', text: 'Please select a payment method and enter email/account.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    setUpdating(true);
    try {
      await API.put('/affiliate/dashboard', { paymentMethod, paymentEmail });
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Update failed' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setUpdating(false);
    }
  };

  const requestPayout = async () => {
    if (!affiliate.pendingEarnings || affiliate.pendingEarnings <= 0) {
      alert('No pending earnings to request.');
      return;
    }
    if (!paymentMethod || !paymentEmail) {
      alert('Please set your payment method and email before requesting payout.');
      return;
    }
    try {
      await API.post('/affiliate/request-payout');
      alert('Payout requested successfully. Admin will process within 5-7 business days.');
    } catch (err) {
      alert(err.response?.data?.error || 'Request failed. Please try again later.');
    }
  };

  const copyToClipboard = async () => {
    const affiliateLink = `${window.location.origin}/affiliate/go/${affiliate.affiliateCode}?url=`;
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  if (loading) return <LoadingSpinner message="Loading affiliate dashboard..." />;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!affiliate) return <div style={styles.error}>No affiliate data found. Please contact support.</div>;

  const affiliateLink = `${window.location.origin}/affiliate/go/${affiliate.affiliateCode}?url=`;
  const conversionRate = affiliate.clicks > 0 ? ((affiliate.conversions / affiliate.clicks) * 100).toFixed(2) : '0.00';

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Affiliate Dashboard</h1>
      
      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>💰 Total Earnings: <strong>${affiliate.totalEarnings.toFixed(2)}</strong></div>
        <div style={styles.statCard}>⏳ Pending: <strong>${affiliate.pendingEarnings.toFixed(2)}</strong></div>
        <div style={styles.statCard}>✅ Paid: <strong>${affiliate.paidEarnings.toFixed(2)}</strong></div>
        <div style={styles.statCard}>🖱️ Clicks: <strong>{affiliate.clicks.toLocaleString()}</strong></div>
        <div style={styles.statCard}>🛒 Conversions: <strong>{affiliate.conversions.toLocaleString()}</strong></div>
        <div style={styles.statCard}>📈 Conversion Rate: <strong>{conversionRate}%</strong></div>
      </div>

      {/* Affiliate Link Card */}
      <div style={styles.card}>
        <h3>Your Affiliate Link</h3>
        <div style={styles.linkBox}>
          <input type="text" readOnly value={affiliateLink} style={styles.linkInput} />
          <button onClick={copyToClipboard} style={styles.copyBtn}>
            {copySuccess ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <p style={styles.note}>
          Share this link with others. You earn <strong>{affiliate.commissionRate}% commission</strong> on every sale made through your link.
        </p>
        <small style={styles.hint}>The link works even if the customer buys later (cookie lasts 30 days).</small>
      </div>

      {/* Payment Settings Card */}
      <div style={styles.card}>
        <h3>Payment Settings</h3>
        {message.text && (
          <div style={{ ...styles.message, backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24' }}>
            {message.text}
          </div>
        )}
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={styles.select}>
          <option value="">Select payment method</option>
          <option value="paypal">PayPal</option>
          <option value="bank">Bank Transfer</option>
          <option value="crypto">Cryptocurrency (USDT/BTC)</option>
        </select>
        <input
          type="text"
          placeholder="Payment email / account (e.g., your@email.com)"
          value={paymentEmail}
          onChange={(e) => setPaymentEmail(e.target.value)}
          style={styles.input}
        />
        <button onClick={updateSettings} disabled={updating} style={styles.saveBtn}>
          {updating ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Request Payout Card */}
      {affiliate.pendingEarnings > 0 && (
        <div style={styles.card}>
          <h3>Request Payout</h3>
          <p>You have <strong>${affiliate.pendingEarnings.toFixed(2)}</strong> pending earnings.</p>
          <button onClick={requestPayout} style={styles.payoutBtn}>
            Request Payout
          </button>
          <small style={styles.hint}>Minimum payout is $20 (will be enforced on admin side).</small>
        </div>
      )}

      {/* Recent Clicks Table */}
      <div style={styles.card}>
        <h3>Recent Clicks</h3>
        {clicks.length === 0 ? (
          <p style={styles.empty}>No clicks recorded yet. Share your link to start!</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>IP Address</th>
                  <th>Converted</th>
                </tr>
              </thead>
              <tbody>
                {clicks.map(click => (
                  <tr key={click._id}>
                    <td>{new Date(click.createdAt).toLocaleDateString()}</td>
                    <td>{click.ipAddress || '—'}</td>
                    <td>{click.converted ? '✅ Yes' : '❌ No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Successful Conversions Table */}
      <div style={styles.card}>
        <h3>Successful Conversions</h3>
        {conversions.length === 0 ? (
          <p style={styles.empty}>No conversions yet. Keep sharing your link!</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Total</th>
                  <th>Your Commission</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map(order => (
                  <tr key={order._id}>
                    <td>{order.orderNumber}</td>
                    <td>${order.total.toFixed(2)}</td>
                    <td>${((order.total * affiliate.commissionRate) / 100).toFixed(2)}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#1a1a2e',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    fontSize: '14px',
    color: '#555',
  },
  card: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '24px',
  },
  linkBox: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  linkInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#f8f9fa',
  },
  copyBtn: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  note: {
    fontSize: '14px',
    marginTop: '8px',
    color: '#555',
  },
  hint: {
    fontSize: '12px',
    color: '#999',
    marginTop: '8px',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: '16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: '16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  saveBtn: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  payoutBtn: {
    padding: '10px 20px',
    backgroundColor: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    marginTop: '8px',
  },
  message: {
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0',
    fontWeight: '600',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f0f0f0',
  },
  empty: {
    color: '#999',
    textAlign: 'center',
    padding: '20px',
  },
  error: {
    textAlign: 'center',
    color: '#dc3545',
    padding: '40px',
  },
};

export default AffiliateDashboard;