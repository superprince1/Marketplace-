import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const AffiliateDashboard = () => {
  const [data, setData] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [resources, setResources] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    usageLimit: '',
    expiresAt: '',
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchTiers();
    fetchResources();
  }, []);

  const fetchDashboard = async () => {
    const res = await API.get('/affiliate/dashboard');
    setData(res.data);
    setLoading(false);
  };
  const fetchTiers = async () => {
    const res = await API.get('/affiliate/tiers');
    setTiers(res.data.tiers);
  };
  const fetchResources = async () => {
    const res = await API.get('/affiliate/resources');
    setResources(res.data.resources);
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await API.post('/affiliate/coupons', couponForm);
      alert('Coupon created!');
      setCouponForm({ code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', usageLimit: '', expiresAt: '' });
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h2>Affiliate Dashboard</h2>
      {data?.affiliate && (
        <div style={styles.statsCard}>
          <h3>Your Performance</h3>
          <p>Tier: {data.affiliate.tierId?.name || 'None'}</p>
          <p>Commission Rate: {data.affiliate.commissionRate}%</p>
          <p>Clicks: {data.stats.clicks}</p>
          <p>Conversions: {data.stats.conversions}</p>
          <p>Total Earnings: ${data.stats.earnings.toFixed(2)}</p>
          <p>Pending: ${data.stats.pending.toFixed(2)}</p>
        </div>
      )}

      <h3>Your Referral Link</h3>
      <input type="text" readOnly value={`${window.location.origin}/?ref=${data?.affiliate?.affiliateCode}`} style={styles.linkInput} />

      <h3>Create a Coupon</h3>
      <form onSubmit={handleCreateCoupon} style={styles.form}>
        <input type="text" placeholder="Coupon Code" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} required style={styles.input} />
        <select value={couponForm.discountType} onChange={e => setCouponForm({...couponForm, discountType: e.target.value})}>
          <option value="percentage">Percentage (%)</option>
          <option value="fixed">Fixed ($)</option>
        </select>
        <input type="number" placeholder="Discount Value" value={couponForm.discountValue} onChange={e => setCouponForm({...couponForm, discountValue: e.target.value})} required style={styles.input} />
        <input type="number" placeholder="Min Order Amount (leave 0 for none)" value={couponForm.minOrderAmount} onChange={e => setCouponForm({...couponForm, minOrderAmount: e.target.value})} style={styles.input} />
        <input type="number" placeholder="Usage Limit (blank = unlimited)" value={couponForm.usageLimit} onChange={e => setCouponForm({...couponForm, usageLimit: e.target.value})} style={styles.input} />
        <input type="date" placeholder="Expiration Date" value={couponForm.expiresAt} onChange={e => setCouponForm({...couponForm, expiresAt: e.target.value})} style={styles.input} />
        <button type="submit" disabled={creating}>Create Coupon</button>
      </form>

      <h3>Your Coupons</h3>
      <table style={styles.table}>
        <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Used</th><th>Active</th></tr></thead>
        <tbody>
          {data?.coupons?.map(c => (
            <tr key={c._id}>
              <td>{c.code}</td><td>{c.discountType}</td><td>{c.discountValue}{c.discountType === 'percentage' ? '%' : '$'}</td>
              <td>{c.usedCount}/{c.usageLimit || '∞'}</td><td>{c.isActive ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Promotional Resources</h3>
      <div style={styles.resourcesGrid}>
        {resources.map(r => (
          <div key={r._id} style={styles.resourceCard}>
            <h4>{r.name}</h4>
            {r.type === 'banner' && <img src={r.imageUrl} alt={r.name} style={styles.banner} />}
            {r.type === 'text_link' && (
              <input type="text" readOnly value={`<a href="${r.link}">${r.content}</a>`} style={styles.codeInput} />
            )}
            {r.type === 'social_post' && <textarea readOnly value={r.content} style={styles.textarea} />}
            <button onClick={() => navigator.clipboard.writeText(r.content || r.link)}>Copy</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: 1000, margin: '0 auto', padding: 20 },
  statsCard: { backgroundColor: '#f8f9fa', padding: 20, borderRadius: 10, marginBottom: 20 },
  linkInput: { width: '100%', padding: 10, marginBottom: 20, backgroundColor: '#e9ecef', border: 'none', borderRadius: 5 },
  form: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  input: { padding: 8, border: '1px solid #ddd', borderRadius: 4 },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 20 },
  resourcesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 },
  resourceCard: { border: '1px solid #ddd', padding: 15, borderRadius: 8, textAlign: 'center' },
  banner: { width: '100%', maxHeight: 150, objectFit: 'cover' },
  codeInput: { width: '100%', padding: 8, margin: '10px 0', fontSize: 12 },
  textarea: { width: '100%', height: 80, margin: '10px 0' },
};

export default AffiliateDashboard;