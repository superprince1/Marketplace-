import React, { useState, useEffect } from 'react';
import API from '../../services/api';

const LikeButton = ({ productId, onLikeChange }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countRes, likeRes] = await Promise.all([
          API.get(`/social/like/count/${productId}`),
          API.get(`/social/like/check/${productId}`),
        ]);
        setLikeCount(countRes.data.count);
        setIsLiked(likeRes.data.isLiked);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [productId]);

  const handleLike = async () => {
    setLoading(true);
    try {
      if (isLiked) {
        await API.delete(`/social/like/${productId}`);
        setLikeCount(prev => prev - 1);
      } else {
        await API.post(`/social/like/${productId}`);
        setLikeCount(prev => prev + 1);
      }
      setIsLiked(!isLiked);
      if (onLikeChange) onLikeChange(!isLiked);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to like/unlike');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        color: isLiked ? '#e74c3c' : '#aaa',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span>{isLiked ? '❤️' : '🤍'}</span>
      <span>{likeCount}</span>
    </button>
  );
};

export default LikeButton;