import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const AdminHomepage = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const res = await API.get('/admin/homepage/sections');
      setSections(res.data.sections);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load sections' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id, field, value) => {
    try {
      await API.put(`/admin/homepage/sections/${id}`, { [field]: value });
      fetchSections();
      setMessage({ type: 'success', text: 'Updated' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Update failed' });
    }
  };

  const handleUpdate = async (id, data) => {
    setSaving(true);
    try {
      await API.put(`/admin/homepage/sections/${id}`, data);
      setMessage({ type: 'success', text: 'Section updated' });
      setEditingId(null);
      fetchSections();
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (dragIndex, dropIndex) => {
    const reordered = [...sections];
    const [removed] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    const ids = reordered.map(s => s._id);
    setSections(reordered);
    try {
      await API.post('/admin/homepage/sections/reorder', { ids });
      setMessage({ type: 'success', text: 'Order saved' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Reorder failed' });
      fetchSections();
    }
  };

  // Helper: update category list for categories section
  const updateCategories = (sectionId, categories) => {
    handleUpdate(sectionId, { categories });
  };

  // Helper: update slides for hero section
  const updateSlides = (sectionId, slides) => {
    handleUpdate(sectionId, { slides });
  };

  // Helper: update product filters for product rows
  const updateProductFilters = (sectionId, filters) => {
    handleUpdate(sectionId, { productFilters: filters });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h2>Homepage Sections</h2>
      {message.text && (
        <div style={{ ...styles.message, backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24' }}>
          {message.text}
        </div>
      )}
      <div style={styles.sectionList}>
        {sections.map((section, idx) => (
          <div key={section._id} style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <button onClick={() => idx > 0 && handleReorder(idx, idx - 1)} style={styles.moveBtn} disabled={idx === 0}>↑</button>
              <button onClick={() => idx < sections.length - 1 && handleReorder(idx, idx + 1)} style={styles.moveBtn} disabled={idx === sections.length - 1}>↓</button>
              <strong>{section.name}</strong>
              <label style={styles.toggle}>
                <input type="checkbox" checked={section.enabled} onChange={(e) => handleToggle(section._id, 'enabled', e.target.checked)} />
                Enabled
              </label>
              <button onClick={() => setEditingId(editingId === section._id ? null : section._id)} style={styles.editBtn}>
                {editingId === section._id ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editingId === section._id && (
              <div style={styles.editForm}>
                {/* Common fields */}
                <input type="text" placeholder="Title" value={editData.title !== undefined ? editData.title : (section.title || '')} onChange={(e) => setEditData({ ...editData, title: e.target.value })} style={styles.input} />
                <input type="text" placeholder="Subtitle" value={editData.subtitle !== undefined ? editData.subtitle : (section.subtitle || '')} onChange={(e) => setEditData({ ...editData, subtitle: e.target.value })} style={styles.input} />
                <input type="text" placeholder="Link (View All)" value={editData.link !== undefined ? editData.link : (section.link || '')} onChange={(e) => setEditData({ ...editData, link: e.target.value })} style={styles.input} />
                <input type="number" placeholder="Product limit" value={editData.productLimit !== undefined ? editData.productLimit : (section.productLimit || 8)} onChange={(e) => setEditData({ ...editData, productLimit: parseInt(e.target.value) })} style={styles.input} />

                {/* Category section specific: edit categories list */}
                {section.type === 'categories' && (
                  <div style={styles.nestedSection}>
                    <h4>Categories</h4>
                    {(editData.categories || section.categories || []).map((cat, catIdx) => (
                      <div key={catIdx} style={styles.categoryRow}>
                        <input type="text" placeholder="Name" value={cat.name || ''} onChange={(e) => {
                          const newCats = [...(editData.categories || section.categories || [])];
                          newCats[catIdx].name = e.target.value;
                          setEditData({ ...editData, categories: newCats });
                        }} style={styles.smallInput} />
                        <input type="text" placeholder="Icon (emoji)" value={cat.icon || ''} onChange={(e) => {
                          const newCats = [...(editData.categories || section.categories || [])];
                          newCats[catIdx].icon = e.target.value;
                          setEditData({ ...editData, categories: newCats });
                        }} style={styles.smallInput} />
                        <input type="text" placeholder="Color (hex)" value={cat.color || ''} onChange={(e) => {
                          const newCats = [...(editData.categories || section.categories || [])];
                          newCats[catIdx].color = e.target.value;
                          setEditData({ ...editData, categories: newCats });
                        }} style={styles.smallInput} />
                        <input type="text" placeholder="Link" value={cat.link || ''} onChange={(e) => {
                          const newCats = [...(editData.categories || section.categories || [])];
                          newCats[catIdx].link = e.target.value;
                          setEditData({ ...editData, categories: newCats });
                        }} style={styles.smallInput} />
                        <button onClick={() => {
                          const newCats = (editData.categories || section.categories || []).filter((_, i) => i !== catIdx);
                          setEditData({ ...editData, categories: newCats });
                        }} style={styles.removeBtn}>✖️</button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const newCats = [...(editData.categories || section.categories || []), { name: '', icon: '', color: '', link: '' }];
                      setEditData({ ...editData, categories: newCats });
                    }} style={styles.addBtn}>+ Add Category</button>
                  </div>
                )}

                {/* Hero section specific: edit slides */}
                {section.type === 'hero' && (
                  <div style={styles.nestedSection}>
                    <h4>Hero Slides</h4>
                    {(editData.slides || section.slides || []).map((slide, slideIdx) => (
                      <div key={slideIdx} style={styles.slideRow}>
                        <input type="text" placeholder="Image URL" value={slide.image || ''} onChange={(e) => {
                          const newSlides = [...(editData.slides || section.slides || [])];
                          newSlides[slideIdx].image = e.target.value;
                          setEditData({ ...editData, slides: newSlides });
                        }} style={styles.input} />
                        <input type="text" placeholder="Link URL" value={slide.link || ''} onChange={(e) => {
                          const newSlides = [...(editData.slides || section.slides || [])];
                          newSlides[slideIdx].link = e.target.value;
                          setEditData({ ...editData, slides: newSlides });
                        }} style={styles.input} />
                        <input type="text" placeholder="Title" value={slide.title || ''} onChange={(e) => {
                          const newSlides = [...(editData.slides || section.slides || [])];
                          newSlides[slideIdx].title = e.target.value;
                          setEditData({ ...editData, slides: newSlides });
                        }} style={styles.input} />
                        <input type="text" placeholder="Subtitle" value={slide.subtitle || ''} onChange={(e) => {
                          const newSlides = [...(editData.slides || section.slides || [])];
                          newSlides[slideIdx].subtitle = e.target.value;
                          setEditData({ ...editData, slides: newSlides });
                        }} style={styles.input} />
                        <button onClick={() => {
                          const newSlides = (editData.slides || section.slides || []).filter((_, i) => i !== slideIdx);
                          setEditData({ ...editData, slides: newSlides });
                        }} style={styles.removeBtn}>✖️</button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const newSlides = [...(editData.slides || section.slides || []), { image: '', link: '', title: '', subtitle: '' }];
                      setEditData({ ...editData, slides: newSlides });
                    }} style={styles.addBtn}>+ Add Slide</button>
                  </div>
                )}

                {/* Product rows (flashDeals, promoted, digital) – edit product filters */}
                {['flashDeals', 'promoted', 'digital'].includes(section.type) && (
                  <div style={styles.nestedSection}>
                    <h4>Product Filters</h4>
                    <input type="text" placeholder="Category (leave empty for all)" value={editData.productFilters?.category || section.productFilters?.category || ''} onChange={(e) => setEditData({ ...editData, productFilters: { ...(editData.productFilters || section.productFilters || {}), category: e.target.value } })} style={styles.input} />
                    <label style={styles.checkboxLabel}>
                      <input type="checkbox" checked={editData.productFilters?.promoted !== undefined ? editData.productFilters.promoted : (section.productFilters?.promoted || false)} onChange={(e) => setEditData({ ...editData, productFilters: { ...(editData.productFilters || section.productFilters || {}), promoted: e.target.checked } })} />
                      Only Promoted Products
                    </label>
                    <input type="number" placeholder="Minimum discount (%)" value={editData.productFilters?.discount || section.productFilters?.discount || ''} onChange={(e) => setEditData({ ...editData, productFilters: { ...(editData.productFilters || section.productFilters || {}), discount: parseInt(e.target.value) || undefined } })} style={styles.input} />
                    <select value={editData.productFilters?.sort || section.productFilters?.sort || '-createdAt'} onChange={(e) => setEditData({ ...editData, productFilters: { ...(editData.productFilters || section.productFilters || {}), sort: e.target.value } })} style={styles.select}>
                      <option value="-createdAt">Newest</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="rating">Top Rated</option>
                      <option value="sold">Best Selling</option>
                    </select>
                  </div>
                )}

                <button onClick={() => handleUpdate(section._id, editData)} disabled={saving} style={styles.saveBtn}>
                  Save Changes
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px' },
  message: { padding: '10px', borderRadius: '4px', marginBottom: '20px' },
  sectionList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionCard: { border: '1px solid #ddd', borderRadius: '8px', padding: '16px', backgroundColor: '#fff' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  moveBtn: { padding: '4px 8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  toggle: { display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' },
  editBtn: { padding: '4px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  editForm: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px' },
  smallInput: { padding: '6px', border: '1px solid #ddd', borderRadius: '4px', flex: 1, minWidth: '100px' },
  select: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' },
  saveBtn: { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  nestedSection: { borderTop: '1px solid #eee', paddingTop: '12px', marginTop: '8px' },
  categoryRow: { display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' },
  slideRow: { display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' },
  removeBtn: { padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  addBtn: { padding: '4px 12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' },
};

export default AdminHomepage;