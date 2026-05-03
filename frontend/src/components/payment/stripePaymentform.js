import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { createStripePaymentIntent } from '../../services/api';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const StripePaymentFormInner = ({ orderId, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    
    setLoading(true);
    try {
      const { clientSecret } = await createStripePaymentIntent(orderId);
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });
      if (error) throw error;
      onSuccess(paymentIntent);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement options={{ hidePostalCode: true }} />
      <button type="submit" disabled={!stripe || loading} style={styles.button}>
        {loading ? 'Processing...' : 'Pay with Card'}
      </button>
    </form>
  );
};

export const StripePaymentForm = (props) => (
  <Elements stripe={stripePromise}>
    <StripePaymentFormInner {...props} />
  </Elements>
);

const styles = { button: { marginTop: 16, padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' } };