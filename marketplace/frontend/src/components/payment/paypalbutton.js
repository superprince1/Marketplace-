import React from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { createPayPalOrder, capturePayPalOrder } from '../../services/api';

const PayPalButton = ({ orderId, onSuccess, onError }) => {
  const createOrder = async () => {
    const { orderID } = await createPayPalOrder(orderId);
    return orderID;
  };
  
  const onApprove = async (data) => {
    const result = await capturePayPalOrder(data.orderID, orderId);
    if (result.success) onSuccess();
    else onError('PayPal payment failed');
  };
  
  return (
    <PayPalScriptProvider options={{ 
      clientId: process.env.REACT_APP_PAYPAL_CLIENT_ID,
      currency: 'USD'
    }}>
      <PayPalButtons createOrder={createOrder} onApprove={onApprove} onError={onError} />
    </PayPalScriptProvider>
  );
};

export default PayPalButton;