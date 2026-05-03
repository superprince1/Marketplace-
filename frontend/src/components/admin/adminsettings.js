// src/components/Admin/AdminSettings.js
import React, { useState, useEffect } from 'react';
import { getAdminSettings, updateAdminSettings } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

/**
 * AdminSettings Component
 * 
 * Manage global platform settings.
 * 
 * Features:
 * - Basic settings (site name, tax rate, free shipping threshold, etc.)
 * - Payment gateways (Stripe, PayPal, Paystack, Coinbase)
 * - Abandoned cart emails
 * - Cash on Delivery monetization
 * - Custom domain monetization
 * - TAX AUTOMATION (TaxJar / Avalara) – enable, API keys, fallback rate, nexus addresses
 * - Advanced shipping default origin (for weight‑based/carrier rates)
 */
const AdminSettings = () => {
  const [settings, setSettings] = useState({
    siteName: 'MarketPlace',
    taxRate: 8.0,
    freeShippingThreshold: 50,
    defaultShippingCost: 5.99,
    contactEmail: '',
    enableReviews: true,
    currencyCode: 'USD',
    timezone: 'UTC',
    orderNumberPrefix: 'ORD',
    minOrderAmount: 0,
    enabledPaymentGateways: {
      stripe: false,
      paypal: false,
      paystack: false,
      coinbase: false,
    },
    // Abandoned cart emails
    enableAbandonedCartEmails: true,
    abandonedCartDelayHours: 1,
    // COD Monetization
    enableCodFee: false,
    codFeeType: 'flat',
    codFeeFlat: 2,
    codFeePercent: 3,
    enableCodCommission: false,
    codCommissionRate: 15,
    enableCodHandlingFee: false,
    codHandlingFeeAmount: 2,
    // Custom Domain Monetization
    enableCustomDomainFee: false,
    customDomainPrice: 19.99,
    // ========== TAX AUTOMATION ==========
    taxAutomation: {
      enabled: false,
      provider: 'none', // 'taxjar', 'avalara', 'none'
      apiKey: '',
      apiSecret: '',
      fallbackRate: 8.0,
      addressValidationEnabled: false,
      nexusAddresses: [{ country: 'US', state: '', zipCode: '', city: '', street: '' }],
    },
    // ========== ADVANCED SHIPPING DEFAULT ORIGIN ==========
    defaultShippingOrigin: {
      country: 'US',
      state: 'CA',
      city: 'Los Angeles',
      zipCode: '90001',
      street: '',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await getAdminSettings();
      let settingsObj = {};
      if (Array.isArray(response.data)) {
        response.data.forEach(item => {
          settingsObj[item.key] = item.value;
        });
      } else {
        settingsObj = response.data;
      }
      // Ensure nested objects exist
      if (!settingsObj.enabledPaymentGateways) {
        settingsObj.enabledPaymentGateways = { stripe: false, paypal: false, paystack: false, coinbase: false };
      }
      // Defaults for abandoned cart if missing
      if (settingsObj.enableAbandonedCartEmails === undefined) settingsObj.enableAbandonedCartEmails = true;
      if (settingsObj.abandonedCartDelayHours === undefined) settingsObj.abandonedCartDelayHours = 1;
      // Defaults for COD if missing
      if (settingsObj.enableCodFee === undefined) settingsObj.enableCodFee = false;
      if (settingsObj.codFeeType === undefined) settingsObj.codFeeType = 'flat';
      if (settingsObj.codFeeFlat === undefined) settingsObj.codFeeFlat = 2;
      if (settingsObj.codFeePercent === undefined) settingsObj.codFeePercent = 3;
      if (settingsObj.enableCodCommission === undefined) settingsObj.enableCodCommission = false;
      if (settingsObj.codCommissionRate === undefined) settingsObj.codCommissionRate = 15;
      if (settingsObj.enableCodHandlingFee === undefined) settingsObj.enableCodHandlingFee = false;
      if (settingsObj.codHandlingFeeAmount === undefined) settingsObj.codHandlingFeeAmount = 2;
      // Defaults for custom domain monetization
      if (settingsObj.enableCustomDomainFee === undefined) settingsObj.enableCustomDomainFee = false;
      if (settingsObj.customDomainPrice === undefined) settingsObj.customDomainPrice = 19.99;
      // ========== Tax automation defaults ==========
      if (!settingsObj.taxAutomation) {
        settingsObj.taxAutomation = {
          enabled: false,
          provider: 'none',
          apiKey: '',
          apiSecret: '',
          fallbackRate: 8.0,
          addressValidationEnabled: false,
          nexusAddresses: [{ country: 'US', state: '', zipCode: '', city: '', street: '' }],
        };
      } else {
        if (settingsObj.taxAutomation.nexusAddresses === undefined || settingsObj.taxAutomation.nexusAddresses.length === 0) {
          settingsObj.taxAutomation.nexusAddresses = [{ country: 'US', state: '', zipCode: '', city: '', street: '' }];
        }
      }
      // Advanced shipping default origin
      if (!settingsObj.defaultShippingOrigin) {
        settingsObj.defaultShippingOrigin = { country: 'US', state: 'CA', city: 'Los Angeles', zipCode: '90001', street: '' };
      }
      setSettings(prev => ({ ...prev, ...settingsObj }));
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings. Using defaults.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (message.text) setMessage({ type: '', text: '' });
  };

  const handleTaxAutomationChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      taxAutomation: { ...prev.taxAutomation, [field]: value },
    }));
  };

  const addNexusAddress = () => {
    setSettings(prev => ({
      ...prev,
      taxAutomation: {
        ...prev.taxAutomation,
        nexusAddresses: [...prev.taxAutomation.nexusAddresses, { country: 'US', state: '', zipCode: '', city: '', street: '' }],
      },
    }));
  };

  const updateNexusAddress = (index, field, value) => {
    const newAddresses = [...settings.taxAutomation.nexusAddresses];
    newAddresses[index][field] = value;
    setSettings(prev => ({
      ...prev,
      taxAutomation: { ...prev.taxAutomation, nexusAddresses: newAddresses },
    }));
  };

  const removeNexusAddress = (index) => {
    if (settings.taxAutomation.nexusAddresses.length === 1) return;
    const newAddresses = settings.taxAutomation.nexusAddresses.filter((_, i) => i !== index);
    setSettings(prev => ({
      ...prev,
      taxAutomation: { ...prev.taxAutomation, nexusAddresses: newAddresses },
    }));
  };

  const handleShippingOriginChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      defaultShippingOrigin: { ...prev.defaultShippingOrigin, [field]: value },
    }));
  };

  const handleGatewayToggle = (gateway, checked) => {
    setSettings(prev => ({
      ...prev,
      enabledPaymentGateways: { ...prev.enabledPaymentGateways, [gateway]: checked },
    }));
  };

  const validateSettings = () => {
    // Existing validations
    if (settings.taxRate < 0 || settings.taxRate > 100) {
      setMessage({ type: 'error', text: 'Tax rate must be between 0 and 100.' });
      return false;
    }
    if (settings.freeShippingThreshold < 0) {
      setMessage({ type: 'error', text: 'Free shipping threshold cannot be negative.' });
      return false;
    }
    if (settings.defaultShippingCost < 0) {
      setMessage({ type: 'error', text: 'Default shipping cost cannot be negative.' });
      return false;
    }
    if (settings.minOrderAmount < 0) {
      setMessage({ type: 'error', text: 'Minimum order amount cannot be negative.' });
      return false;
    }
    if (settings.contactEmail && !/^\S+@\S+\.\S+$/.test(settings.contactEmail)) {
      setMessage({ type: 'error', text: 'Invalid contact email address.' });
      return false;
    }
    if (settings.abandonedCartDelayHours < 1 || settings.abandonedCartDelayHours > 72) {
      setMessage({ type: 'error', text: 'Abandoned cart delay must be between 1 and 72 hours.' });
      return false;
    }
    // COD validations
    if (settings.enableCodFee && settings.codFeeType === 'flat' && settings.codFeeFlat < 0) {
      setMessage({ type: 'error', text: 'COD flat fee cannot be negative.' });
      return false;
    }
    if (settings.enableCodFee && settings.codFeeType === 'percent' && (settings.codFeePercent < 0 || settings.codFeePercent > 20)) {
      setMessage({ type: 'error', text: 'COD percentage fee must be between 0 and 20.' });
      return false;
    }
    if (settings.enableCodCommission && (settings.codCommissionRate < 0 || settings.codCommissionRate > 100)) {
      setMessage({ type: 'error', text: 'COD commission rate must be between 0 and 100.' });
      return false;
    }
    if (settings.enableCodHandlingFee && settings.codHandlingFeeAmount < 0) {
      setMessage({ type: 'error', text: 'COD handling fee cannot be negative.' });
      return false;
    }
    // Custom domain price validation
    if (settings.enableCustomDomainFee && settings.customDomainPrice < 0) {
      setMessage({ type: 'error', text: 'Custom domain price cannot be negative.' });
      return false;
    }
    // Tax automation: if enabled with 'taxjar', require API key
    if (settings.taxAutomation.enabled && settings.taxAutomation.provider === 'taxjar' && !settings.taxAutomation.apiKey.trim()) {
      setMessage({ type: 'error', text: 'TaxJar API key is required when TaxJar is enabled.' });
      return false;
    }
    if (settings.taxAutomation.enabled && settings.taxAutomation.provider === 'avalara' && (!settings.taxAutomation.apiKey.trim() || !settings.taxAutomation.apiSecret.trim())) {
      setMessage({ type: 'error', text: 'Avalara requires both API Key and API Secret.' });
      return false;
    }
    if (settings.taxAutomation.fallbackRate < 0 || settings.taxAutomation.fallbackRate > 100) {
      setMessage({ type: 'error', text: 'Fallback tax rate must be between 0 and 100.' });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateSettings()) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await updateAdminSettings(settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading settings..." />;

  return (
    <div style={styles.container}>
      <h3 style={styles.sectionTitle}>Platform Settings</h3>
      <p style={styles.description}>Configure global marketplace behavior.</p>

      {message.text && (
        <div style={message.type === 'success' ? styles.successAlert : styles.errorAlert}>
          {message.text}
        </div>
      )}

      {/* Basic Settings Grid (unchanged) */}
      <div style={styles.grid}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Site Name</label>
          <input
            type="text"
            value={settings.siteName || ''}
            onChange={(e) => handleChange('siteName', e.target.value)}
            style={styles.input}
            placeholder="MarketPlace"
          />
          <small style={styles.helper}>Appears in browser tab and header.</small>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Currency Code</label>
          <input
            type="text"
            value={settings.currencyCode || 'USD'}
            onChange={(e) => handleChange('currencyCode', e.target.value.toUpperCase())}
            style={styles.input}
            placeholder="USD"
            maxLength="3"
          />
          <small style={styles.helper}>ISO currency code (e.g., USD, EUR, GBP).</small>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Tax Rate (%) (Fallback if automation disabled)</label>
          <input
            type="number"
            step="0.1"
            value={settings.taxRate ?? 8}
            onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
            style={styles.input}
          />
          <small style={styles.helper}>Used as fallback when tax automation is off.</small>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Free Shipping Threshold ($)</label>
          <input
            type="number"
            step="1"
            value={settings.freeShippingThreshold ?? 50}
            onChange={(e) => handleChange('freeShippingThreshold', parseFloat(e.target.value))}
            style={styles.input}
          />
          <small style={styles.helper}>Orders above this get free shipping.</small>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Default Shipping Cost ($)</label>
          <input
            type="number"
            step="0.5"
            value={settings.defaultShippingCost ?? 5.99}
            onChange={(e) => handleChange('defaultShippingCost', parseFloat(e.target.value))}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Minimum Order Amount ($)</label>
          <input
            type="number"
            step="0.01"
            value={settings.minOrderAmount ?? 0}
            onChange={(e) => handleChange('minOrderAmount', parseFloat(e.target.value))}
            style={styles.input}
          />
          <small style={styles.helper}>Minimum subtotal required to checkout.</small>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Order Number Prefix</label>
          <input
            type="text"
            value={settings.orderNumberPrefix || 'ORD'}
            onChange={(e) => handleChange('orderNumberPrefix', e.target.value.toUpperCase())}
            style={styles.input}
            placeholder="ORD"
            maxLength="10"
          />
          <small style={styles.helper}>Prefix for order numbers (e.g., ORD-1234).</small>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Timezone</label>
          <select
            value={settings.timezone || 'UTC'}
            onChange={(e) => handleChange('timezone', e.target.value)}
            style={styles.select}
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Berlin">Central European Time (CET)</option>
            <option value="Asia/Tokyo">Japan (JST)</option>
            <option value="Australia/Sydney">Australia (AEST)</option>
          </select>
          <small style={styles.helper}>Used for order timestamps and schedules.</small>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Contact Email</label>
          <input
            type="email"
            value={settings.contactEmail || ''}
            onChange={(e) => handleChange('contactEmail', e.target.value)}
            style={styles.input}
            placeholder="admin@marketplace.com"
          />
          <small style={styles.helper}>Used for system notifications.</small>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Enable Reviews</label>
          <select
            value={settings.enableReviews ? 'true' : 'false'}
            onChange={(e) => handleChange('enableReviews', e.target.value === 'true')}
            style={styles.select}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          <small style={styles.helper}>Allow customers to review products.</small>
        </div>
      </div>

      {/* Payment Gateways */}
      <h3 style={styles.sectionTitle}>Enabled Payment Gateways</h3>
      <div style={styles.gatewayGrid}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.enabledPaymentGateways?.stripe || false}
            onChange={(e) => handleGatewayToggle('stripe', e.target.checked)}
          />
          Stripe
        </label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.enabledPaymentGateways?.paypal || false}
            onChange={(e) => handleGatewayToggle('paypal', e.target.checked)}
          />
          PayPal
        </label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.enabledPaymentGateways?.paystack || false}
            onChange={(e) => handleGatewayToggle('paystack', e.target.checked)}
          />
          Paystack
        </label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.enabledPaymentGateways?.coinbase || false}
            onChange={(e) => handleGatewayToggle('coinbase', e.target.checked)}
          />
          Coinbase Commerce
        </label>
      </div>

      {/* Abandoned Cart Emails */}
      <h3 style={styles.sectionTitle}>Abandoned Cart Emails</h3>
      <div style={styles.grid}>
        <div style={styles.fieldGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableAbandonedCartEmails}
              onChange={(e) => handleChange('enableAbandonedCartEmails', e.target.checked)}
            />
            Enable Abandoned Cart Reminder Emails
          </label>
          <small style={styles.helper}>Send email reminders to users who leave items in cart.</small>
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Reminder Delay (hours)</label>
          <input
            type="number"
            step="1"
            min="1"
            max="72"
            value={settings.abandonedCartDelayHours ?? 1}
            onChange={(e) => handleChange('abandonedCartDelayHours', parseInt(e.target.value))}
            style={styles.input}
          />
          <small style={styles.helper}>How many hours after cart abandonment to send the first reminder.</small>
        </div>
      </div>

      {/* Cash on Delivery Monetization */}
      <h3 style={styles.sectionTitle}>Cash on Delivery Monetization</h3>
      <div style={styles.grid}>
        <div style={styles.fieldGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableCodFee || false}
              onChange={(e) => handleChange('enableCodFee', e.target.checked)}
            />
            Enable COD Service Fee (charged to buyer)
          </label>
        </div>
        {settings.enableCodFee && (
          <>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Fee Type</label>
              <select
                value={settings.codFeeType || 'flat'}
                onChange={(e) => handleChange('codFeeType', e.target.value)}
                style={styles.select}
              >
                <option value="flat">Flat fee ($)</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>
            {settings.codFeeType === 'flat' ? (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Flat Fee Amount ($)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={settings.codFeeFlat ?? 2}
                  onChange={(e) => handleChange('codFeeFlat', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
            ) : (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Percentage Fee (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={settings.codFeePercent ?? 3}
                  onChange={(e) => handleChange('codFeePercent', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
            )}
          </>
        )}

        <div style={styles.fieldGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableCodCommission || false}
              onChange={(e) => handleChange('enableCodCommission', e.target.checked)}
            />
            Enable Higher Commission for COD Orders (charged to seller)
          </label>
        </div>
        {settings.enableCodCommission && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>COD Commission Rate (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={settings.codCommissionRate ?? 15}
              onChange={(e) => handleChange('codCommissionRate', parseFloat(e.target.value))}
              style={styles.input}
            />
          </div>
        )}

        <div style={styles.fieldGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableCodHandlingFee || false}
              onChange={(e) => handleChange('enableCodHandlingFee', e.target.checked)}
            />
            Enable COD Handling Fee (added to shipping, charged to buyer)
          </label>
        </div>
        {settings.enableCodHandlingFee && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Handling Fee Amount ($)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={settings.codHandlingFeeAmount ?? 2}
              onChange={(e) => handleChange('codHandlingFeeAmount', parseFloat(e.target.value))}
              style={styles.input}
            />
          </div>
        )}
      </div>

      {/* Custom Domain Monetization */}
      <h3 style={styles.sectionTitle}>Custom Domain Monetization</h3>
      <div style={styles.grid}>
        <div style={styles.fieldGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableCustomDomainFee || false}
              onChange={(e) => handleChange('enableCustomDomainFee', e.target.checked)}
            />
            Enable Custom Domain Fee (one‑time charge to sellers)
          </label>
          <small style={styles.helper}>Sellers will pay a one‑time fee to use their own domain.</small>
        </div>
        {settings.enableCustomDomainFee && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Price ($)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={settings.customDomainPrice ?? 19.99}
              onChange={(e) => handleChange('customDomainPrice', parseFloat(e.target.value))}
              style={styles.input}
            />
          </div>
        )}
      </div>

      {/* ========== TAX AUTOMATION SECTION ========== */}
      <h3 style={styles.sectionTitle}>Tax Automation (TaxJar / Avalara)</h3>
      <div style={styles.grid}>
        <div style={styles.fieldGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.taxAutomation.enabled}
              onChange={(e) => handleTaxAutomationChange('enabled', e.target.checked)}
            />
            Enable Real‑Time Tax Calculation
          </label>
          <small style={styles.helper}>Uses selected provider to calculate tax dynamically.</small>
        </div>

        {settings.taxAutomation.enabled && (
          <>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Provider</label>
              <select
                value={settings.taxAutomation.provider}
                onChange={(e) => handleTaxAutomationChange('provider', e.target.value)}
                style={styles.select}
              >
                <option value="none">None (use fallback rate)</option>
                <option value="taxjar">TaxJar</option>
                <option value="avalara">Avalara</option>
              </select>
            </div>

            {(settings.taxAutomation.provider === 'taxjar' || settings.taxAutomation.provider === 'avalara') && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>API Key</label>
                <input
                  type="text"
                  value={settings.taxAutomation.apiKey}
                  onChange={(e) => handleTaxAutomationChange('apiKey', e.target.value)}
                  style={styles.input}
                  placeholder="Enter API key"
                />
              </div>
            )}

            {settings.taxAutomation.provider === 'avalara' && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>API Secret</label>
                <input
                  type="password"
                  value={settings.taxAutomation.apiSecret}
                  onChange={(e) => handleTaxAutomationChange('apiSecret', e.target.value)}
                  style={styles.input}
                  placeholder="Enter API secret"
                />
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Fallback Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={settings.taxAutomation.fallbackRate}
                onChange={(e) => handleTaxAutomationChange('fallbackRate', parseFloat(e.target.value))}
                style={styles.input}
              />
              <small style={styles.helper}>Used when provider API fails or returns no rate.</small>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.taxAutomation.addressValidationEnabled}
                  onChange={(e) => handleTaxAutomationChange('addressValidationEnabled', e.target.checked)}
                />
                Enable Address Validation (before tax lookup)
              </label>
            </div>

            {/* Nexus addresses */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Nexus Addresses (where you have physical presence)</label>
              <small style={styles.helper}>Required for origin‑based tax calculations.</small>
              <div style={styles.nexusContainer}>
                {settings.taxAutomation.nexusAddresses.map((addr, idx) => (
                  <div key={idx} style={styles.nexusRow}>
                    <input
                      type="text"
                      placeholder="Country (e.g., US)"
                      value={addr.country}
                      onChange={(e) => updateNexusAddress(idx, 'country', e.target.value)}
                      style={styles.smallInput}
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={addr.state}
                      onChange={(e) => updateNexusAddress(idx, 'state', e.target.value)}
                      style={styles.smallInput}
                    />
                    <input
                      type="text"
                      placeholder="Zip Code"
                      value={addr.zipCode}
                      onChange={(e) => updateNexusAddress(idx, 'zipCode', e.target.value)}
                      style={styles.smallInput}
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={addr.city}
                      onChange={(e) => updateNexusAddress(idx, 'city', e.target.value)}
                      style={styles.smallInput}
                    />
                    <input
                      type="text"
                      placeholder="Street (optional)"
                      value={addr.street}
                      onChange={(e) => updateNexusAddress(idx, 'street', e.target.value)}
                      style={styles.smallInput}
                    />
                    <button
                      type="button"
                      onClick={() => removeNexusAddress(idx)}
                      disabled={settings.taxAutomation.nexusAddresses.length === 1}
                      style={styles.removeBtn}
                    >
                      −
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addNexusAddress} style={styles.addBtn}>
                  + Add another nexus address
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========== ADVANCED SHIPPING DEFAULT ORIGIN ========== */}
      <h3 style={styles.sectionTitle}>Advanced Shipping Default Origin</h3>
      <div style={styles.grid}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Country</label>
          <input
            type="text"
            value={settings.defaultShippingOrigin.country}
            onChange={(e) => handleShippingOriginChange('country', e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>State</label>
          <input
            type="text"
            value={settings.defaultShippingOrigin.state}
            onChange={(e) => handleShippingOriginChange('state', e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>City</label>
          <input
            type="text"
            value={settings.defaultShippingOrigin.city}
            onChange={(e) => handleShippingOriginChange('city', e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Zip Code</label>
          <input
            type="text"
            value={settings.defaultShippingOrigin.zipCode}
            onChange={(e) => handleShippingOriginChange('zipCode', e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Street (optional)</label>
          <input
            type="text"
            value={settings.defaultShippingOrigin.street}
            onChange={(e) => handleShippingOriginChange('street', e.target.value)}
            style={styles.input}
          />
        </div>
        <small style={styles.helper}>Used as origin for carrier shipping rates (if seller origin not set).</small>
      </div>

      {/* Save Button */}
      <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
        {saving ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '8px',
    marginTop: '24px',
    color: '#1a1a2e',
  },
  description: {
    color: '#6c757d',
    marginBottom: '24px',
    fontSize: '14px',
  },
  successAlert: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    border: '1px solid #c3e6cb',
  },
  errorAlert: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#333',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  helper: {
    fontSize: '12px',
    color: '#6c757d',
  },
  gatewayGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
    marginBottom: '32px',
    marginTop: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  saveButton: {
    padding: '10px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  nexusContainer: {
    marginTop: '8px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    padding: '12px',
    backgroundColor: '#f9f9f9',
  },
  nexusRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
    alignItems: 'center',
  },
  smallInput: {
    flex: '1 1 120px',
    padding: '6px 8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '13px',
  },
  addBtn: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '4px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginTop: '6px',
  },
  removeBtn: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default AdminSettings;