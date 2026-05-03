import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useCart from '../hooks/useCart'; // ✅ Cart hook
import { useExperiment } from '../context/ExperimentContext';
import API from '../services/api';
import ProductList from '../components/Products/ProductList';
import ProductCard from '../components/Products/ProductCard';
import NewsletterSignup from '../components/NewsletterSignup';
import SkeletonHomeSection from '../components/UI/SkeletonHomeSection';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const HomePage = () => {
  const { user } = useAuth();
  const { addItem } = useCart(); // ✅ Get add to cart function from hook
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionData, setSectionData] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // ========== A/B TESTING EXPERIMENTS ==========
  const { variant: heroVariant, trackConversion: trackHeroConversion } = useExperiment('homepage_hero');
  const { variant: layoutVariant } = useExperiment('homepage_layout');
  const { variant: bannerVariant, trackConversion: trackBannerConversion } = useExperiment('homepage_banner');

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (user) {
      setLoadingRecs(true);
      API.get('/recommendations')
        .then(res => setRecommendations(res.data.recommendations))
        .catch(console.error)
        .finally(() => setLoadingRecs(false));
    }
  }, [user]);

  const fetchSections = async () => {
    try {
      const res = await API.get('/admin/homepage/public');
      const enabledSections = res.data.sections;
      setSections(enabledSections);

      // Prefetch products for sections that need them
      for (const section of enabledSections) {
        if (['flashDeals', 'promoted', 'digital'].includes(section.type)) {
          const params = { limit: section.productLimit || 8 };
          if (section.productFilters) {
            if (section.productFilters.category) params.category = section.productFilters.category;
            if (section.productFilters.promoted) params.promoted = true;
            if (section.productFilters.discount) params.discount = section.productFilters.discount;
            if (section.productFilters.sort) params.sort = section.productFilters.sort;
          }
          const productsRes = await API.get('/products', { params });
          setSectionData(prev => ({ ...prev, [section._id]: productsRes.data.products }));
        }
      }
    } catch (err) {
      console.error('Failed to load homepage sections', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: track conversion when user interacts and add to cart
  const handleAddToCartWithTracking = (product, quantity, selectedVariations) => {
    addItem(product, quantity, selectedVariations);
    // Track conversion for active experiments if needed
    trackHeroConversion({ action: 'add_to_cart', productId: product._id });
    trackBannerConversion({ action: 'add_to_cart', productId: product._id });
  };

  // ========== RENDER DYNAMIC HERO BASED ON EXPERIMENT ==========
  const renderHero = (defaultTitle = 'Welcome to Marketplace', defaultSubtitle = '', defaultBtnLink = '/products') => {
    const config = heroVariant?.config || {};
    const title = config.title || defaultTitle;
    const subtitle = config.subtitle || defaultSubtitle;
    const btnText = config.btnText || 'Shop Now';
    const btnLink = config.btnLink || defaultBtnLink;
    const bgColor = config.bgColor || '#1a1a2e';
    const bgGradient = config.bgGradient || 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';

    return (
      <div style={{
        ...styles.hero,
        background: bgGradient,
        backgroundColor: bgColor,
      }}>
        <div style={styles.heroContent}>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
          <a href={btnLink} style={styles.heroBtn}>{btnText}</a>
        </div>
      </div>
    );
  };

  // ========== RENDER CATEGORIES SECTION (can be personalised) ==========
  const renderCategories = (section) => {
    let categories = section.categories?.length ? section.categories : [
      { name: 'Electronics', icon: '📱', color: '#007bff', link: '/products?category=Electronics' },
      { name: 'Clothing', icon: '👕', color: '#28a745', link: '/products?category=Clothing' },
      { name: 'Books', icon: '📚', color: '#17a2b8', link: '/products?category=Books' },
    ];
    if (layoutVariant?.config?.categories) {
      categories = layoutVariant.config.categories;
    }
    const gridColumns = layoutVariant?.config?.categoryGridColumns || 'repeat(auto-fill, minmax(100px, 1fr))';
    return (
      <div style={styles.section}>
        <h2>{section.title || 'Shop by Category'}</h2>
        <div style={{ ...styles.categoryGrid, gridTemplateColumns: gridColumns }}>
          {categories.map(cat => (
            <Link key={cat.name} to={cat.link} style={styles.categoryCard}>
              <div style={{ ...styles.categoryIcon, backgroundColor: cat.color }}>{cat.icon}</div>
              <span>{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  // ========== RENDER PRODUCT GRID (with personalised layout) ==========
  const renderProductSection = (section, products) => {
    if (!products.length) return null;
    const gridColumns = layoutVariant?.config?.productGridColumns || styles.productGrid.gridTemplateColumns;
    return (
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>{section.title}</h2>
          {section.link && <Link to={section.link} style={styles.viewAllLink}>View All →</Link>}
        </div>
        <div style={{ ...styles.productGrid, gridTemplateColumns: gridColumns }}>
          {products.map(product => (
            <ProductCard key={product._id} product={product} onAddToCart={handleAddToCartWithTracking} layout="grid" />
          ))}
        </div>
      </div>
    );
  };

  const renderSection = (section) => {
    switch (section.type) {
      case 'hero':
        return renderHero(section.title, section.subtitle, section.link);
      case 'categories':
        return renderCategories(section);
      case 'flashDeals':
      case 'promoted':
      case 'digital':
        const products = sectionData[section._id] || [];
        return renderProductSection(section, products);
      case 'newsletter':
        return <NewsletterSignup />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <SkeletonHomeSection type="hero" />
        <SkeletonHomeSection type="categories" />
        <SkeletonHomeSection type="productRow" />
        <SkeletonHomeSection type="productRow" />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {sections.map(section => (
        <div key={section._id}>
          {renderSection(section)}
        </div>
      ))}

      {/* Optional banner experiment */}
      {bannerVariant && bannerVariant.config?.html && (
        <div style={styles.bannerExperiment} onClick={() => trackBannerConversion({ click: true })}>
          <div dangerouslySetInnerHTML={{ __html: bannerVariant.config.html }} />
        </div>
      )}

      {/* Personalized Recommendations – only for logged‑in users */}
      {user && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>Recommended for You</h2>
            <Link to="/products" style={styles.viewAllLink}>View All →</Link>
          </div>
          {loadingRecs ? (
            <div style={styles.productGrid}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={styles.skeletonProductCard}></div>
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div style={styles.productGrid}>
              {recommendations.map(product => (
                <ProductCard key={product._id} product={product} onAddToCart={handleAddToCartWithTracking} layout="grid" />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '1280px', margin: '0 auto', padding: '20px' },
  hero: { borderRadius: '16px', padding: '60px 20px', marginBottom: '40px', textAlign: 'center', color: 'white' },
  heroBtn: { backgroundColor: '#007bff', padding: '12px 24px', borderRadius: '8px', color: 'white', textDecoration: 'none', display: 'inline-block' },
  section: { marginBottom: '48px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' },
  viewAllLink: { color: '#007bff', textDecoration: 'none' },
  categoryGrid: { display: 'grid', gap: '20px', textAlign: 'center' },
  categoryCard: { textDecoration: 'none', color: '#333', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  categoryIcon: { width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', marginBottom: '8px' },
  productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' },
  skeletonProductCard: {
    backgroundColor: '#e0e0e0',
    borderRadius: '8px',
    height: '280px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  bannerExperiment: { margin: '20px 0', textAlign: 'center' },
};

export default HomePage;