import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import BulkProductImport from './BulkProductImport'; // ✅ Import the modal component

/**
 * ShopProfile Component – Seller's shop management form
 * Allows sellers to customise their storefront:
 * - Shop name & custom URL
 * - Logo and banner images (URLs)
 * - Description
 * - Policies (returns, shipping, payment, privacy)
 * - Social media links
 * - Contact email/phone
 * - Bulk product import/export (CSV)
 * 
 * NOTE: Pre‑order / Backorder settings are configured per product
 * in the Product Edit page, not in this Shop Profile.
 */
const ShopProfile = () => {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo: '',
    banner: '',
    description: '',
    policies: {
      returns: '',
      shipping: '',
      payment: '',
      privacy: '',
    },
    socialLinks: {
      facebook: '',
      instagram: '',
      twitter: '',
    },
    contactEmail: '',
    contactPhone: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchShop();
  }, []);

  const fetchShop = async () => {
    setLoading(true);
    try {
      const res = await API.get('/shop/my/shop');
      setShop(res.data.shop);
      setFormData({
        name: res.data.shop.name || '',
        slug: res.data.shop.slug || '',
        logo: res.data.shop.logo || '',
        banner: res.data.shop.banner || '',
        description: res.data.shop.description || '',
        policies: {
          returns: res.data.shop.policies?.returns || '',
          shipping: res.data.shop.policies?.shipping || '',
          payment: res.data.shop.policies?.payment || '',
          privacy: res.data.shop.policies?.privacy || '',
        },
        socialLinks: {
          facebook: res.data.shop.socialLinks?.facebook || '',
          instagram: res.data.shop.socialLinks?.instagram || '',
          twitter: res.data.shop.socialLinks?.twitter || '',
        },
        contactEmail: res.data.shop.contactEmail || '',
        contactPhone: res.data.shop.contactPhone || '',
      });
    } catch (err) {
      console.error('Fetch shop error:', err);
      setMessage({ type: 'error', text: 'Failed to load shop data' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (message.text) setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await API.put('/shop/my/shop', formData);
      setShop(res.data.shop);
      setMessage({ type: 'success', text: 'Shop profile updated successfully!' });
      fetchShop();
    } catch (err) {
      console.error('Update shop error:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Update failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const response = await API.get('/products/csv/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Export started – file downloaded.' });
    } catch (err) {
      console.error('Export error:', err);
      setMessage({ type: 'error', text: 'Export failed. Please try again.' });
    }
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    setMessage({ type: 'success', text: 'Products imported successfully! Refresh your product list.' });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏪 Shop Profile</h2>
      <p style={styles.subtitle}>Customise your storefront – this is what customers will see.</p>

      {message.text && (
        <div style={{ ...styles.message, backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24' }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Basic Information */}
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Basic Information</legend>
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Shop Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="My Awesome Store"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Custom URL (slug)</label>
              <div style={styles.slugPreview}>
                <span style={styles.slugPrefix}>/shop/</span>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="my-awesome-store"
                  style={styles.slugInput}
                />
              </div>
              <small style={styles.helper}>Only lowercase letters, numbers, and hyphens</small>
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Logo URL</label>
              <input
                type="url"
                name="logo"
                value={formData.logo}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Banner URL</label>
              <input
                type="url"
                name="banner"
                value={formData.banner}
                onChange={handleChange}
                placeholder="https://example.com/banner.jpg"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Shop Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Tell customers about your shop, your story, and what makes you unique..."
              style={styles.textarea}
            />
          </div>
        </fieldset>

        {/* Policies */}
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Store Policies</legend>
          <div style={styles.formGroup}>
            <label style={styles.label}>Returns Policy</label>
            <textarea
              name="policies.returns"
              value={formData.policies.returns}
              onChange={handleChange}
              rows="2"
              placeholder="e.g., 30-day returns, buyer pays return shipping..."
              style={styles.textarea}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Shipping Policy</label>
            <textarea
              name="policies.shipping"
              value={formData.policies.shipping}
              onChange={handleChange}
              rows="2"
              placeholder="e.g., Ships within 2-3 business days, free over $50..."
              style={styles.textarea}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Payment Policy</label>
            <textarea
              name="policies.payment"
              value={formData.policies.payment}
              onChange={handleChange}
              rows="2"
              placeholder="e.g., Secure payment via card, PayPal, COD..."
              style={styles.textarea}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Privacy Policy</label>
            <textarea
              name="policies.privacy"
              value={formData.policies.privacy}
              onChange={handleChange}
              rows="2"
              placeholder="How you handle customer data..."
              style={styles.textarea}
            />
          </div>
        </fieldset>

        {/* Contact & Social */}
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Contact & Social</legend>
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Email</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="shop@example.com"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Phone</label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="+1 234 567 8900"
                style={styles.input}
              />
            </div>
          </div>
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Facebook</label>
              <input
                type="url"
                name="socialLinks.facebook"
                value={formData.socialLinks.facebook}
                onChange={handleChange}
                placeholder="https://facebook.com/yourpage"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Instagram</label>
              <input
                type="url"
                name="socialLinks.instagram"
                value={formData.socialLinks.instagram}
                onChange={handleChange}
                placeholder="https://instagram.com/yourhandle"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Twitter / X</label>
              <input
                type="url"
                name="socialLinks.twitter"
                value={formData.socialLinks.twitter}
                onChange={handleChange}
                placeholder="https://twitter.com/yourhandle"
                style={styles.input}
              />
            </div>
          </div>
        </fieldset>

        {/* Bulk Product Management (CSV) */}
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>📦 Bulk Product Management</legend>
          <div style={styles.bulkActions}>
            <button type="button" onClick={handleExportCsv} style={styles.exportBtn}>
              📥 Export Products (CSV)
            </button>
            <button type="button" onClick={() => setShowImportModal(true)} style={styles.importBtn}>
              📤 Import Products (CSV)
            </button>
          </div>
          <small style={styles.helper}>
            Export your products to a CSV file, edit, then re‑import to update in bulk.
            Pre‑order columns (allowPreorder, preorderStock, estimatedShipDate, preorderMessage) are included.
          </small>
        </fieldset>

        <div style={styles.buttonGroup}>
          <button type="submit" disabled={saving} style={styles.saveButton}>
            {saving ? 'Saving...' : 'Save Shop Settings'}
          </button>
          {shop?.slug && (
            <a href={`/shop/${shop.slug}`} target="_blank" rel="noopener noreferrer" style={styles.previewLink}>
              🔍 Preview Shop
            </a>
          )}
        </div>
      </form>

      {/* Import Modal */}
      {showImportModal && (
        <BulkProductImport
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '24px',
  },
  message: {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fieldset: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    margin: 0,
  },
  legend: {
    fontSize: '16px',
    fontWeight: '600',
    padding: '0 12px',
    width: 'auto',
  },
  row: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  formGroup: {
    flex: 1,
    minWidth: '200px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '6px',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  slugPreview: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #ddd',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  slugPrefix: {
    backgroundColor: '#f8f9fa',
    padding: '10px 8px',
    fontSize: '14px',
    color: '#666',
    borderRight: '1px solid #ddd',
  },
  slugInput: {
    flex: 1,
    padding: '10px',
    border: 'none',
    fontSize: '14px',
    outline: 'none',
  },
  helper: {
    display: 'block',
    fontSize: '11px',
    color: '#999',
    marginTop: '4px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    marginTop: '8px',
  },
  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  previewLink: {
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '14px',
  },
  bulkActions: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  exportBtn: {
    padding: '10px 20px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  importBtn: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};

export default ShopProfile;