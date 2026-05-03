import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const AdminWebhooks = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', events: [] });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await API.get('/admin/webhooks');
      setWebhooks(res.data.webhooks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await API.put(`/admin/webhooks/${editing._id}`, form);
      } else {
        await API.post('/admin/webhooks', form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', url: '', events: [] });
      fetchWebhooks();
    } catch (err) {
      alert(err.response?.data?.error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this webhook?')) return;
    await API.delete(`/admin/webhooks/${id}`);
    fetchWebhooks();
  };

  const handleTest = async (id) => {
    try {
      await API.post(`/admin/webhooks/${id}/test`);
      alert('Test webhook sent!');
    } catch (err) {
      alert('Test failed: ' + err.response?.data?.error);
    }
  };

  const eventOptions = [
    'order.created', 'order.paid', 'order.shipped', 'order.delivered', 'order.cancelled',
    'product.created', 'product.updated', 'product.deleted', 'user.registered',
    'user.updated', 'review.created',
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h2>Webhook Integrations</h2>
      <button onClick={() => setShowForm(true)} style={styles.addBtn}>+ Add Webhook</button>

      {showForm && (
        <div style={styles.modal}>
          <form onSubmit={handleSubmit}>
            <h3>{editing ? 'Edit' : 'Create'} Webhook</h3>
            <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input type="url" placeholder="URL" value={form.url} onChange={e => setForm({...form, url: e.target.value})} required />
            <select multiple value={form.events} onChange={e => setForm({...form, events: Array.from(e.target.selectedOptions, o => o.value)})}>
              {eventOptions.map(ev => <option key={ev} value={ev}>{ev}</option>)}
            </select>
            <button type="submit">Save</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
          </form>
        </div>
      )}

      <table style={styles.table}>
        <thead><tr><th>Name</th><th>URL</th><th>Events</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {webhooks.map(w => (
            <tr key={w._id}>
              <td>{w.name}</td>
              <td>{w.url}</td>
              <td>{w.events.join(', ')}</td>
              <td>{w.isActive ? 'Active' : 'Inactive'}</td>
              <td>
                <button onClick={() => { setEditing(w); setForm(w); setShowForm(true); }}>Edit</button>
                <button onClick={() => handleTest(w._id)}>Test</button>
                <button onClick={() => handleDelete(w._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  container: { padding: 20 },
  addBtn: { marginBottom: 20, padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'white', padding: 20, zIndex: 1000, boxShadow: '0 0 10px rgba(0,0,0,0.3)' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 20 },
};

export default AdminWebhooks;