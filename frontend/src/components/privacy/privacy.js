import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

/**
 * GDPRSettings Component
 * Allows authenticated users to:
 * - Download their personal data (JSON)
 * - Request account deletion (30-day grace period, account deactivated immediately)
 * - Cancel a pending deletion request (reactivates account)
 */
const GDPRSettings = () => {
  const { user, loadUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [deletionScheduledFor, setDeletionScheduledFor] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user already has a pending deletion request
  useEffect(() => {
    if (user && user.deletionRequestedAt) {
      setDeletionRequested(true);
      setDeletionScheduledFor(user.deletionScheduledFor);
    } else {
      setDeletionRequested(false);
      setDeletionScheduledFor(null);
    }
  }, [user]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle data export
  const handleExportData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await API.get('/gdpr/export', {
        responseType: 'blob',
      });
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user-data-${user?.email || 'export'}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Your data export has started downloading.');
    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.error || 'Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle request account deletion
  const handleRequestDeletion = async () => {
    // Confirm with user
    const confirmed = window.confirm(
      '⚠️ ACCOUNT DELETION REQUEST\n\n' +
      'This will immediately deactivate your account. You will not be able to log in.\n' +
      'All your personal data will be permanently removed after 30 days.\n\n' +
      'You can cancel this request within 30 days by visiting this page again.\n\n' +
      'Are you sure you want to proceed?'
    );
    if (!confirmed) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await API.post('/gdpr/delete-request');
      setSuccess('Deletion request submitted. Your account has been deactivated. You have 30 days to cancel.');
      setDeletionRequested(true);
      // Refresh user data to reflect deactivation
      await loadUser();
    } catch (err) {
      console.error('Deletion request error:', err);
      setError(err.response?.data?.error || 'Failed to request deletion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel deletion request
  const handleCancelDeletion = async () => {
    const confirmed = window.confirm(
      'Cancel deletion request?\n\n' +
      'Your account will be reactivated immediately and you will be able to log in again.\n' +
      'Your data will not be deleted.\n\n' +
      'Are you sure you want to cancel?'
    );
    if (!confirmed) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await API.post('/gdpr/cancel-deletion');
      setSuccess('Deletion request cancelled. Your account is now active again.');
      setDeletionRequested(false);
      setDeletionScheduledFor(null);
      // Refresh user data to reflect reactivation
      await loadUser();
    } catch (err) {
      console.error('Cancel deletion error:', err);
      setError(err.response?.data?.error || 'Failed to cancel deletion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Privacy & GDPR Settings</h2>
      <p style={styles.subtitle}>
        Manage your personal data and account privacy in accordance with GDPR regulations.
      </p>

      {error && (
        <div style={styles.errorMessage}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={styles.successMessage}>
          ✓ {success}
        </div>
      )}

      {/* Data Export Section */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>📥 Download Your Data</h3>
        <p style={styles.cardText}>
          Get a copy of all personal data we hold about you, including profile information,
          order history, reviews, wishlist, and store credit transactions. The data will be
          provided in JSON format.
        </p>
        <button
          onClick={handleExportData}
          disabled={loading || deletionRequested}
          style={{
            ...styles.button,
            ...styles.primaryButton,
            ...((loading || deletionRequested) ? styles.buttonDisabled : {}),
          }}
        >
          {loading ? <LoadingSpinner size="small" /> : 'Download My Data'}
        </button>
      </div>

      {/* Account Deletion Section */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>🗑️ Account Deletion</h3>
        {deletionRequested ? (
          <>
            <div style={styles.warningBox}>
              <strong>⚠️ Deletion requested on {formatDate(user?.deletionRequestedAt)}</strong>
              <p>
                Your account is currently <strong>deactivated</strong>. You cannot log in or make purchases.
                All your personal data will be permanently deleted on{' '}
                <strong>{formatDate(deletionScheduledFor)}</strong>.
              </p>
              <p>
                If you change your mind, you can cancel the deletion request before that date.
              </p>
            </div>
            <button
              onClick={handleCancelDeletion}
              disabled={loading}
              style={{
                ...styles.button,
                ...styles.warningButton,
                ...(loading ? styles.buttonDisabled : {}),
              }}
            >
              {loading ? <LoadingSpinner size="small" /> : 'Cancel Deletion & Reactivate Account'}
            </button>
          </>
        ) : (
          <>
            <p style={styles.cardText}>
              Request permanent deletion of your account. This will:
            </p>
            <ul style={styles.list}>
              <li>❌ Immediately deactivate your account (you will not be able to log in)</li>
              <li>🗑️ Permanently delete all personal data after a 30‑day grace period</li>
              <li>📧 Anonymize your reviews and orders (content remains but identity is removed)</li>
              <li>⏪ You can cancel the request at any time within the 30‑day window</li>
            </ul>
            <button
              onClick={handleRequestDeletion}
              disabled={loading}
              style={{
                ...styles.button,
                ...styles.dangerButton,
                ...(loading ? styles.buttonDisabled : {}),
              }}
            >
              {loading ? <LoadingSpinner size="small" /> : 'Request Account Deletion'}
            </button>
          </>
        )}
      </div>

      {/* Additional Information */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>ℹ️ About Your Data</h3>
        <p style={styles.cardText}>
          We collect and process your personal data only to provide the marketplace services.
          Your data is never sold to third parties. You have the right to:
        </p>
        <ul style={styles.list}>
          <li>✅ Access your data (use the Download button above)</li>
          <li>✅ Rectify inaccurate data (update your profile)</li>
          <li>✅ Request deletion (as described above)</li>
          <li>✅ Withdraw consent (delete your account)</li>
        </ul>
        <p style={styles.cardText}>
          For any privacy‑related questions, please contact our Data Protection Officer at{' '}
          <a href="mailto:privacy@yourmarketplace.com" style={styles.link}>
            privacy@yourmarketplace.com
          </a>.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '24px',
    borderBottom: '1px solid #eee',
    paddingBottom: '16px',
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginTop: 0,
    marginBottom: '12px',
    color: '#333',
  },
  cardText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#555',
    marginBottom: '16px',
  },
  list: {
    marginBottom: '20px',
    paddingLeft: '20px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: 'white',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
    color: 'white',
  },
  warningButton: {
    backgroundColor: '#ffc107',
    color: '#333',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    borderLeft: '4px solid #dc3545',
  },
  successMessage: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    borderLeft: '4px solid #28a745',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    borderLeft: '4px solid #ffc107',
  },
  link: {
    color: '#007bff',
    textDecoration: 'none',
  },
};

export default GDPRSettings;