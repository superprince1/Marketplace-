import React from 'react';
import { Link } from 'react-router-dom';

/**
 * NotFound Component - 404 Page
 * Displayed when a route doesn't exist
 */
const NotFound = () => {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.icon}>🔍</div>
        <h1 style={styles.title}>404</h1>
        <h2 style={styles.subtitle}>Page Not Found</h2>
        <p style={styles.message}>
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div style={styles.actions}>
          <Link to="/" style={styles.homeLink}>
            Go Back Home
          </Link>
          <button onClick={() => window.history.back()} style={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: '20px'
  },
  content: {
    textAlign: 'center',
    maxWidth: '500px'
  },
  icon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  title: {
    fontSize: '72px',
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '24px',
    color: '#333',
    marginBottom: '16px'
  },
  message: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px'
  },
  actions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  homeLink: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    transition: 'background 0.2s'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  }
};

export default NotFound;