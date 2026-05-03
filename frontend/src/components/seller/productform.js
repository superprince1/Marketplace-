import React, { useState, useEffect } from 'react';
import ImageUpload from '../UI/ImageUpload';
import API from '../../services/api';

const categories = [
  'Electronics', 'Clothing', 'Home & Garden', 'Books', 'Toys & Hobbies',
  'Sports', 'Automotive', 'Health & Beauty', 'Pet Supplies', 'Food', 'Digital', 'Other',
];

const ProductForm = ({ product, onSave, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    compareAtPrice: '',
    description: '',
    shortDescription: '',
    category: 'Electronics',
    stock: '',
    images: [],
    tags: '',
    isFeatured: false,
    hasVariations: false,
    variations: [],
    isDigital: false,
    maxDownloads: 3,
    licenseKeys: [],
    downloadableFiles: [],
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [licenseKeysInput, setLicenseKeysInput] = useState('');
  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitleLoading, setAiTitleLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        price: product.price || '',
        compareAtPrice: product.compareAtPrice || '',
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        category: product.category || 'Electronics',
        stock: product.stock || '',
        images: product.images || (product.imageUrl ? [product.imageUrl] : []),
        tags: product.tags?.join(', ') || '',
        isFeatured: product.isFeatured || false,
        hasVariations: product.hasVariations || false,
        variations: product.variations || [],
        isDigital: product.isDigital || false,
        maxDownloads: product.maxDownloads || 3,
        licenseKeys: product.licenseKeys?.map(k => k.key) || [],
        downloadableFiles: product.downloadableFiles || [],
      });
      if (product.licenseKeys && product.licenseKeys.length) {
        setLicenseKeysInput(product.licenseKeys.map(k => k.key).join('\n'));
      }
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleImageUpload = (urls) => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...urls],
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Variation helpers
  const addVariation = () => {
    setFormData(prev => ({
      ...prev,
      variations: [...prev.variations, { type: 'size', name: '', options: [] }],
    }));
  };

  const updateVariation = (idx, field, value) => {
    const updated = [...formData.variations];
    updated[idx][field] = value;
    setFormData(prev => ({ ...prev, variations: updated }));
  };

  const removeVariation = (idx) => {
    const updated = formData.variations.filter((_, i) => i !== idx);
    setFormData(prev => ({ ...prev, variations: updated }));
  };

  const addVariationOption = (varIdx) => {
    const updated = [...formData.variations];
    updated[varIdx].options.push({ value: '', priceAdjustment: 0, stock: 0, sku: '' });
    setFormData(prev => ({ ...prev, variations: updated }));
  };

  const updateVariationOption = (varIdx, optIdx, field, value) => {
    const updated = [...formData.variations];
    updated[varIdx].options[optIdx][field] = field === 'priceAdjustment' || field === 'stock' ? parseFloat(value) || 0 : value;
    setFormData(prev => ({ ...prev, variations: updated }));
  };

  const removeVariationOption = (varIdx, optIdx) => {
    const updated = [...formData.variations];
    updated[varIdx].options = updated[varIdx].options.filter((_, i) => i !== optIdx);
    setFormData(prev => ({ ...prev, variations: updated }));
  };

  const updateLicenseKeys = (text) => {
    setLicenseKeysInput(text);
    const keys = text.split('\n').filter(k => k.trim()).map(k => k.trim());
    setFormData(prev => ({ ...prev, licenseKeys: keys }));
  };

  // ========== AI Handlers ==========
  const generateDescription = async () => {
    if (!formData.name || !formData.category) {
      alert('Please enter product name and category first');
      return;
    }
    setAiLoading(true);
    try {
      const res = await API.post('/ai/generate-description', {
        name: formData.name,
        category: formData.category,
        keywords: formData.tags || '',
      });
      setFormData(prev => ({ ...prev, description: res.data.description }));
    } catch (err) {
      alert('Description generation failed. Please try again.');
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const generateTitles = async () => {
    const keywords = `${formData.name} ${formData.tags}`.trim();
    if (!keywords) {
      alert('Enter product name or tags first');
      return;
    }
    setAiTitleLoading(true);
    try {
      const res = await API.post('/ai/generate-title', { keywords });
      const titles = res.data.titles;
      if (titles && titles.length) {
        const selected = window.prompt('Choose a title:\n' + titles.join('\n'), titles[0]);
        if (selected) setFormData(prev => ({ ...prev, name: selected }));
      } else {
        alert('No titles generated');
      }
    } catch (err) {
      alert('Title generation failed. Please try again.');
      console.error(err);
    } finally {
      setAiTitleLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.price) newErrors.price = 'Price is required';
    else if (parseFloat(formData.price) < 0) newErrors.price = 'Price cannot be negative';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    else if (formData.description.length < 20) newErrors.description = 'Description must be at least 20 characters';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.isDigital && (formData.stock === '' || formData.stock < 0)) {
      newErrors.stock = 'Stock must be 0 or greater for physical products';
    }
    if (formData.isDigital && formData.maxDownloads < 1) {
      newErrors.maxDownloads = 'Max downloads must be at least 1';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      const allTouched = {};
      Object.keys(formData).forEach(key => { allTouched[key] = true; });
      setTouched(allTouched);
      return;
    }
    const submitData = {
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      compareAtPrice: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : null,
      description: formData.description.trim(),
      shortDescription: formData.shortDescription.trim() || formData.description.substring(0, 300),
      category: formData.category,
      stock: formData.isDigital ? 0 : parseInt(formData.stock) || 0,
      images: formData.images,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      isFeatured: formData.isFeatured,
      hasVariations: formData.hasVariations,
      variations: formData.hasVariations ? formData.variations : [],
      isDigital: formData.isDigital,
      maxDownloads: formData.isDigital ? formData.maxDownloads : undefined,
      licenseKeys: formData.isDigital ? formData.licenseKeys : [],
    };
    onSave(submitData);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onCancel} style={styles.closeBtn}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formBody}>
            {/* Product Name with AI Suggest */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Product Name *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  style={{ ...styles.input, ...(touched.name && errors.name ? styles.inputError : {}) }}
                />
                <button type="button" onClick={generateTitles} disabled={aiTitleLoading} style={styles.aiButton}>
                  ✨ AI Suggest
                </button>
              </div>
              {touched.name && errors.name && <span style={styles.errorText}>{errors.name}</span>}
            </div>

            {/* Price & Compare Price */}
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  style={{ ...styles.input, ...(touched.price && errors.price ? styles.inputError : {}) }}
                />
                {touched.price && errors.price && <span style={styles.errorText}>{errors.price}</span>}
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Compare at Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  name="compareAtPrice"
                  value={formData.compareAtPrice}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Category */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Category *</label>
              <select name="category" value={formData.category} onChange={handleChange} onBlur={handleBlur} style={styles.select}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              {touched.category && errors.category && <span style={styles.errorText}>{errors.category}</span>}
            </div>

            {/* Stock (only for physical products) */}
            {!formData.isDigital && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Stock Quantity *</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  min="0"
                  style={{ ...styles.input, ...(touched.stock && errors.stock ? styles.inputError : {}) }}
                />
                {touched.stock && errors.stock && <span style={styles.errorText}>{errors.stock}</span>}
              </div>
            )}

            {/* Image Upload */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Product Images</label>
              <ImageUpload
                multiple
                maxFiles={5}
                onUpload={handleImageUpload}
                label="Upload Images"
              />
              {formData.images.length > 0 && (
                <div style={styles.imageList}>
                  {formData.images.map((url, idx) => (
                    <div key={idx} style={styles.imageItem}>
                      <img src={url} alt={`product ${idx}`} style={styles.imagePreview} />
                      <button type="button" onClick={() => removeImage(idx)} style={styles.removeImageBtn}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description with AI Write */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Description *</label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                <button type="button" onClick={generateDescription} disabled={aiLoading} style={styles.aiSmallButton}>
                  {aiLoading ? 'Generating...' : '✨ AI Write Description'}
                </button>
              </div>
              <textarea
                name="description"
                rows="5"
                value={formData.description}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{ ...styles.textarea, ...(touched.description && errors.description ? styles.inputError : {}) }}
              />
              {touched.description && errors.description && <span style={styles.errorText}>{errors.description}</span>}
              <small style={styles.helper}>{formData.description.length} characters (min 20)</small>
            </div>

            {/* Tags */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Tags (comma separated)</label>
              <input
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="wireless, headphones, audio"
                style={styles.input}
              />
            </div>

            {/* Featured Checkbox */}
            <label style={styles.checkbox}>
              <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange} />
              <span>Feature this product on homepage</span>
            </label>

            {/* Digital Product Toggle */}
            <label style={styles.checkbox}>
              <input type="checkbox" name="isDigital" checked={formData.isDigital} onChange={handleChange} />
              <span>Digital Product (no shipping, buyers download files)</span>
            </label>

            {/* Digital Product Settings */}
            {formData.isDigital && (
              <div style={styles.digitalSection}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Downloads per Customer</label>
                  <input
                    type="number"
                    name="maxDownloads"
                    value={formData.maxDownloads}
                    onChange={handleChange}
                    min="1"
                    max="100"
                    style={styles.input}
                  />
                  {touched.maxDownloads && errors.maxDownloads && <span style={styles.errorText}>{errors.maxDownloads}</span>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>License Keys (one per line)</label>
                  <textarea
                    rows="5"
                    value={licenseKeysInput}
                    onChange={(e) => updateLicenseKeys(e.target.value)}
                    placeholder="Enter license keys, one per line"
                    style={styles.textarea}
                  />
                  <small style={styles.helper}>These keys will be assigned to customers on first download.</small>
                </div>

                {formData.downloadableFiles.length > 0 && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Existing Digital Files</label>
                    <ul style={styles.fileList}>
                      {formData.downloadableFiles.map((file, idx) => (
                        <li key={idx}>{file.originalName} ({(file.size / 1024).toFixed(1)} KB)</li>
                      ))}
                    </ul>
                    <small style={styles.helper}>Upload files after product creation via Seller Dashboard → Manage Products → Upload Files.</small>
                  </div>
                )}
              </div>
            )}

            {/* Variations Toggle */}
            <label style={styles.checkbox}>
              <input type="checkbox" name="hasVariations" checked={formData.hasVariations} onChange={handleChange} />
              <span>Product has variations (size, color, material)</span>
            </label>

            {/* Variations Section */}
            {formData.hasVariations && (
              <div style={styles.variationsSection}>
                <h4 style={styles.sectionTitle}>Variations</h4>
                {formData.variations.map((variation, idx) => (
                  <div key={idx} style={styles.variationCard}>
                    <div style={styles.row}>
                      <select value={variation.type} onChange={(e) => updateVariation(idx, 'type', e.target.value)} style={styles.selectSmall}>
                        <option value="size">Size</option>
                        <option value="color">Color</option>
                        <option value="material">Material</option>
                      </select>
                      <input
                        placeholder="Display name (e.g., Size)"
                        value={variation.name}
                        onChange={(e) => updateVariation(idx, 'name', e.target.value)}
                        style={styles.input}
                      />
                      <button type="button" onClick={() => removeVariation(idx)} style={styles.removeBtn}>🗑️ Remove</button>
                    </div>
                    <h5 style={styles.subtitle}>Options</h5>
                    {variation.options.map((opt, optIdx) => (
                      <div key={optIdx} style={styles.optionRow}>
                        <input
                          placeholder="Value (e.g., M)"
                          value={opt.value}
                          onChange={(e) => updateVariationOption(idx, optIdx, 'value', e.target.value)}
                          style={styles.smallInput}
                        />
                        <input
                          type="number"
                          placeholder="Price adj"
                          value={opt.priceAdjustment}
                          onChange={(e) => updateVariationOption(idx, optIdx, 'priceAdjustment', e.target.value)}
                          style={styles.smallInput}
                        />
                        <input
                          type="number"
                          placeholder="Stock"
                          value={opt.stock}
                          onChange={(e) => updateVariationOption(idx, optIdx, 'stock', e.target.value)}
                          style={styles.smallInput}
                        />
                        <input
                          placeholder="SKU"
                          value={opt.sku}
                          onChange={(e) => updateVariationOption(idx, optIdx, 'sku', e.target.value)}
                          style={styles.smallInput}
                        />
                        <button type="button" onClick={() => removeVariationOption(idx, optIdx)} style={styles.removeIconBtn}>✖️</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addVariationOption(idx)} style={styles.addOptionBtn}>+ Add Option</button>
                  </div>
                ))}
                <button type="button" onClick={addVariation} style={styles.addVariationBtn}>+ Add Variation Type</button>
              </div>
            )}
          </div>

     <div style={styles.modalFooter}>
            <button type="button" onClick={onCancel} style={styles.cancelBtn} disabled={loading}>Cancel</button>
            <button type="submit" disabled={loading} style={styles.saveBtn}>
              {loading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px',
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '800px',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid #e0e0e0',
  },
  modalTitle: { fontSize: '20px', fontWeight: '600', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#999' },
  form: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  formBody: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '14px', fontWeight: '500', color: '#333' },
  input: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' },
  inputError: { borderColor: '#dc3545' },
  errorText: { fontSize: '12px', color: '#dc3545' },
  helper: { fontSize: '11px', color: '#999' },
  select: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#fff' },
  selectSmall: { padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' },
  textarea: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'inherit', resize: 'vertical' },
  row: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' },
  imageList: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' },
  imageItem: { position: 'relative', width: '80px', height: '80px' },
  imagePreview: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' },
  removeImageBtn: {
    position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#dc3545', color: 'white',
    border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer',
    fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  digitalSection: {
    borderTop: '1px solid #eee', marginTop: '8px', paddingTop: '16px',
    backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '12px',
  },
  fileList: {
    margin: '4px 0 0 20px', fontSize: '13px', color: '#555',
  },
  variationsSection: { borderTop: '1px solid #eee', marginTop: '8px', paddingTop: '16px' },
  sectionTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '12px' },
  subtitle: { fontSize: '14px', fontWeight: '500', margin: '8px 0 4px' },
  variationCard: { border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '12px', backgroundColor: '#fafafa' },
  optionRow: { display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' },
  smallInput: { padding: '6px', border: '1px solid #ddd', borderRadius: '4px', flex: 1, minWidth: '80px', fontSize: '13px' },
  removeBtn: { background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' },
  removeIconBtn: { background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' },
  addOptionBtn: { background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', marginTop: '8px' },
  addVariationBtn: { background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', marginTop: '8px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px', borderTop: '1px solid #e0e0e0', backgroundColor: '#f8f9fa' },
  cancelBtn: { padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  saveBtn: { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
  // AI button styles
  aiButton: { padding: '8px 16px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  aiSmallButton: { padding: '4px 8px', fontSize: '12px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
};

export default ProductForm;