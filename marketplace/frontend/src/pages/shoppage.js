import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ProductCard from '../components/Products/ProductCard';

const ShopPage = ({ addToCart }) => {
  const { slug } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const res = await API.get(`/shop/${slug}`);
        setShop(res.data.shop);
        setProducts(res.data.products);
      } catch (err) {
        setError(err.response?.data?.error || 'Shop not found');
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, [slug]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ textAlign: 'center', padding: '50px' }}>⚠️ {error}</div>;
  if (!shop) return null;

  return (
    <div style={styles.container}>
      {/* Banner */}
      {shop.banner && (
        <div style={styles.bannerContainer}>
          <img src={shop.banner} alt={shop.name} style={styles.banner} />
        </div>
      )}
      {/* Shop Header */}
      <div style={styles.header}>
        {shop.logo && <img src={shop.logo} alt={shop.name} style={styles.logo} />}
        <div style={styles.info}>
          <h1>{shop.name}</h1>
          <p>{shop.description}</p>
          {shop.contactEmail && <div>📧 {shop.contactEmail}</div>}
          {shop.contactPhone && <div>📞 {shop.contactPhone}</div>}
          <div style={styles.socialLinks}>
            {shop.socialLinks?.facebook && <a href={shop.socialLinks.facebook} target="_blank">Facebook</a>}
            {shop.socialLinks?.instagram && <a href={shop.socialLinks.instagram} target="_blank">Instagram</a>}
            {shop.socialLinks?.twitter && <a href={shop.socialLinks.twitter} target="_blank">Twitter</a>}
          </div>
        </div>
      </div>
      {/* Products */}
      <h2>Products from this shop</h2>
      <div style={styles.productsGrid}>
        {products.map(product => (
          <ProductCard key={product._id} product={product} onAddToCart={addToCart} />
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  bannerContainer: { marginBottom: '20px' },
  banner: { width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' },
  header: { display: 'flex', gap: '30px', marginBottom: '40px', flexWrap: 'wrap', alignItems: 'center' },
  logo: { width: '120px', height: '120px', objectFit: 'cover', borderRadius: '50%' },
  info: { flex: 1 },
  socialLinks: { display: 'flex', gap: '12px', marginTop: '8px' },
  productsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
};

export default ShopPage;