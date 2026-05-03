import React from 'react';

const SkeletonOrderCard = () => {
  return (
    <div style={styles.orderCard}>
      <div style={styles.header}>
        <div style={styles.orderNumber}></div>
        <div style={styles.status}></div>
      </div>
      <div style={styles.items}>
        <div style={styles.item}></div>
        <div style={styles.item}></div>
      </div>
      <div style={styles.footer}></div>
    </div>
  );
};

const styles = {
  orderCard: { border: '1px solid #ddd', borderRadius: '8px', marginBottom: '16px', padding: '16px', backgroundColor: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px' },
  orderNumber: { height: '20px', width: '200px', backgroundColor: '#e0e0e0', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  status: { height: '24px', width: '80px', backgroundColor: '#e0e0e0', borderRadius: '20px', animation: 'pulse 1.5s ease-in-out infinite' },
  items: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' },
  item: { height: '60px', backgroundColor: '#e0e0e0', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' },
  footer: { height: '36px', backgroundColor: '#e0e0e0', borderRadius: '4px', width: '30%', animation: 'pulse 1.5s ease-in-out infinite' },
};

export default SkeletonOrderCard;