import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const WishlistPage = () => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchWishlist();
    else setLoading(false);
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const res = await API.get('/wishlist');
      setWishlist(res.data.wishlist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await API.delete(`/wishlist/${productId}`);
      setWishlist(wishlist.filter(p => p._id !== productId));
    } catch (err) {
      alert('Failed to remove');
    }
  };

  if (!user) return <div style={styles.container}>Please login to view your wishlist.</div>;
  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h1>My Wishlist</h1>
      {wishlist.length === 0 ? (
        <p>Your wishlist is empty. <Link to="/">Start shopping</Link></p>
      ) : (
        <div style={styles.grid}>
          {wishlist.map(product => (
            <div key={product._id} style={styles.card}>
              <Link to={`/product/${product._id}`}>
                <img src={product.primaryImage || product.imageUrl || 'https://via.placeholder.com/150'} alt={product.name} style={styles.image} />
                <h3>{product.name}</h3>
                <p>${product.price.toFixed(2)}</p>
              </Link>
              <button onClick={() => removeFromWishlist(product._id)} style={styles.removeBtn}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' },
  card: { border: '1px solid #ddd', borderRadius: '8px', padding: '10px', textAlign: 'center', backgroundColor: '#fff' },
  image: { width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' },
  removeBtn: { marginTop: '10px', padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
};

export default WishlistPage;