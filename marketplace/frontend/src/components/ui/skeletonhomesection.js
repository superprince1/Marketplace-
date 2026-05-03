import React from 'react';

const SkeletonHomeSection = ({ type }) => {
  if (type === 'hero') {
    return <div style={styles.hero}></div>;
  }
  if (type === 'categories') {
    return (
      <div style={styles.categories}>
        {[...Array(6)].map((_, i) => <div key={i} style={styles.categoryCard}></div>)}
      </div>
    );
  }
  // For product rows (flashDeals, promoted, digital, recommendations)
  return (
    <div style={styles.productRow}>
      <div style={styles.rowHeader}></div>
      <div style={styles.productGrid}>
        {[...Array(4)].map((_, i) => <div key={i} style={styles.productCard}></div>)}
      </div>
    </div>
  );
};

const styles = {
  hero: { height: '300px', backgroundColor: '#e0e0e0', borderRadius: '16px', marginBottom: '40px', animation: 'pulse 1.5s ease-in-out infinite' },
  categories: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '20px', marginBottom: '48px' },
  categoryCard: { height: '90px', backgroundColor: '#e0e0e0', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite' },
  productRow: { marginBottom: '48px' },
  rowHeader: { height: '30px', width: '200px', backgroundColor: '#e0e0e0', marginBottom: '20px', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' },
  productCard: { height: '280px', backgroundColor: '#e0e0e0', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' },
};

export default SkeletonHomeSection;