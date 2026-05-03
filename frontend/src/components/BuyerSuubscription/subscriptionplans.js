import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    const res = await API.get('/buyer-subscription/plans');
    setPlans(res.data.plans);
  };

  const fetchCurrentSubscription = async () => {
    try {
      const res = await API.get('/buyer-subscription/current');
      setCurrentSubscription(res.data.subscription);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    setLoadingAction(true);
    try {
      const res = await API.post('/buyer-subscription/create-checkout', { planId });
      window.location.href = res.data.url; // Redirect to Stripe Checkout
    } catch (err) {
      alert(err.response?.data?.error || 'Subscription creation failed');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your subscription at the end of the current period?')) return;
    setLoadingAction(true);
    try {
      await API.post('/buyer-subscription/cancel');
      alert('Subscription will be canceled at the end of the period');
      fetchCurrentSubscription();
    } catch (err) {
      alert(err.response?.data?.error);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReactivate = async () => {
    setLoadingAction(true);
    try {
      await API.post('/buyer-subscription/reactivate');
      alert('Subscription reactivated');
      fetchCurrentSubscription();
    } catch (err) {
      alert(err.response?.data?.error);
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h1>Premium Membership</h1>
      <p>Get free shipping and exclusive discounts!</p>

      {currentSubscription && currentSubscription.isActive ? (
        <div style={styles.activeCard}>
          <h3>Your current plan: {currentSubscription.planId?.name}</h3>
          <p>Status: {currentSubscription.status}</p>
          <p>Valid until: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}</p>
          {currentSubscription.cancelAtPeriodEnd ? (
            <>
              <p style={{ color: 'orange' }}>Cancellation requested – will end on {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}</p>
              <button onClick={handleReactivate} disabled={loadingAction} style={styles.button}>Reactivate</button>
            </>
          ) : (
            <button onClick={handleCancel} disabled={loadingAction} style={styles.cancelButton}>Cancel Subscription</button>
          )}
        </div>
      ) : (
        <div style={styles.plansGrid}>
          {plans.map(plan => (
            <div key={plan._id} style={styles.planCard}>
              <h3>{plan.name}</h3>
              <p>${(plan.price / 100).toFixed(2)} / {plan.interval}</p>
              <p>{plan.description}</p>
              <ul>
                {plan.perks.freeShipping && <li>✅ Free shipping on all orders</li>}
                {plan.perks.discountPercent > 0 && <li>✅ {plan.perks.discountPercent}% off every order</li>}
              </ul>
              <button onClick={() => handleSubscribe(plan._id)} disabled={loadingAction} style={styles.button}>
                Subscribe
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: 1000, margin: '0 auto', padding: 20 },
  plansGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginTop: 20 },
  planCard: { border: '1px solid #ddd', borderRadius: 8, padding: 20, textAlign: 'center' },
  activeCard: { backgroundColor: '#e8f4ff', padding: 20, borderRadius: 8, marginBottom: 20 },
  button: { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', marginTop: 10 },
  cancelButton: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', marginTop: 10 },
};

export default SubscriptionPlans;