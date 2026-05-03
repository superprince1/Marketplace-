import React, { useState } from 'react';
import API from '../../services/api';

const GDPRSettings = () => {
  const [loading, setLoading] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [deletionCanceled, setDeletionCanceled] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await API.get('/gdpr/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'my-personal-data.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (window.confirm('Are you sure? This will disable your account immediately and permanently delete all personal data after 30 days.')) {
      setLoading(true);
      try {
        await API.post('/gdpr/delete-request');
        setDeletionRequested(true);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to request deletion');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancelDeletion = async () => {
    setLoading(true);
    try {
      await API.post('/gdpr/cancel-deletion');
      setDeletionCanceled(true);
      setDeletionRequested(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  if (deletionRequested) {
    return (
      <div style={styles.container}>
        <h3>Account Deletion Requested</h3>
        <p>Your account has been deactivated. You have 30 days to change your mind.</p>
        <button onClick={handleCancelDeletion} disabled={loading} style={styles.button}>
          {loading ? 'Processing...' : 'Cancel Deletion & Reactivate Account'}
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3>Privacy & GDPR Tools</h3>
      <div style={styles.section}>
        <h4>Download Your Data</h4>
        <p>Get a copy of all personal data we hold about you (JSON format).</p>
        <button onClick={handleExport} disabled={loading} style={styles.button}>
          {loading ? 'Preparing...' : 'Download My Data'}
        </button>
      </div>

      <div style={styles.section}>
        <h4>Request Account Deletion</h4>
        <p>✅ Your account will be deactivated immediately.<br />
        ✅ All personal data will be permanently removed after 30 days.<br />
        ❗ You will not be able to log in during this period.<br />
        💡 You can cancel within 30 days.</p>
        <button onClick={handleRequestDeletion} disabled={loading} style={{ ...styles.button, backgroundColor: '#dc3545' }}>
          {loading ? 'Processing...' : 'Request Account Deletion'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: 600, margin: '0 auto', padding: 20 },
  section: { borderBottom: '1px solid #eee', padding: '20px 0' },
  button: { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', marginTop: 10 },
};

export default GDPRSettings;