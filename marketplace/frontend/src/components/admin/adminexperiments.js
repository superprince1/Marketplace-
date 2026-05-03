import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const AdminExperiments = () => {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', status: 'draft', trafficAllocation: 100,
    variants: [{ name: 'control', weight: 50, isControl: true, config: {} }],
    targetRules: [],
  });

  useEffect(() => {
    fetchExperiments();
  }, []);

  const fetchExperiments = async () => {
    const res = await API.get('/experiments/admin/all');
    setExperiments(res.data.experiments);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) {
      await API.put(`/experiments/admin/${editing._id}`, form);
    } else {
      await API.post('/experiments/admin', form);
    }
    fetchExperiments();
    setEditing(null);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      name: '', description: '', status: 'draft', trafficAllocation: 100,
      variants: [{ name: 'control', weight: 50, isControl: true, config: {} }],
      targetRules: [],
    });
  };

  const addVariant = () => {
    setForm({
      ...form,
      variants: [...form.variants, { name: '', weight: 0, config: {} }],
    });
  };

  const updateVariant = (idx, field, value) => {
    const newVariants = [...form.variants];
    newVariants[idx][field] = value;
    if (field === 'name' && !newVariants[idx].isControl && newVariants[idx].name === 'control') {
      newVariants[idx].isControl = true;
    }
    setForm({ ...form, variants: newVariants });
  };

  const deleteVariant = (idx) => {
    const newVariants = form.variants.filter((_, i) => i !== idx);
    setForm({ ...form, variants: newVariants });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h2>A/B Testing & Personalisation</h2>
      <button onClick={() => { setEditing(null); resetForm(); }} style={styles.addBtn}>+ New Experiment</button>

      <form onSubmit={handleSubmit} style={styles.form}>
        <h3>{editing ? 'Edit Experiment' : 'Create Experiment'}</h3>
        <input type="text" placeholder="Experiment Name (unique)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <textarea placeholder="Description" rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
        <input type="number" step="1" min="0" max="100" placeholder="Traffic Allocation (%)" value={form.trafficAllocation} onChange={e => setForm({...form, trafficAllocation: parseInt(e.target.value)})} />

        <h4>Variants</h4>
        {form.variants.map((v, idx) => (
          <div key={idx} style={styles.variantRow}>
            <input type="text" placeholder="Variant name" value={v.name} onChange={e => updateVariant(idx, 'name', e.target.value)} required />
            <input type="number" step="1" min="0" placeholder="Weight (traffic %)" value={v.weight} onChange={e => updateVariant(idx, 'weight', parseInt(e.target.value))} required />
            <textarea placeholder="Config (JSON)" rows="1" value={JSON.stringify(v.config)} onChange={e => {
              try { const parsed = JSON.parse(e.target.value); updateVariant(idx, 'config', parsed); } catch(e) {}
            }} style={{width: '200px'}} />
            <label><input type="checkbox" checked={v.isControl} onChange={() => updateVariant(idx, 'isControl', !v.isControl)} /> Control</label>
            <button type="button" onClick={() => deleteVariant(idx)}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addVariant}>+ Add Variant</button>

        <div style={styles.actions}>
          <button type="submit">Save</button>
          {editing && <button type="button" onClick={() => setEditing(null)}>Cancel</button>}
        </div>
      </form>

      <table style={styles.table}>
        <thead><tr><th>Name</th><th>Status</th><th>Traffic</th><th>Variants</th><th>Impressions</th><th>Conversions</th><th>Actions</th></tr></thead>
        <tbody>
          {experiments.map(exp => (
            <tr key={exp._id}>
              <td>{exp.name}</td>
              <td>{exp.status}</td>
              <td>{exp.trafficAllocation}%</td>
              <td>{exp.variants.map(v => `${v.name}(${v.weight}%)`).join(', ')}</td>
              <td>{exp.impressions}</td><td>{exp.conversions}</td>
              <td><button onClick={() => { setEditing(exp); setForm(exp); }}>Edit</button>
                <button onClick={() => API.delete(`/experiments/admin/${exp._id}`).then(fetchExperiments)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  container: { padding: 20 },
  addBtn: { marginBottom: 20 },
  form: { backgroundColor: '#f9f9fa', padding: 20, marginBottom: 20, borderRadius: 8 },
  variantRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  actions: { marginTop: 16, display: 'flex', gap: 8 },
  table: { width: '100%', borderCollapse: 'collapse' },
};

export default AdminExperiments;