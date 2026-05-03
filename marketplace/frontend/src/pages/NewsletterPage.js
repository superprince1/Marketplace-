import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';

const NewsletterPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error'
  const [message, setMessage] = useState('');

  const validateEmail = (email) => {
    const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }
    if (!validateEmail(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setStatus(null);
    setMessage('');

    try {
      await API.post('/newsletter/subscribe', { email });
      setStatus('success');
      setMessage('Thank you for subscribing! You will receive our latest updates.');
      setEmail('');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Subscription failed. Please try again later.';
      setStatus('error');
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>📧</div>
        <h1 style={styles.title}>Subscribe to Our Newsletter</h1>
        <p style={styles.subtitle}>
          Get the latest product updates, exclusive offers, and marketplace news delivered straight to your inbox.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Subscribing...' : 'Subscribe Now'}
          </button>
        </form>

        {status === 'success' && (
          <div style={styles.successMessage}>
            ✅ {message}
          </div>
        )}
        {status === 'error' && (
          <div style={styles.errorMessage}>
            ❌ {message}
          </div>
        )}

        <p style={styles.footerText}>
          No spam, ever. Unsubscribe anytime.
        </p>
        <Link to="/" style={styles.backLink}>← Back to Home</Link>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    padding: '40px 20px',
    backgroundColor: '#f8f9fa',
  },
  card: {
    maxWidth: '500px',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '40px 30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '32px',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  input: {
    padding: '14px 16px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '14px 16px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  successMessage: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  footerText: {
    fontSize: '13px',
    color: '#999',
    marginBottom: '24px',
  },
  backLink: {
    display: 'inline-block',
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '14px',
  },
};

export default NewsletterPage;