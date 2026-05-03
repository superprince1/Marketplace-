import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Register Component - New user registration
 * Features:
 * - Name, email, password, confirm password fields
 * - Role selection (Buyer / Seller)
 * - Optional fields: phone, address
 * - Form validation (email format, password length, password match)
 * - Error messages
 * - Loading state
 * - Redirect to home after registration
 * - Terms & conditions checkbox
 * - Social registration placeholders
 */
const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'buyer',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    }
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    // Email validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Terms agreement
    if (!agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the Terms & Conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare registration data (remove confirmPassword and address fields if empty)
      const registerData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      };
      
      // Add optional phone if provided
      if (formData.phone) registerData.phone = formData.phone;
      
      // Add address if any field is filled
      const hasAddress = Object.values(formData.address).some(val => val && val !== 'USA');
      if (hasAddress) {
        registerData.address = formData.address;
      }
      
      await register(registerData);
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      setGeneralError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fill demo buyer data
  const fillDemoBuyer = () => {
    setFormData({
      name: 'John Buyer',
      email: 'buyer@example.com',
      password: '123456',
      confirmPassword: '123456',
      role: 'buyer',
      phone: '555-123-4567',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'USA'
      }
    });
    setAgreeTerms(true);
  };

  // Fill demo seller data
  const fillDemoSeller = () => {
    setFormData({
      name: 'Jane Seller',
      email: 'seller@example.com',
      password: '123456',
      confirmPassword: '123456',
      role: 'seller',
      phone: '555-987-6543',
      address: {
        street: '456 Market Ave',
        city: 'Shopville',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      }
    });
    setAgreeTerms(true);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Join our marketplace today</p>
        </div>

        {generalError && (
          <div style={styles.errorAlert}>
            <span style={styles.errorIcon}>⚠️</span>
            <span>{generalError}</span>
            <button onClick={() => setGeneralError('')} style={styles.closeError}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name */}
          <div style={styles.inputGroup}>
            <label htmlFor="name" style={styles.label}>Full Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              disabled={loading}
              style={{...styles.input, ...(errors.name ? styles.inputError : {})}}
            />
            {errors.name && <span style={styles.errorText}>{errors.name}</span>}
          </div>

          {/* Email */}
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Email Address *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              disabled={loading}
              style={{...styles.input, ...(errors.email ? styles.inputError : {})}}
            />
            {errors.email && <span style={styles.errorText}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Password *</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password (min 6 characters)"
              disabled={loading}
              style={{...styles.input, ...(errors.password ? styles.inputError : {})}}
            />
            {errors.password && <span style={styles.errorText}>{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div style={styles.inputGroup}>
            <label htmlFor="confirmPassword" style={styles.label}>Confirm Password *</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              disabled={loading}
              style={{...styles.input, ...(errors.confirmPassword ? styles.inputError : {})}}
            />
            {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
          </div>

          {/* Role Selection */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>I want to sign up as *</label>
            <div style={styles.roleButtons}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: 'buyer' }))}
                style={{
                  ...styles.roleBtn,
                  ...(formData.role === 'buyer' ? styles.roleBtnActive : {})
                }}
              >
                🛍️ Buyer
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: 'seller' }))}
                style={{
                  ...styles.roleBtn,
                  ...(formData.role === 'seller' ? styles.roleBtnActive : {})
                }}
              >
                📦 Seller
              </button>
            </div>
          </div>

          {/* Phone (Optional) */}
          <div style={styles.inputGroup}>
            <label htmlFor="phone" style={styles.label}>Phone Number (Optional)</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              disabled={loading}
              style={styles.input}
            />
          </div>

          {/* Address Section (Optional) */}
          <div style={styles.addressSection}>
            <label style={styles.label}>Shipping Address (Optional)</label>
            <input
              name="address.street"
              type="text"
              value={formData.address.street}
              onChange={handleChange}
              placeholder="Street address"
              disabled={loading}
              style={styles.input}
            />
            <div style={styles.addressRow}>
              <input
                name="address.city"
                type="text"
                value={formData.address.city}
                onChange={handleChange}
                placeholder="City"
                disabled={loading}
                style={{...styles.input, flex: 1}}
              />
              <input
                name="address.state"
                type="text"
                value={formData.address.state}
                onChange={handleChange}
                placeholder="State"
                disabled={loading}
                style={{...styles.input, flex: 1}}
              />
            </div>
            <div style={styles.addressRow}>
              <input
                name="address.zipCode"
                type="text"
                value={formData.address.zipCode}
                onChange={handleChange}
                placeholder="Zip Code"
                disabled={loading}
                style={{...styles.input, flex: 1}}
              />
              <input
                name="address.country"
                type="text"
                value={formData.address.country}
                onChange={handleChange}
                placeholder="Country"
                disabled={loading}
                style={{...styles.input, flex: 1}}
              />
            </div>
          </div>

          {/* Terms & Conditions */}
          <div style={styles.termsGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={styles.checkbox}
              />
              I agree to the <Link to="/terms" style={styles.termsLink}>Terms & Conditions</Link> and <Link to="/privacy" style={styles.termsLink}>Privacy Policy</Link> *
            </label>
            {errors.agreeTerms && <span style={styles.errorText}>{errors.agreeTerms}</span>}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.registerButton,
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Demo Credentials - For testing only */}
        <div style={styles.demoSection}>
          <p style={styles.demoTitle}>Quick Demo (for testing)</p>
          <div style={styles.demoButtons}>
            <button onClick={fillDemoBuyer} style={styles.demoBuyerBtn}>
              Fill Buyer Demo
            </button>
            <button onClick={fillDemoSeller} style={styles.demoSellerBtn}>
              Fill Seller Demo
            </button>
          </div>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>Or sign up with</span>
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
            Already have an account?{' '}
            <Link to="/login" style={styles.loginLink}>
              Sign in
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
    maxWidth: '550px',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    padding: '32px',
    transition: 'transform 0.2s'
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px'
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
    gap: '16px'
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
  inputError: {
    borderColor: '#dc3545'
  },
  errorText: {
    fontSize: '12px',
    color: '#dc3545'
  },
  roleButtons: {
    display: 'flex',
    gap: '12px'
  },
  roleBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  roleBtnActive: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff'
  },
  addressSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px 0',
    borderTop: '1px solid #eee',
    borderBottom: '1px solid #eee'
  },
  addressRow: {
    display: 'flex',
    gap: '12px'
  },
  termsGroup: {
    marginTop: '4px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#555',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  termsLink: {
    color: '#007bff',
    textDecoration: 'none'
  },
  registerButton: {
    padding: '12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: '8px'
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
    marginBottom: '20px'
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
    fontSize: '14px'
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
    textAlign: 'center'
  },
  footerText: {
    fontSize: '14px',
    color: '#666'
  },
  loginLink: {
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: '500'
  }
};

export default Register;