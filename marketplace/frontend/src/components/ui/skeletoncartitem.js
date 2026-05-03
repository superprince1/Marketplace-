import React from 'react';

const SkeletonCartItem = () => {
  return (
    <div style={styles.cartItem}>
      <div style={styles.image}></div>
      <div style={styles.info}>
        <div style={styles.name}></div>
        <div style={styles.variation}></div>
        <div style={styles.price}></div>
        <div style={styles.actions}></div>
      </div>
      <div style={styles.total}></div>
    </div>
  );
};

const styles = {
  cartItem: { display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #ddd', padding: '12px 0', flexWrap: 'wrap' },
  image: { width: '80px', height: '80px', backgroundColor: '#e0e0e0', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  info: { flex: 2, minWidth: '180px' },
  name: { height: '20px', backgroundColor: '#e0e0e0', width: '60%', marginBottom: '8px', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  variation: { height: '16px', backgroundColor: '#e0e0e0', width: '40%', marginBottom: '8px', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  price: { height: '18px', backgroundColor: '#e0e0e0', width: '30%', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  actions: { display: 'flex', gap: '10px', marginTop: '8px' },
  total: { fontWeight: 'bold', minWidth: '80px', textAlign: 'right', height: '20px', backgroundColor: '#e0e0e0', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
};

export default SkeletonCartItem;