import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const WishlistButton = ({ productId }) => {
  const { user } = useAuth();
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) checkWishlist();
  }, [user, productId]);

  const checkWishlist = async () => {
    try {
      const res = await API.get('/wishlist');
      const ids = res.data.wishlist.map(p => p._id);
      setInWishlist(ids.includes(productId));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      alert('Please login to save items to wishlist');
      return;
    }
    setLoading(true);
    try {
      if (inWishlist) {
        await API.delete(`/wishlist/${productId}`);
      } else {
        await API.post(`/wishlist/${productId}`);
      }
      setInWishlist(!inWishlist);
    } catch (err) {
      alert('Failed to update wishlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={toggleWishlist} disabled={loading} style={styles.button}>
      {inWishlist ? '❤️ Saved to Wishlist' : '🤍 Add to Wishlist'}
    </button>
  );
};

const styles = {
  button: {
    background: 'none',
    border: '1px solid #ddd',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '8px',
  },
};

export default WishlistButton;