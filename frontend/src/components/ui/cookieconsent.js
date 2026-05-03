import React, { useState, useEffect } from 'react';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookieConsent', 'all');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setVisible(false);
    // Optionally enable analytics scripts etc.
  };

  const acceptNecessary = () => {
    localStorage.setItem('cookieConsent', 'necessary');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setVisible(false);
    // Disable non‑essential cookies
  };

  if (!visible) return null;

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <p style={styles.text}>
          🍪 We use cookies to enhance your experience, analyze traffic, and personalize content.
          By clicking "Accept All", you consent to our use of cookies.
          <a href="/privacy" style={styles.link}> Read our Privacy Policy</a>
        </p>
        <div style={styles.buttons}>
          <button onClick={acceptNecessary} style={styles.necessaryBtn}>Necessary Only</button>
          <button onClick={acceptAll} style={styles.acceptBtn}>Accept All</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  banner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a2e',
    color: 'white',
    padding: '16px',
    zIndex: 1000,
    boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  text: {
    margin: 0,
    fontSize: '14px',
    flex: 2,
  },
  link: {
    color: '#4a9eff',
    textDecoration: 'none',
    marginLeft: '8px',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
  },
  necessaryBtn: {
    backgroundColor: 'transparent',
    color: '#ccc',
    border: '1px solid #ccc',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  acceptBtn: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default CookieConsent;