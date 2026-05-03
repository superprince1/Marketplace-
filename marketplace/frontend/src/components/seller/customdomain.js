import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const CustomDomain = () => {
  const [domain, setDomain] = useState('');
  const [currentDomain, setCurrentDomain] = useState(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationMsg, setVerificationMsg] = useState('');
  const [token, setToken] = useState('');
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [feePrice, setFeePrice] = useState(0);
  const [domainPaid, setDomainPaid] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get shop details
      const shopRes = await API.get('/shop/my/shop');
      const shop = shopRes.data.shop;
      if (shop.customDomain) {
        setCurrentDomain(shop.customDomain);
        setVerified(shop.domainVerified);
      }
      setDomainPaid(shop.customDomainPaid || false);

      // Get platform settings (for custom domain fee)
      const settingsRes = await API.get('/admin/settings/general');
      const settings = settingsRes.data;
      setFeeEnabled(settings.enableCustomDomainFee || false);
      setFeePrice(settings.customDomainPrice || 19.99);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!window.confirm(`Purchase custom domain feature for $${feePrice}? This is a one‑time fee.`)) return;
    setLoading(true);
    try {
      await API.post('/shop/purchase-custom-domain');
      setDomainPaid(true);
      alert('Custom domain feature activated! You can now add your domain.');
    } catch (err) {
      alert(err.response?.data?.error || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!domain) return;
    setLoading(true);
    setVerificationMsg('');
    try {
      const res = await API.post('/shop/custom-domain', { domain });
      setCurrentDomain(domain);
      setVerified(false);
      setVerificationMsg(`Add this TXT record to your DNS: ${res.data.verificationDns}`);
      setToken(res.data.token);
    } catch (err) {
      if (err.response?.status === 402) {
        // Payment required – refresh data to show purchase button
        await fetchData();
        alert(err.response.data.error);
      } else {
        alert(err.response?.data?.error || 'Failed to add domain');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await API.post('/shop/verify-domain');
      if (res.data.verified) {
        setVerified(true);
        setVerificationMsg('Domain verified! Your shop is now accessible via your custom domain.');
      } else {
        setVerificationMsg(res.data.message || 'Verification failed. Check your DNS TXT record.');
      }
    } catch (err) {
      alert('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!window.confirm('Remove custom domain? Your shop will only be accessible via the default URL.')) return;
    setLoading(true);
    try {
      await API.delete('/shop/custom-domain');
      setCurrentDomain(null);
      setVerified(false);
      setVerificationMsg('');
    } catch (err) {
      alert('Failed to remove domain');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !currentDomain && !domainPaid) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h3>Custom Domain</h3>
      <p>Use your own domain name for your shop (e.g., <code>www.yourbrand.com</code>).</p>

      {feeEnabled && !domainPaid ? (
        <div style={styles.purchaseBox}>
          <p>Custom domain feature requires a one‑time fee of <strong>${feePrice.toFixed(2)}</strong>.</p>
          <button onClick={handlePurchase} disabled={loading} style={styles.purchaseBtn}>
            Purchase Now
          </button>
        </div>
      ) : currentDomain ? (
        <div>
          <p>Current domain: <strong>{currentDomain}</strong> {verified ? '✅ Verified' : '❌ Not verified'}</p>
          {!verified && (
            <>
              <p style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '8px', borderRadius: '4px' }}>
                {verificationMsg || 'Add the following TXT record to your DNS:'}
              </p>
              {!verificationMsg && <pre style={styles.pre}>_verify.{currentDomain} TXT "{token}"</pre>}
              <button onClick={handleVerify} disabled={loading} style={styles.verifyBtn}>Verify Domain</button>
            </>
          )}
          <button onClick={handleRemoveDomain} disabled={loading} style={styles.removeBtn}>Remove Domain</button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="yourdomain.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            style={styles.input}
          />
          <button onClick={handleAddDomain} disabled={loading} style={styles.addBtn}>Add Custom Domain</button>
        </div>
      )}

      {loading && <LoadingSpinner size="small" />}

      <p style={styles.info}>
        <strong>Instructions:</strong> After adding a domain, go to your domain registrar's DNS settings and add a <strong>CNAME record</strong> pointing to <code>cname.yourmarketplace.com</code> (or your server IP). Then add a <strong>TXT record</strong> for <code>_verify.yourdomain.com</code> with the verification code shown.
      </p>
    </div>
  );
};

const styles = {
  container: { padding: '20px', backgroundColor: '#fff', borderRadius: '8px', marginBottom: '20px' },
  input: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '300px', marginRight: '8px' },
  addBtn: { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  verifyBtn: { padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' },
  removeBtn: { padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  purchaseBtn: { padding: '8px 16px', backgroundColor: '#ffc107', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  pre: { backgroundColor: '#f4f4f4', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', margin: '8px 0' },
  info: { marginTop: '16px', fontSize: '13px', color: '#666' },
  purchaseBox: { backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' },
};

export default CustomDomain;