import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const FrequentlyBoughtTogether = ({ productId, onAddToCart }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    if (productId) fetchFBT();
  }, [productId]);

  const fetchFBT = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/recommendations/fbt/${productId}`);
      setProducts(res.data.products);
      // Initially select all products
      const initial = {};
      res.data.products.forEach(p => { initial[p._id] = true; });
      setSelected(initial);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSelectedToCart = () => {
    const selectedProducts = products.filter(p => selected[p._id]);
    if (selectedProducts.length === 0) return;
    selectedProducts.forEach(p => {
      onAddToCart(p, 1);
    });
    alert(`Added ${selectedProducts.length} item(s) to cart`);
  };

  if (loading) return <LoadingSpinner size="small" />;
  if (products.length === 0) return null;

  return (
    <div style={styles.container}>
      <h3>⚡ Frequently Bought Together</h3>
      <div style={styles.productList}>
        {products.map(product => (
          <div key={product._id} style={styles.productItem}>
            <input
              type="checkbox"
              checked={selected[product._id] || false}
              onChange={() => toggleSelect(product._id)}
            />
            <img src={product.imageUrl} alt={product.name} style={styles.image} />
            <div>
              <div style={styles.name}>{product.name}</div>
              <div style={styles.price}>${product.price}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleAddSelectedToCart} style={styles.addAllBtn}>
        Add Selected to Cart
      </button>
    </div>
  );
};

const styles = {
  container: { marginTop: '24px', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '12px' },
  productList: { display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' },
  productItem: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' },
  image: { width: '60px', height: '60px', objectFit: 'cover' },
  name: { fontWeight: '500' },
  price: { color: '#28a745' },
  addAllBtn: { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' },
};

export default FrequentlyBoughtTogether;