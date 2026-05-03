import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import ReactQuill from 'react-quill'; // npm install react-quill
import 'react-quill/dist/quill.snow.css'; // import styles

const AdminPages = () => {
  const [pages, setPages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [editing, setEditing] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showPreview, setShowPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    metaTitle: '',
    metaDescription: '',
    template: 'default',
    isPublished: true,
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    // Filter pages based on search term
    const filtered = pages.filter(page =>
      page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPages(filtered);
    setCurrentPage(1);
  }, [searchTerm, pages]);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await API.get('/pages/admin/all');
      setPages(res.data.pages);
    } catch (err) {
      console.error(err);
      alert('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from title when title changes and slug is empty or auto-generated
  const handleTitleChange = (title) => {
    setForm(prev => ({ ...prev, title }));
    if (!form.slug || (editing && form.slug === editing.slug)) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-');
      setForm(prev => ({ ...prev, slug: generatedSlug }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.content.trim()) errors.content = 'Content is required';
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editing) {
        await API.put(`/pages/admin/${editing._id}`, form);
      } else {
        await API.post('/pages/admin', form);
      }
      setEditing(null);
      setForm({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        metaTitle: '',
        metaDescription: '',
        template: 'default',
        isPublished: true,
      });
      fetchPages();
      alert(editing ? 'Page updated successfully' : 'Page created successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (page) => {
    setEditing(page);
    setForm({
      title: page.title,
      slug: page.slug,
      content: page.content,
      excerpt: page.excerpt || '',
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
      template: page.template,
      isPublished: page.isPublished,
    });
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = (page) => {
    setShowDeleteConfirm(page);
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    try {
      await API.delete(`/pages/admin/${showDeleteConfirm._id}`);
      fetchPages();
      setShowDeleteConfirm(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const handlePreview = (page) => {
    setShowPreview(page);
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPages.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPages.length / itemsPerPage);

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image', 'blockquote', 'code-block'],
      ['clean'],
    ],
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>📄 Content Pages (CMS)</h2>
      <p style={styles.subtitle}>Manage about, contact, privacy, terms, and custom pages.</p>

      {/* Add / Edit Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <h3 style={styles.formTitle}>{editing ? '✏️ Edit Page' : '➕ Create New Page'}</h3>
        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Title *</label>
            <input
              type="text"
              placeholder="Page title"
              value={form.title}
              onChange={e => handleTitleChange(e.target.value)}
              required
              style={styles.input}
            />
            {formErrors.title && <span style={styles.error}>{formErrors.title}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Slug (URL)</label>
            <input
              type="text"
              placeholder="auto-generated"
              value={form.slug}
              onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              style={styles.input}
            />
            {formErrors.slug && <span style={styles.error}>{formErrors.slug}</span>}
            <small style={styles.helper}>e.g., about-us, contact</small>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Excerpt (optional)</label>
          <textarea
            rows="2"
            placeholder="Brief summary for meta description and feed"
            value={form.excerpt}
            onChange={e => setForm({ ...form, excerpt: e.target.value })}
            style={styles.textarea}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Content (HTML / Rich Text) *</label>
          <ReactQuill
            theme="snow"
            value={form.content}
            onChange={content => setForm({ ...form, content })}
            modules={quillModules}
            style={styles.quill}
          />
          {formErrors.content && <span style={styles.error}>{formErrors.content}</span>}
        </div>

        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Meta Title (SEO)</label>
            <input
              type="text"
              placeholder="Leave blank to use page title"
              value={form.metaTitle}
              onChange={e => setForm({ ...form, metaTitle: e.target.value })}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Meta Description (SEO)</label>
            <input
              type="text"
              placeholder="Brief description for search engines"
              value={form.metaDescription}
              onChange={e => setForm({ ...form, metaDescription: e.target.value })}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Template</label>
            <select value={form.template} onChange={e => setForm({ ...form, template: e.target.value })} style={styles.select}>
              <option value="default">Default (1000px)</option>
              <option value="full-width">Full Width</option>
              <option value="narrow">Narrow (800px)</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={e => setForm({ ...form, isPublished: e.target.checked })}
              />
              Published (visible to public)
            </label>
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button type="submit" disabled={saving} style={styles.saveBtn}>
            {saving ? 'Saving...' : (editing ? 'Update Page' : 'Create Page')}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setForm({ title: '', slug: '', content: '', excerpt: '', metaTitle: '', metaDescription: '', template: 'default', isPublished: true }); setFormErrors({}); }} style={styles.cancelBtn}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* Search & Filter */}
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="🔍 Search by title or slug..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <span style={styles.resultCount}>{filteredPages.length} pages found</span>
      </div>

      {/* Pages Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Template</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr><td colSpan="6" style={styles.noData}>No pages found</td></tr>
            ) : (
              currentItems.map(p => (
                <tr key={p._id}>
                  <td><strong>{p.title}</strong></td>
                  <td><code style={styles.slugCell}>{p.slug}</code></td>
                  <td>{p.template}</td>
                  <td>{p.isPublished ? <span style={styles.badgePublished}>Published</span> : <span style={styles.badgeDraft}>Draft</span>}</td>
                  <td>{new Date(p.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleEdit(p)} style={styles.editBtn} title="Edit">✏️</button>
                    <button onClick={() => confirmDelete(p)} style={styles.deleteBtn} title="Delete">🗑️</button>
                    <button onClick={() => handlePreview(p)} style={styles.previewBtn} title="Preview">👁️</button>
                    <a href={`/pages/${p.slug}`} target="_blank" rel="noopener noreferrer" style={styles.viewBtn} title="View">🔗</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={styles.pageBtn}>« Prev</button>
          <span style={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={styles.pageBtn}>Next »</button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete the page <strong>"{showDeleteConfirm.title}"</strong>? This action cannot be undone.</p>
            <div style={styles.modalButtons}>
              <button onClick={() => setShowDeleteConfirm(null)} style={styles.modalCancelBtn}>Cancel</button>
              <button onClick={handleDelete} style={styles.modalDeleteBtn}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div style={styles.modalOverlay} onClick={() => setShowPreview(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>{showPreview.title}</h3>
            <div style={styles.previewContent} dangerouslySetInnerHTML={{ __html: showPreview.content }} />
            <button onClick={() => setShowPreview(null)} style={styles.modalCloseBtn}>Close Preview</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  pageTitle: { fontSize: '28px', marginBottom: '8px' },
  subtitle: { color: '#666', marginBottom: '24px' },
  form: { backgroundColor: '#f9f9fa', padding: '24px', borderRadius: '12px', marginBottom: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  formTitle: { marginTop: 0, marginBottom: '20px', fontSize: '20px' },
  row: { display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' },
  formGroup: { flex: 1, minWidth: '200px' },
  label: { display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' },
  input: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' },
  textarea: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'inherit', fontSize: '14px' },
  quill: { backgroundColor: 'white', marginBottom: '12px' },
  select: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '10px' },
  helper: { display: 'block', fontSize: '12px', color: '#999', marginTop: '4px' },
  error: { color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' },
  buttonGroup: { display: 'flex', gap: '12px', marginTop: '8px' },
  saveBtn: { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
  cancelBtn: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' },
  searchBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  searchInput: { flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '6px', maxWidth: '300px' },
  resultCount: { fontSize: '14px', color: '#666' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  slugCell: { backgroundColor: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' },
  badgePublished: { backgroundColor: '#d4edda', color: '#155724', padding: '4px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
  badgeDraft: { backgroundColor: '#f8d7da', color: '#721c24', padding: '4px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
  editBtn: { backgroundColor: '#ffc107', color: '#333', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '6px' },
  deleteBtn: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '6px' },
  previewBtn: { backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '6px' },
  viewBtn: { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' },
  pageBtn: { padding: '6px 12px', border: '1px solid #ddd', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer' },
  pageInfo: { fontSize: '14px', color: '#555' },
  noData: { textAlign: 'center', padding: '40px', color: '#999' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' },
  previewContent: { lineHeight: 1.6, marginBottom: '20px' },
  modalButtons: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' },
  modalCancelBtn: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' },
  modalDeleteBtn: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' },
  modalCloseBtn: { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', marginTop: '12px' },
};

export default AdminPages;