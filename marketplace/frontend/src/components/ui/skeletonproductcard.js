import React from 'react';

const SkeletonProductCard = () => {
  return (
    <div style={styles.card}>
      <div style={styles.image}></div>
      <div style={styles.info}>
        <div style={styles.title}></div>
        <div style={styles.seller}></div>
        <div style={styles.price}></div>
        <div style={styles.button}></div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  image: {
    height: '200px',
    backgroundColor: '#e0e0e0',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  info: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  title: {
    height: '16px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  seller: {
    height: '12px',
    width: '60%',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  price: {
    height: '20px',
    width: '40%',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  button: {
    height: '36px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    marginTop: '8px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

export default SkeletonProductCard;