import React from 'react';
import { createCoinbaseCharge } from '../../services/api';

const CoinbaseButton = ({ orderId, name, email, onError }) => {
  const handlePay = async () => {
    try {
      const { hostedUrl } = await createCoinbaseCharge(orderId, name, email);
      window.location.href = hostedUrl;
    } catch (err) {
      onError(err.message);
    }
  };
  
  return (
    <button onClick={handlePay} style={styles.button}>
      Pay with Crypto (Coinbase)
    </button>
  );
};

const styles = { button: { padding: '10px 20px', backgroundColor: '#0052ff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' } };
export default CoinbaseButton;