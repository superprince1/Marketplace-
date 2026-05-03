import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import ProductCard from '../ProductCard';

const AlsoBought = ({ productId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productId) fetchAlsoBought();
  }, [productId]);

  const fetchAlsoBought = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/recommendations/also/${productId}`);
      setProducts(res.data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (products.length === 0) return null;

  return (
    <div style={styles.container}>
      <h3>📦 Customers Also Bought</h3>
      <div style={styles.grid}>
        {products.slice(0, 4).map(p => (
          <ProductCard key={p._id} product={p} layout="grid" />
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { marginTop: '32px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
};

export default AlsoBought;