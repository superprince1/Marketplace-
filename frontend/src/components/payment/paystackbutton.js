import React from 'react';
import { initializePaystack } from '../../services/api';

const PaystackButton = ({ orderId, email, amount, onSuccess, onError }) => {
  const handlePay = async () => {
    try {
      const { authorizationUrl } = await initializePaystack(orderId, email);
      window.location.href = authorizationUrl;
    } catch (err) {
      onError(err.message);
    }
  };
  
  return (
    <button onClick={handlePay} style={styles.button}>
      Pay with Paystack
    </button>
  );
};

const styles = { button: { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' } };
export default PaystackButton;