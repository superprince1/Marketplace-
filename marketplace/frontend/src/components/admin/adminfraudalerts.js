import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const AdminFraudAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/fraud/alerts?status=${filter}`);
      setAlerts(res.data.alerts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (alertId, status, notes = '') => {
    try {
      await API.put(`/admin/fraud/alerts/${alertId}`, { status, notes });
      fetchAlerts();
    } catch (err) {
      alert('Update failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h2>Fraud Alerts</h2>
      <div style={styles.filters}>
        <button onClick={() => setFilter('pending')} style={filter === 'pending' ? styles.activeFilter : {}}>Pending</button>
        <button onClick={() => setFilter('approved')} style={filter === 'approved' ? styles.activeFilter : {}}>Approved</button>
        <button onClick={() => setFilter('rejected')} style={filter === 'rejected' ? styles.activeFilter : {}}>Rejected</button>
      </div>
      {alerts.length === 0 ? (
        <p>No fraud alerts.</p>
      ) : (
        alerts.map(alert => (
          <div key={alert._id} style={styles.alertCard}>
            <div style={styles.header}>
              <span>Order #{alert.orderId?.orderNumber || alert.orderId}</span>
              <span style={{ ...styles.riskBadge, backgroundColor: getRiskColor(alert.riskLevel) }}>
                {alert.riskLevel.toUpperCase()} ({alert.riskScore})
              </span>
              <span>Status: {alert.status}</span>
            </div>
            <div style={styles.reasons}>
              <strong>Reasons:</strong>
              <ul>
                {alert.reasons.map((r, idx) => (
                  <li key={idx}>{r.description} (+{r.points})</li>
                ))}
              </ul>
            </div>
            <div style={styles.actions}>
              <button onClick={() => updateStatus(alert._id, 'approved')}>Approve</button>
              <button onClick={() => updateStatus(alert._id, 'rejected')}>Reject</button>
              <button onClick={() => {
                const notes = prompt('Add notes (optional):');
                if (notes !== null) updateStatus(alert._id, alert.status, notes);
              }}>Add Note</button>
            </div>
            {alert.notes && <div style={styles.notes}>Notes: {alert.notes}</div>}
          </div>
        ))
      )}
    </div>
  );
};

const getRiskColor = (level) => {
  switch (level) {
    case 'critical': return '#dc3545';
    case 'high': return '#ffc107';
    case 'medium': return '#17a2b8';
    default: return '#28a745';
  }
};

const styles = {
  container: { padding: '20px' },
  filters: { display: 'flex', gap: '12px', marginBottom: '20px' },
  activeFilter: { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px' },
  alertCard: { border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fff' },
  header: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' },
  riskBadge: { padding: '4px 8px', borderRadius: '4px', color: 'white', fontSize: '12px' },
  reasons: { marginBottom: '12px', fontSize: '14px' },
  actions: { display: 'flex', gap: '8px', marginBottom: '8px' },
  notes: { fontSize: '13px', color: '#666', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' },
};

export default AdminFraudAlerts;