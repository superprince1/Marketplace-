import React from 'react';

/**
 * LoadingSpinner Component
 * Displays a centered loading spinner with optional message
 * @param {Object} props
 * @param {string} props.message - Optional loading message
 * @param {string} props.size - Size of spinner (small, medium, large) - default 'medium'
 */
const LoadingSpinner = ({ message = 'Loading...', size = 'medium' }) => {
  const sizeMap = {
    small: { width: '30px', height: '30px', borderWidth: '3px' },
    medium: { width: '50px', height: '50px', borderWidth: '4px' },
    large: { width: '70px', height: '70px', borderWidth: '5px' }
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.spinner,
          width: spinnerSize.width,
          height: spinnerSize.height,
          borderWidth: spinnerSize.borderWidth
        }}
      />
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    padding: '20px'
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  message: {
    marginTop: '16px',
    color: '#666',
    fontSize: '14px'
  }
};

// Add keyframe animation to document (only once)
if (!document.querySelector('#spinner-keyframes')) {
  const style = document.createElement('style');
  style.id = 'spinner-keyframes';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default LoadingSpinner;