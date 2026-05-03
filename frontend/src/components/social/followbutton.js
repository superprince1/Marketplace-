import React, { useState, useEffect } from 'react';
import API from '../../services/api';

const FollowButton = ({ sellerId, onToggle }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkFollow = async () => {
      try {
        const res = await API.get(`/social/follow/check/${sellerId}`);
        setIsFollowing(res.data.isFollowing);
      } catch (err) {
        console.error(err);
      }
    };
    checkFollow();
  }, [sellerId]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        await API.delete(`/social/follow/${sellerId}`);
      } else {
        await API.post(`/social/follow/${sellerId}`);
      }
      setIsFollowing(!isFollowing);
      if (onToggle) onToggle(!isFollowing);
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      style={{
        backgroundColor: isFollowing ? '#6c757d' : '#007bff',
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '13px',
      }}
    >
      {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
};

export default FollowButton;