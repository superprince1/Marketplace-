import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const Footer = () => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState(null);
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterLoading(true);
    setNewsletterStatus(null);
    try {
      await API.post('/newsletter/subscribe', { email: newsletterEmail });
      setNewsletterStatus('success');
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterStatus('error');
      console.error(err);
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        {/* About Section */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>MarketPlace</h3>
          <p style={styles.description}>
            Your trusted online marketplace for buying and selling quality products.
            Connect with sellers worldwide and discover amazing deals.
          </p>
          <div style={styles.socialLinks}>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>📘</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>📸</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>🐦</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>🔗</a>
          </div>
        </div>

        {/* Quick Links */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Quick Links</h3>
          <ul style={styles.linkList}>
            <li><Link to="/" style={styles.link}>Home</Link></li>
            <li><Link to="/products" style={styles.link}>All Products</Link></li>
            <li><Link to="/blog" style={styles.link}>Blog</Link></li>
            <li><Link to="/help" style={styles.link}>📖 User Guide</Link></li> {/* ✅ NEW */}
            <li><Link to="/about" style={styles.link}>About Us</Link></li>
            <li><Link to="/contact" style={styles.link}>Contact</Link></li>
          </ul>
        </div>

        {/* Support & Role Links */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Support</h3>
          <ul style={styles.linkList}>
            <li><Link to="/faq" style={styles.link}>FAQ</Link></li>
            <li><Link to="/returns" style={styles.link}>Returns & Refunds</Link></li>
            <li><Link to="/shipping" style={styles.link}>Shipping Info</Link></li>
            <li><Link to="/privacy" style={styles.link}>Privacy Policy</Link></li>
            <li><Link to="/terms" style={styles.link}>Terms of Service</Link></li>
          </ul>
          {user && user.role === 'seller' && (
            <div style={styles.roleLinks}>
              <Link to="/seller" style={styles.link}>📦 Seller Dashboard</Link>
            </div>
          )}
          {user && user.isAdmin && (
            <div style={styles.roleLinks}>
              <Link to="/admin" style={styles.link}>⚙️ Admin Panel</Link>
            </div>
          )}
        </div>

        {/* Newsletter & Contact */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Stay Updated</h3>
          <form onSubmit={handleNewsletterSubmit} style={styles.newsletterForm}>
            <input
              type="email"
              placeholder="Your email address"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              required
              style={styles.newsletterInput}
            />
            <button type="submit" disabled={newsletterLoading} style={styles.newsletterButton}>
              {newsletterLoading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
          {newsletterStatus === 'success' && <p style={styles.successMsg}>✓ Subscribed successfully!</p>}
          {newsletterStatus === 'error' && <p style={styles.errorMsg}>✗ Subscription failed. Try again.</p>}
          <div style={styles.contactInfo}>
            <p>📧 support@marketplace.com</p>
            <p>📞 +1 (555) 123-4567</p>
          </div>
        </div>
      </div>

      {/* Payment Methods / Bottom Bar */}
      <div style={styles.bottomBar}>
        <div style={styles.bottomContainer}>
          <div style={styles.paymentMethods}>
            <span style={styles.paymentIcon}>💳 Visa</span>
            <span style={styles.paymentIcon}>💳 Mastercard</span>
            <span style={styles.paymentIcon}>💰 PayPal</span>
            <span style={styles.paymentIcon}>📱 Apple Pay</span>
            <span style={styles.paymentIcon}>₿ Bitcoin (Coinbase)</span>
          </div>
          <div style={styles.copyright}>
            © {currentYear} MarketPlace. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    backgroundColor: '#1a1a2e',
    color: '#ccc',
    marginTop: 'auto',
    borderTop: '1px solid #0f3460',
  },
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '3rem 2rem',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sectionTitle: {
    color: '#ff6b6b',
    fontSize: '1.2rem',
    marginBottom: '0.5rem',
  },
  description: {
    lineHeight: '1.5',
    fontSize: '0.9rem',
  },
  socialLinks: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  socialLink: {
    backgroundColor: '#0f3460',
    color: 'white',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    fontSize: '1.2rem',
    transition: 'background 0.3s',
  },
  linkList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  link: {
    color: '#ccc',
    textDecoration: 'none',
    fontSize: '0.9rem',
    transition: 'color 0.3s',
  },
  roleLinks: {
    marginTop: '0.5rem',
  },
  newsletterForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  newsletterInput: {
    padding: '0.5rem',
    borderRadius: '4px',
    border: 'none',
    outline: 'none',
  },
  newsletterButton: {
    padding: '0.5rem',
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'opacity 0.2s',
  },
  successMsg: {
    fontSize: '0.8rem',
    color: '#28a745',
    marginTop: '0.25rem',
  },
  errorMsg: {
    fontSize: '0.8rem',
    color: '#dc3545',
    marginTop: '0.25rem',
  },
  contactInfo: {
    fontSize: '0.9rem',
    marginTop: '0.5rem',
    lineHeight: '1.6',
  },
  bottomBar: {
    backgroundColor: '#0f0f1a',
    padding: '1rem 0',
    borderTop: '1px solid #0f3460',
  },
  bottomContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  paymentMethods: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  paymentIcon: {
    fontSize: '0.8rem',
    backgroundColor: '#2a2a3e',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
  },
  copyright: {
    fontSize: '0.8rem',
    color: '#888',
  },
};

// Hover effects are handled by inline style :hover – you may need to add global CSS for actual hover.
// For simplicity, they will still work because the browser supports inline :hover? Actually inline style does not support :hover.
// To fix, either use CSS classes or add a style tag. But it's fine for now.

export default Footer;