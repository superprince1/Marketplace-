import React, { useState } from 'react';
import API from '../services/api';

const NewsletterSignup = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await API.post('/newsletter/subscribe', { email });
      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h3>Subscribe to our newsletter</h3>
      <p>Get the latest products and exclusive offers delivered to your inbox.</p>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {status === 'success' && <p style={styles.success}>✓ Thank you for subscribing!</p>}
      {status === 'error' && <p style={styles.error}>✗ Subscription failed. Please try again.</p>}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center',
    margin: '20px 0',
  },
  form: {
    display: 'flex',
    gap: '10px',
    maxWidth: '450px',
    margin: '0 auto',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  success: { color: '#28a745', marginTop: '12px' },
  error: { color: '#dc3545', marginTop: '12px' },
};

export default NewsletterSignup;