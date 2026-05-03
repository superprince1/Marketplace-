import React, { useState } from 'react';
import API from '../../services/api';

const SharePurchaseButton = ({ orderId }) => {
  const [shared, setShared] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      await API.post(`/social/share-purchase/${orderId}`);
      setShared(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to share');
    } finally {
      setLoading(false);
    }
  };

  if (shared) return <span style={{ color: '#28a745' }}>✓ Shared to feed</span>;

  return (
    <button onClick={handleShare} disabled={loading} style={styles.shareBtn}>
      {loading ? 'Sharing...' : '📢 Share Purchase with Friends'}
    </button>
  );
};

const styles = {
  shareBtn: {
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 4,
    cursor: 'pointer',
    marginTop: 10,
  },
};

export default SharePurchaseButton;