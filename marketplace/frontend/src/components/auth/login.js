import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Login Component - User authentication
 * Features:
 * - Email and password fields
 * - Form validation
 * - Error messages
 * - Loading state
 * - Redirect to previous page or home after login
 * - "Remember me" option (optional)
 * - Forgot password link (placeholder)
 * - Social login placeholders (Google, Facebook)
 */
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state or default to home
  const from = location.state?.from?.pathname || '/';

  // Load saved email from localStorage if exists
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      
      // Save email if "Remember me" is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Demo credentials for testing
  const fillDemoCredentials = (role) => {
    if (role === 'buyer') {
      setEmail('buyer@test.com');
      setPassword('123456');
    } else if (role === 'seller') {
      setEmail('seller@test.com');
      setPassword('123456');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span style={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError('')} style={styles.closeError}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
              style={styles.input}
              autoComplete="email"
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              style={styles.input}
              autoComplete="current-password"
            />
          </div>

          <div style={styles.optionsRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={styles.checkbox}
              />
              Remember me
            </label>
            <Link to="/forgot-password" style={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.loginButton,
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Credentials - For testing only, remove in production */}
        <div style={styles.demoSection}>
          <p style={styles.demoTitle}>Demo Credentials (for testing)</p>
          <div style={styles.demoButtons}>
            <button onClick={() => fillDemoCredentials('buyer')} style={styles.demoBuyerBtn}>
              Buyer Demo
            </button>
            <button onClick={() => fillDemoCredentials('seller')} style={styles.demoSellerBtn}>
              Seller Demo
            </button>
          </div>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>Or continue with</span>
          <span style={styles.dividerLine}></span>
        </div>

        <div style={styles.socialButtons}>
          <button style={styles.googleBtn}>
            <span style={styles.socialIcon}>G</span> Google
          </button>
          <button style={styles.fbBtn}>
            <span style={styles.socialIcon}>f</span> Facebook
          </button>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Don't have an account?{' '}
            <Link to="/register" style={styles.registerLink}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// ========== STYLES ==========
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 200px)',
    padding: '20px',
    backgroundColor: '#f8f9fa'
  },
  card: {
    maxWidth: '450px',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    padding: '32px',
    transition: 'transform 0.2s'
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666'
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
    position: 'relative'
  },
  errorIcon: {
    fontSize: '16px'
  },
  closeError: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#721c24'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    padding: '12px 14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '16px',
    transition: 'border-color 0.2s',
    outline: 'none'
  },
  optionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    color: '#555'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  forgotLink: {
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '13px'
  },
  loginButton: {
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  },
  demoSection: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #eee'
  },
  demoTitle: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '10px',
    textAlign: 'center'
  },
  demoButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  },
  demoBuyerBtn: {
    padding: '6px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  demoSellerBtn: {
    padding: '6px 16px',
    backgroundColor: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '24px 0'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e0e0e0'
  },
  dividerText: {
    fontSize: '12px',
    color: '#999'
  },
  socialButtons: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px'
  },
  googleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.2s'
  },
  fbBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    backgroundColor: '#1877f2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  socialIcon: {
    fontWeight: 'bold',
    fontSize: '16px'
  },
  footer: {
    textAlign: 'center',
    marginTop: '16px'
  },
  footerText: {
    fontSize: '14px',
    color: '#666'
  },
  registerLink: {
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: '500'
  }
};

export default Login;