import React, { useState, useEffect } from 'react';
import API from '../../services/api';

const AdminMonetization = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ name: '', priceMonthly: '', commissionRate: '', maxProducts: '', features: [] });
  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await API.get('/admin/settings/monetization');
      setSettings(res.data.settings);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);
    try {
      await API.put('/admin/settings/monetization', updated);
      setMessage({ type: 'success', text: 'Settings saved' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (key) => {
    updateSetting(key, !settings[key]);
  };

  // ========== Subscription Plans CRUD ==========
  const addPlan = async () => {
    if (!planForm.name || !planForm.priceMonthly || !planForm.commissionRate) {
      setMessage({ type: 'error', text: 'Name, price and commission rate are required' });
      return;
    }
    try {
      const res = await API.post('/admin/settings/subscription-plans', {
        name: planForm.name,
        priceMonthly: parseFloat(planForm.priceMonthly),
        commissionRate: parseFloat(planForm.commissionRate),
        maxProducts: parseInt(planForm.maxProducts) || 0,
        features: planForm.features,
      });
      setSettings(prev => ({
        ...prev,
        subscriptionPlans: [...(prev.subscriptionPlans || []), res.data.plan],
      }));
      setPlanForm({ name: '', priceMonthly: '', commissionRate: '', maxProducts: '', features: [] });
      setFeatureInput('');
      setMessage({ type: 'success', text: 'Plan added' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to add plan' });
    }
  };

  const updatePlan = async () => {
    if (!editingPlan) return;
    try {
      const res = await API.put(`/admin/settings/subscription-plans/${editingPlan._id}`, {
        name: planForm.name,
        priceMonthly: parseFloat(planForm.priceMonthly),
        commissionRate: parseFloat(planForm.commissionRate),
        maxProducts: parseInt(planForm.maxProducts) || 0,
        features: planForm.features,
      });
      setSettings(prev => ({
        ...prev,
        subscriptionPlans: prev.subscriptionPlans.map(p => p._id === editingPlan._id ? res.data.plan : p),
      }));
      setEditingPlan(null);
      setPlanForm({ name: '', priceMonthly: '', commissionRate: '', maxProducts: '', features: [] });
      setFeatureInput('');
      setMessage({ type: 'success', text: 'Plan updated' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update plan' });
    }
  };

  const deletePlan = async (planId) => {
    if (!window.confirm('Delete this subscription plan?')) return;
    try {
      await API.delete(`/admin/settings/subscription-plans/${planId}`);
      setSettings(prev => ({
        ...prev,
        subscriptionPlans: prev.subscriptionPlans.filter(p => p._id !== planId),
      }));
      setMessage({ type: 'success', text: 'Plan deleted' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete plan' });
    }
  };

  const editPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      commissionRate: plan.commissionRate,
      maxProducts: plan.maxProducts,
      features: plan.features || [],
    });
    setFeatureInput('');
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setPlanForm(prev => ({ ...prev, features: [...prev.features, featureInput.trim()] }));
      setFeatureInput('');
    }
  };

  const removeFeature = (index) => {
    setPlanForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
  };

  // ========== Lead Generation Export ==========
  const exportEmails = async () => {
    try {
      const response = await API.post('/admin/settings/export-emails', {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'subscribers.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage({ type: 'success', text: 'Export started' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Export failed' });
    }
  };

  if (loading) return <div>Loading monetization settings...</div>;
  if (!settings) return <div>No settings found</div>;

  return (
    <div style={styles.container}>
      <h2>Monetization Settings</h2>
      {message.text && (
        <div style={{ ...styles.message, backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24' }}>
          {message.text}
        </div>
      )}

      <div style={styles.grid}>
        {/* Commission per sale */}
        <div style={styles.card}>
          <label style={styles.toggle}>
            <input type="checkbox" checked={settings.enableCommission} onChange={() => toggleFeature('enableCommission')} disabled={saving} />
            <span>Enable Commission per sale</span>
          </label>
          {settings.enableCommission && (
            <div style={styles.inputGroup}>
              <label>Commission Rate (%)</label>
              <input type="number" step="0.5" min="0" max="100" value={settings.commissionRate} onChange={e => updateSetting('commissionRate', parseFloat(e.target.value))} disabled={saving} />
            </div>
          )}
        </div>

        {/* Listing fees */}
        <div style={styles.card}>
          <label style={styles.toggle}>
            <input type="checkbox" checked={settings.enableListingFee} onChange={() => toggleFeature('enableListingFee')} disabled={saving} />
            <span>Enable Listing Fees (per product)</span>
          </label>
          {settings.enableListingFee && (
            <div style={styles.inputGroup}>
              <label>Fee per product ($)</label>
              <input type="number" step="0.1" min="0" value={settings.listingFeeAmount} onChange={e => updateSetting('listingFeeAmount', parseFloat(e.target.value))} disabled={saving} />
            </div>
          )}
        </div>

        {/* Promoted listings */}
        <div style={styles.card}>
          <label style={styles.toggle}>
            <input type="checkbox" checked={settings.enablePromotedListings} onChange={() => toggleFeature('enablePromotedListings')} disabled={saving} />
            <span>Enable Promoted Listings</span>
          </label>
          {settings.enablePromotedListings && (
            <div style={styles.inputGroup}>
              <label>Price per day ($)</label>
              <input type="number" step="0.5" min="0" value={settings.promotedPricePerDay} onChange={e => updateSetting('promotedPricePerDay', parseFloat(e.target.value))} disabled={saving} />
            </div>
          )}
        </div>

        {/* Transaction fee markup */}
        <div style={styles.card}>
          <label style={styles.toggle}>
            <input type="checkbox" checked={settings.enableTransactionFee} onChange={() => toggleFeature('enableTransactionFee')} disabled={saving} />
            <span>Enable Transaction Fee Markup</span>
          </label>
          {settings.enableTransactionFee && (
            <div style={styles.inputGroup}>
              <label>Markup (%)</label>
              <input type="number" step="0.1" min="0" value={settings.transactionFeePercent} onChange={e => updateSetting('transactionFeePercent', parseFloat(e.target.value))} disabled={saving} />
            </div>
          )}
        </div>

        {/* Shipping markup */}
        <div style={styles.card}>
          <label style={styles.toggle}>
            <input type="checkbox" checked={settings.enableShippingMarkup} onChange={() => toggleFeature('enableShippingMarkup')} disabled={saving} />
            <span>Enable Shipping Fee Markup</span>
          </label>
          {settings.enableShippingMarkup && (
            <div style={styles.inputGroup}>
              <label>Markup per shipment ($)</label>
              <input type="number" step="0.5" min="0" value={settings.shippingMarkupAmount} onChange={e => updateSetting('shippingMarkupAmount', parseFloat(e.target.value))} disabled={saving} />
            </div>
          )}
        </div>

        {/* Withdrawal fees */}
        <div style={styles.card}>
          <label style={styles.toggle}>
            <input type="checkbox" checked={settings.enableWithdrawalFee} onChange={() => toggleFeature('enableWithdrawalFee')} disabled={saving} />
            <span>Enable Withdrawal / Payout Fees</span>
          </label>
          {settings.enableWithdrawalFee && (
            <>
              <div style={styles.inputGroup}>
                <label>Fixed fee ($)</label>
                <input type="number" step="0.5" min="0" value={settings.withdrawalFeeFixed} onChange={e => updateSetting('withdrawalFeeFixed', parseFloat(e.target.value))} disabled={saving} />
              </div>
              <div style={styles.inputGroup}>
                <label>Percent fee (%)</label>
                <input type="number" step="0.1" min="0" value={settings.withdrawalFeePercent} onChange={e => updateSetting('withdrawalFeePercent', parseFloat(e.target.value))} disabled={saving} />
              </div>
            </>
          )}
        </div>

        {/* Premium shop */}
        <div style={styles.card}>
          <label style={styles.toggle}>
            <input type="checkbox" checked={settings.enablePremiumShop} onChange={() => toggleFeature('enablePremiumShop')} disabled={saving} />
            <span>Enable Premium Shop (one‑time fee)</span>
          </label>
          {settings.enablePremiumShop && (
            <>
              <div style={styles.inputGroup}>
                <label>Price ($)</label>
                <input type="number" step="0.5" min="0" value={settings.premiumShopPrice} onChange={e => updateSetting('premiumShopPrice', parseFloat(e.target.value))} disabled={saving} />
              </div>
              <div style={styles.inputGroup}>
                <label>Features (comma separated)</label>
                <input type="text" value={settings.premiumShopFeatures?.join(', ') || ''} onChange={e => updateSetting('premiumShopFeatures', e.target.value.split(',').map(s => s.trim()))} disabled={saving} />
              </div>
            </>
          )}
        </div>

        {/* Lead generation */}
        <div style={styles.card}>
          <label style={styles.toggle}>
            <input type="checkbox" checked={settings.enableLeadGeneration} onChange={() => toggleFeature('enableLeadGeneration')} disabled={saving} />
            <span>Enable Lead Generation (email export)</span>
          </label>
          {settings.enableLeadGeneration && (
            <div style={styles.inputGroup}>
              <label>Export price ($)</label>
              <input type="number" step="0.5" min="0" value={settings.leadExportPrice} onChange={e => updateSetting('leadExportPrice', parseFloat(e.target.value))} disabled={saving} />
              <button onClick={exportEmails} style={styles.exportBtn}>Export Emails (CSV)</button>
            </div>
          )}
        </div>

        {/* Advertising banner */}
        <div style={styles.card}>
          <label style={styles.toggle}>
            <input type="checkbox" checked={settings.enableAdvertisingBanner} onChange={() => toggleFeature('enableAdvertisingBanner')} disabled={saving} />
            <span>Enable Advertising Banner</span>
          </label>
          {settings.enableAdvertisingBanner && (
            <>
              <div style={styles.inputGroup}>
                <label>Banner Image URL</label>
                <input type="text" value={settings.bannerImage || ''} onChange={e => updateSetting('bannerImage', e.target.value)} placeholder="https://..." disabled={saving} />
              </div>
              <div style={styles.inputGroup}>
                <label>Banner Link (URL)</label>
                <input type="text" value={settings.bannerLink || ''} onChange={e => updateSetting('bannerLink', e.target.value)} placeholder="https://..." disabled={saving} />
              </div>
              <div style={styles.inputGroup}>
                <label>Custom HTML (overrides image)</label>
                <textarea rows="3" value={settings.bannerHtml || ''} onChange={e => updateSetting('bannerHtml', e.target.value)} placeholder="<div>Your ad code</div>" disabled={saving} style={styles.textarea} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Subscription Plans Section */}
      <div style={styles.section}>
        <h3>Subscription Plans (override commission)</h3>
        <div style={styles.toggle}>
          <label>
            <input type="checkbox" checked={settings.enableSubscriptions} onChange={() => toggleFeature('enableSubscriptions')} disabled={saving} />
            Enable Subscriptions
          </label>
        </div>
        {settings.enableSubscriptions && (
          <>
            <div style={styles.plansList}>
              {settings.subscriptionPlans?.map(plan => (
                <div key={plan._id} style={styles.planCard}>
                  <div><strong>{plan.name}</strong></div>
                  <div>${plan.priceMonthly}/month</div>
                  <div>Commission: {plan.commissionRate}%</div>
                  <div>Max products: {plan.maxProducts === 0 ? 'Unlimited' : plan.maxProducts}</div>
                  <div>Features: {plan.features?.join(', ') || 'None'}</div>
                  <div>
                    <button onClick={() => editPlan(plan)} style={styles.editBtn}>Edit</button>
                    <button onClick={() => deletePlan(plan._id)} style={styles.deleteBtn}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.planForm}>
              <h4>{editingPlan ? 'Edit Plan' : 'Add New Plan'}</h4>
              <div style={styles.inputGroup}>
                <label>Plan Name</label>
                <input type="text" value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} />
              </div>
              <div style={styles.inputGroup}>
                <label>Monthly Price ($)</label>
                <input type="number" step="0.5" value={planForm.priceMonthly} onChange={e => setPlanForm({ ...planForm, priceMonthly: e.target.value })} />
              </div>
              <div style={styles.inputGroup}>
                <label>Commission Rate (%)</label>
                <input type="number" step="0.5" min="0" max="100" value={planForm.commissionRate} onChange={e => setPlanForm({ ...planForm, commissionRate: e.target.value })} />
              </div>
              <div style={styles.inputGroup}>
                <label>Max Products (0 = unlimited)</label>
                <input type="number" min="0" value={planForm.maxProducts} onChange={e => setPlanForm({ ...planForm, maxProducts: e.target.value })} />
              </div>
              <div style={styles.inputGroup}>
                <label>Features (one per line)</label>
                <div style={styles.featuresList}>
                  {planForm.features.map((feat, idx) => (
                    <div key={idx} style={styles.featureTag}>
                      {feat}
                      <button onClick={() => removeFeature(idx)} style={styles.removeTag}>✕</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input type="text" value={featureInput} onChange={e => setFeatureInput(e.target.value)} placeholder="New feature" style={{ flex: 1 }} />
                  <button onClick={addFeature} style={styles.addFeatureBtn}>Add</button>
                </div>
              </div>
              <div style={styles.buttonGroup}>
                <button onClick={editingPlan ? updatePlan : addPlan} style={styles.savePlanBtn}>{editingPlan ? 'Update Plan' : 'Add Plan'}</button>
                {editingPlan && <button onClick={() => { setEditingPlan(null); setPlanForm({ name: '', priceMonthly: '', commissionRate: '', maxProducts: '', features: [] }); }} style={styles.cancelBtn}>Cancel</button>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginBottom: '40px' },
  card: { backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' },
  toggle: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '16px', fontWeight: '500' },
  inputGroup: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' },
  textarea: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'monospace' },
  message: { padding: '10px', borderRadius: '4px', marginBottom: '20px' },
  section: { marginTop: '40px', borderTop: '1px solid #ddd', paddingTop: '20px' },
  plansList: { display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' },
  planCard: { backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '200px' },
  editBtn: { marginRight: '8px', padding: '4px 8px', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  deleteBtn: { padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  planForm: { backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', marginTop: '16px' },
  featuresList: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' },
  featureTag: { backgroundColor: '#e9ecef', padding: '4px 8px', borderRadius: '20px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  removeTag: { background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', fontSize: '14px' },
  addFeatureBtn: { padding: '4px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  buttonGroup: { display: 'flex', gap: '12px', marginTop: '16px' },
  savePlanBtn: { padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  cancelBtn: { padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  exportBtn: { marginTop: '8px', padding: '6px 12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
};

export default AdminMonetization;