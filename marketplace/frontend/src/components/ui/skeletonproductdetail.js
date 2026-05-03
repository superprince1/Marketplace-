import React from 'react';

const SkeletonProductDetail = () => {
  return (
    <div style={styles.container}>
      <div style={styles.breadcrumb}></div>
      <div style={styles.productContainer}>
        <div style={styles.gallery}>
          <div style={styles.mainImage}></div>
          <div style={styles.thumbnails}>
            <div style={styles.thumbnail}></div>
            <div style={styles.thumbnail}></div>
            <div style={styles.thumbnail}></div>
          </div>
        </div>
        <div style={styles.info}>
          <div style={styles.title}></div>
          <div style={styles.sellerRow}></div>
          <div style={styles.rating}></div>
          <div style={styles.price}></div>
          <div style={styles.variation}></div>
          <div style={styles.stock}></div>
          <div style={styles.actions}></div>
          <div style={styles.tabs}></div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  breadcrumb: { height: '20px', backgroundColor: '#e0e0e0', width: '300px', marginBottom: '20px', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  productContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' },
  gallery: { position: 'sticky', top: '20px' },
  mainImage: { height: '400px', backgroundColor: '#e0e0e0', borderRadius: '8px', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite' },
  thumbnails: { display: 'flex', gap: '10px' },
  thumbnail: { width: '80px', height: '80px', backgroundColor: '#e0e0e0', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  info: { display: 'flex', flexDirection: 'column', gap: '16px' },
  title: { height: '32px', backgroundColor: '#e0e0e0', width: '80%', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  sellerRow: { height: '20px', backgroundColor: '#e0e0e0', width: '50%', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  rating: { height: '20px', backgroundColor: '#e0e0e0', width: '30%', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  price: { height: '36px', backgroundColor: '#e0e0e0', width: '40%', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  variation: { height: '60px', backgroundColor: '#e0e0e0', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  stock: { height: '24px', backgroundColor: '#e0e0e0', width: '30%', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  actions: { height: '48px', backgroundColor: '#e0e0e0', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  tabs: { height: '200px', backgroundColor: '#e0e0e0', borderRadius: '4px', marginTop: '16px', animation: 'pulse 1.5s ease-in-out infinite' },
};

export default SkeletonProductDetail;