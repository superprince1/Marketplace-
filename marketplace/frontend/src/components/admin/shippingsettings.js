import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

/**
 * Admin component for managing advanced shipping rules:
 * - Shipping zones (countries grouped)
 * - Shipping rates (flat, weight‑based, carrier)
 * - Delivery blackout dates (holidays, closures)
 */
const ShippingSettings = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('zones');

  // Shipping Zones
  const [zones, setZones] = useState([]);
  const [zoneForm, setZoneForm] = useState({ name: '', countries: [] });
  const [editingZone, setEditingZone] = useState(null);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);

  // Shipping Rates
  const [rates, setRates] = useState([]);
  const [rateForm, setRateForm] = useState({
    zoneId: '',
    name: '',
    type: 'flat',
    flatRate: 0,
    weightBasedRanges: [{ minWeight: 0, maxWeight: 1, price: 0 }],
    carrier: 'ups',
    carrierService: '',
    estimatedDaysMin: 1,
    estimatedDaysMax: 3,
    isActive: true,
  });
  const [editingRate, setEditingRate] = useState(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [zonesForSelect, setZonesForSelect] = useState([]);

  // Blackout Dates
  const [blackouts, setBlackouts] = useState([]);
  const [blackoutForm, setBlackoutForm] = useState({ date: '', reason: '' });
  const [editingBlackout, setEditingBlackout] = useState(null);
  const [blackoutModalOpen, setBlackoutModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ========== Data fetching ==========
  const fetchZones = async () => {
    try {
      const res = await API.get('/shipping/zones');
      setZones(res.data.zones);
    } catch (err) {
      setError('Failed to load zones');
      console.error(err);
    }
  };

  const fetchRates = async () => {
    try {
      const res = await API.get('/shipping/rates');
      setRates(res.data.rates);
    } catch (err) {
      setError('Failed to load rates');
      console.error(err);
    }
  };

  const fetchBlackouts = async () => {
    try {
      const res = await API.get('/shipping/blackouts');
      setBlackouts(res.data.blackouts);
    } catch (err) {
      setError('Failed to load blackout dates');
      console.error(err);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchZones(), fetchRates(), fetchBlackouts()]);
    } catch (err) {
      setError('Could not load all data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Refresh zones dropdown for rate form
  useEffect(() => {
    const loadZones = async () => {
      try {
        const res = await API.get('/shipping/zones');
        setZonesForSelect(res.data.zones);
      } catch (err) {
        console.error(err);
      }
    };
    loadZones();
  }, [zones]);

  // ========== Zone CRUD ==========
  const handleZoneSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingZone) {
        await API.put(`/shipping/zones/${editingZone._id}`, zoneForm);
      } else {
        await API.post('/shipping/zones', zoneForm);
      }
      setZoneModalOpen(false);
      resetZoneForm();
      await fetchZones();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteZone = async (id) => {
    if (!window.confirm('Delete this zone? All associated rates will also be removed.')) return;
    setLoading(true);
    try {
      await API.delete(`/shipping/zones/${id}`);
      await fetchZones();
    } catch (err) {
      setError(err.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  const openZoneModal = (zone = null) => {
    if (zone) {
      setEditingZone(zone);
      setZoneForm({ name: zone.name, countries: zone.countries });
    } else {
      setEditingZone(null);
      setZoneForm({ name: '', countries: [] });
    }
    setZoneModalOpen(true);
  };

  const resetZoneForm = () => {
    setEditingZone(null);
    setZoneForm({ name: '', countries: [] });
  };

  const handleZoneCountriesChange = (value) => {
    const countriesArray = value.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
    setZoneForm({ ...zoneForm, countries: countriesArray });
  };

  // ========== Rate CRUD ==========
  const handleRateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...rateForm };
      if (rateForm.type !== 'weight_based') delete payload.weightBasedRanges;
      if (rateForm.type !== 'carrier') {
        delete payload.carrier;
        delete payload.carrierService;
      }
      if (editingRate) {
        await API.put(`/shipping/rates/${editingRate._id}`, payload);
      } else {
        await API.post('/shipping/rates', payload);
      }
      setRateModalOpen(false);
      resetRateForm();
      await fetchRates();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRate = async (id) => {
    if (!window.confirm('Delete this rate?')) return;
    setLoading(true);
    try {
      await API.delete(`/shipping/rates/${id}`);
      await fetchRates();
    } catch (err) {
      setError(err.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  const openRateModal = (rate = null) => {
    if (rate) {
      setEditingRate(rate);
      setRateForm({
        zoneId: rate.zoneId?._id || rate.zoneId,
        name: rate.name,
        type: rate.type,
        flatRate: rate.flatRate || 0,
        weightBasedRanges: rate.weightBasedRanges || [{ minWeight: 0, maxWeight: 1, price: 0 }],
        carrier: rate.carrier || 'ups',
        carrierService: rate.carrierService || '',
        estimatedDaysMin: rate.estimatedDaysMin || 1,
        estimatedDaysMax: rate.estimatedDaysMax || 3,
        isActive: rate.isActive,
      });
    } else {
      setEditingRate(null);
      setRateForm({
        zoneId: zonesForSelect[0]?._id || '',
        name: '',
        type: 'flat',
        flatRate: 0,
        weightBasedRanges: [{ minWeight: 0, maxWeight: 1, price: 0 }],
        carrier: 'ups',
        carrierService: '',
        estimatedDaysMin: 1,
        estimatedDaysMax: 3,
        isActive: true,
      });
    }
    setRateModalOpen(true);
  };

  const resetRateForm = () => {
    setEditingRate(null);
    setRateForm({
      zoneId: '',
      name: '',
      type: 'flat',
      flatRate: 0,
      weightBasedRanges: [{ minWeight: 0, maxWeight: 1, price: 0 }],
      carrier: 'ups',
      carrierService: '',
      estimatedDaysMin: 1,
      estimatedDaysMax: 3,
      isActive: true,
    });
  };

  const addWeightRange = () => {
    setRateForm({
      ...rateForm,
      weightBasedRanges: [...rateForm.weightBasedRanges, { minWeight: 0, maxWeight: 1, price: 0 }],
    });
  };

  const removeWeightRange = (index) => {
    const newRanges = rateForm.weightBasedRanges.filter((_, i) => i !== index);
    setRateForm({ ...rateForm, weightBasedRanges: newRanges });
  };

  const updateWeightRange = (index, field, value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const newRanges = [...rateForm.weightBasedRanges];
    newRanges[index][field] = num;
    setRateForm({ ...rateForm, weightBasedRanges: newRanges });
  };

  // ========== Blackout CRUD ==========
  const handleBlackoutSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingBlackout) {
        await API.put(`/shipping/blackouts/${editingBlackout._id}`, blackoutForm);
      } else {
        await API.post('/shipping/blackouts', blackoutForm);
      }
      setBlackoutModalOpen(false);
      resetBlackoutForm();
      await fetchBlackouts();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlackout = async (id) => {
    if (!window.confirm('Delete this blackout date?')) return;
    setLoading(true);
    try {
      await API.delete(`/shipping/blackouts/${id}`);
      await fetchBlackouts();
    } catch (err) {
      setError(err.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  const openBlackoutModal = (blackout = null) => {
    if (blackout) {
      setEditingBlackout(blackout);
      setBlackoutForm({
        date: blackout.date.slice(0, 10),
        reason: blackout.reason,
      });
    } else {
      setEditingBlackout(null);
      setBlackoutForm({ date: '', reason: '' });
    }
    setBlackoutModalOpen(true);
  };

  const resetBlackoutForm = () => {
    setEditingBlackout(null);
    setBlackoutForm({ date: '', reason: '' });
  };

  if (loading && !zones.length && !rates.length && !blackouts.length) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🚚 Advanced Shipping Rules</h2>
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'zones' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('zones')}
        >
          Shipping Zones
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'rates' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('rates')}
        >
          Shipping Rates
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'blackouts' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('blackouts')}
        >
          Delivery Blackout Dates
        </button>
      </div>

      {error && <div style={styles.errorMsg}>{error}</div>}

      {/* ZONES TAB */}
      {activeTab === 'zones' && (
        <div>
          <button onClick={() => openZoneModal()} style={styles.addBtn}>+ New Zone</button>
          <table style={styles.table}>
            <thead>
              <tr><th>Name</th><th>Countries (ISO codes)</th><th>Active</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {zones.map(zone => (
                <tr key={zone._id}>
                  <td>{zone.name}</td>
                  <td>{zone.countries.join(', ')}</td>
                  <td>{zone.active ? '✅' : '❌'}</td>
                  <td>
                    <button onClick={() => openZoneModal(zone)} style={styles.editBtn}>Edit</button>
                    <button onClick={() => handleDeleteZone(zone._id)} style={styles.deleteBtn}>Delete</button>
                   </td>
                </tr>
              ))}
              {zones.length === 0 && <tr><td colSpan="4">No zones defined yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* RATES TAB */}
      {activeTab === 'rates' && (
        <div>
          <button onClick={() => openRateModal()} style={styles.addBtn}>+ New Rate</button>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr><th>Zone</th><th>Name</th><th>Type</th><th>Price / Range</th><th>Active</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rates.map(rate => (
                  <tr key={rate._id}>
                    <td>{rate.zoneId?.name || rate.zoneId}</td>
                    <td>{rate.name}</td>
                    <td>{rate.type}</td>
                    <td>
                      {rate.type === 'flat' && `$${rate.flatRate}`}
                      {rate.type === 'weight_based' && (
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {rate.weightBasedRanges.map((r, i) => (
                            <li key={i}>{r.minWeight}kg – {r.maxWeight}kg: ${r.price}</li>
                          ))}
                        </ul>
                      )}
                      {rate.type === 'carrier' && `${rate.carrier.toUpperCase()} (${rate.carrierService})`}
                    </td>
                    <td>{rate.isActive ? '✅' : '❌'}</td>
                    <td>
                      <button onClick={() => openRateModal(rate)} style={styles.editBtn}>Edit</button>
                      <button onClick={() => handleDeleteRate(rate._id)} style={styles.deleteBtn}>Delete</button>
                    </td>
                  </tr>
                ))}
                {rates.length === 0 && <tr><td colSpan="6">No rates defined yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BLACKOUT DATES TAB */}
      {activeTab === 'blackouts' && (
        <div>
          <button onClick={() => openBlackoutModal()} style={styles.addBtn}>+ Add Blackout Date</button>
          <table style={styles.table}>
            <thead>
              <tr><th>Date</th><th>Reason</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {blackouts.map(blackout => (
                <tr key={blackout._id}>
                  <td>{new Date(blackout.date).toLocaleDateString()}</td>
                  <td>{blackout.reason}</td>
                  <td>
                    <button onClick={() => openBlackoutModal(blackout)} style={styles.editBtn}>Edit</button>
                    <button onClick={() => handleDeleteBlackout(blackout._id)} style={styles.deleteBtn}>Delete</button>
                  </td>
                </tr>
              ))}
              {blackouts.length === 0 && <tr><td colSpan="3">No blackout dates defined.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ZONE MODAL */}
      {zoneModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setZoneModalOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>{editingZone ? 'Edit Zone' : 'Create Zone'}</h3>
            <form onSubmit={handleZoneSubmit}>
              <input
                type="text"
                placeholder="Zone Name (e.g., 'US Domestic')"
                value={zoneForm.name}
                onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                required
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Countries (comma separated, e.g., US,CA,GB)"
                value={zoneForm.countries.join(', ')}
                onChange={e => handleZoneCountriesChange(e.target.value)}
                required
                style={styles.input}
              />
              <div style={styles.modalButtons}>
                <button type="button" onClick={() => setZoneModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={loading} style={styles.saveBtn}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RATE MODAL */}
      {rateModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setRateModalOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>{editingRate ? 'Edit Rate' : 'Create Rate'}</h3>
            <form onSubmit={handleRateSubmit}>
              <select
                value={rateForm.zoneId}
                onChange={e => setRateForm({ ...rateForm, zoneId: e.target.value })}
                required
                style={styles.select}
              >
                <option value="">Select Zone</option>
                {zonesForSelect.map(zone => (
                  <option key={zone._id} value={zone._id}>{zone.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Rate Name (e.g., 'Standard', 'Express')"
                value={rateForm.name}
                onChange={e => setRateForm({ ...rateForm, name: e.target.value })}
                required
                style={styles.input}
              />
              <select
                value={rateForm.type}
                onChange={e => setRateForm({ ...rateForm, type: e.target.value })}
                style={styles.select}
              >
                <option value="flat">Flat Rate</option>
                <option value="weight_based">Weight‑Based</option>
                <option value="carrier">Carrier (UPS/FedEx/USPS)</option>
              </select>

              {rateForm.type === 'flat' && (
                <input
                  type="number"
                  step="0.01"
                  placeholder="Flat Rate ($)"
                  value={rateForm.flatRate}
                  onChange={e => setRateForm({ ...rateForm, flatRate: parseFloat(e.target.value) || 0 })}
                  style={styles.input}
                />
              )}

              {rateForm.type === 'weight_based' && (
                <div>
                  <label>Weight Ranges (kg)</label>
                  {rateForm.weightBasedRanges.map((range, idx) => (
                    <div key={idx} style={styles.weightRangeRow}>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Min"
                        value={range.minWeight}
                        onChange={e => updateWeightRange(idx, 'minWeight', e.target.value)}
                        style={styles.smallInput}
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Max"
                        value={range.maxWeight}
                        onChange={e => updateWeightRange(idx, 'maxWeight', e.target.value)}
                        style={styles.smallInput}
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price ($)"
                        value={range.price}
                        onChange={e => updateWeightRange(idx, 'price', e.target.value)}
                        style={styles.smallInput}
                      />
                      <button type="button" onClick={() => removeWeightRange(idx)} style={styles.removeBtn}>−</button>
                    </div>
                  ))}
                  <button type="button" onClick={addWeightRange} style={styles.addRangeBtn}>+ Add Range</button>
                </div>
              )}

              {rateForm.type === 'carrier' && (
                <>
                  <select
                    value={rateForm.carrier}
                    onChange={e => setRateForm({ ...rateForm, carrier: e.target.value })}
                    style={styles.select}
                  >
                    <option value="ups">UPS</option>
                    <option value="fedex">FedEx</option>
                    <option value="usps">USPS</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Carrier Service (e.g., 'GROUND', '2ND_DAY_AIR')"
                    value={rateForm.carrierService}
                    onChange={e => setRateForm({ ...rateForm, carrierService: e.target.value })}
                    style={styles.input}
                  />
                </>
              )}

              <div style={styles.row}>
                <input
                  type="number"
                  placeholder="Est. days min"
                  value={rateForm.estimatedDaysMin}
                  onChange={e => setRateForm({ ...rateForm, estimatedDaysMin: parseInt(e.target.value) || 1 })}
                  style={styles.smallInput}
                />
                <input
                  type="number"
                  placeholder="Est. days max"
                  value={rateForm.estimatedDaysMax}
                  onChange={e => setRateForm({ ...rateForm, estimatedDaysMax: parseInt(e.target.value) || 1 })}
                  style={styles.smallInput}
                />
              </div>

              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={rateForm.isActive}
                  onChange={e => setRateForm({ ...rateForm, isActive: e.target.checked })}
                />
                Active
              </label>

              <div style={styles.modalButtons}>
                <button type="button" onClick={() => setRateModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={loading} style={styles.saveBtn}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLACKOUT MODAL */}
      {blackoutModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setBlackoutModalOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>{editingBlackout ? 'Edit Blackout Date' : 'Add Blackout Date'}</h3>
            <form onSubmit={handleBlackoutSubmit}>
              <input
                type="date"
                value={blackoutForm.date}
                onChange={e => setBlackoutForm({ ...blackoutForm, date: e.target.value })}
                required
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Reason (e.g., 'Christmas Day')"
                value={blackoutForm.reason}
                onChange={e => setBlackoutForm({ ...blackoutForm, reason: e.target.value })}
                style={styles.input}
              />
              <div style={styles.modalButtons}>
                <button type="button" onClick={() => setBlackoutModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={loading} style={styles.saveBtn}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== STYLES ==========
const styles = {
  container: { padding: 20, maxWidth: 1200, margin: '0 auto' },
  title: { fontSize: 28, marginBottom: 20 },
  tabs: { display: 'flex', gap: 8, borderBottom: '1px solid #ddd', marginBottom: 20 },
  tab: { padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 },
  activeTab: { borderBottom: '2px solid #007bff', color: '#007bff', fontWeight: 'bold' },
  addBtn: { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', marginBottom: 16 },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  editBtn: { backgroundColor: '#ffc107', color: '#333', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', marginRight: 4 },
  deleteBtn: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'white', borderRadius: 8, padding: 24, width: '90%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto' },
  input: { width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 },
  select: { width: '100%', padding: 8, marginBottom: 12, border: '1px solid #ddd', borderRadius: 4 },
  smallInput: { width: '30%', padding: 6, marginRight: 8, border: '1px solid #ddd', borderRadius: 4 },
  weightRangeRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  removeBtn: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' },
  addRangeBtn: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', marginTop: 4 },
  row: { display: 'flex', gap: 8, marginBottom: 12 },
  checkbox: { display: 'block', marginBottom: 12, fontSize: 14 },
  modalButtons: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  saveBtn: { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' },
  cancelBtn: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' },
  errorMsg: { backgroundColor: '#f8d7da', color: '#721c24', padding: 12, borderRadius: 6, marginBottom: 16 },
};

export default ShippingSettings;