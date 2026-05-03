import React, { useState } from 'react';
import API from '../../services/api';

const GiftCardPurchase = () => {
  const [amount, setAmount] = useState(25);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [sendViaEmail, setSendViaEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/gift-cards/purchase', {
        amount,
        recipientEmail,
        recipientName,
        message,
        sendViaEmail,
      });
      setSuccess(res.data.giftCard);
      setAmount(25);
      setRecipientEmail('');
      setRecipientName('');
      setMessage('');
    } catch (err) {
      setError(err.response?.data?.error || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Purchase a Gift Card</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Amount ($)</label>
          <select value={amount} onChange={e => setAmount(parseFloat(e.target.value))}>
            <option value="10">$10</option>
            <option value="25">$25</option>
            <option value="50">$50</option>
            <option value="100">$100</option>
            <option value="200">$200</option>
          </select>
        </div>
        <div>
          <label>Recipient Email</label>
          <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} />
        </div>
        <div>
          <label>Recipient Name (optional)</label>
          <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
        </div>
        <div>
          <label>Personal Message</label>
          <textarea rows="3" value={message} onChange={e => setMessage(e.target.value)} />
        </div>
        <div>
          <label>
            <input type="checkbox" checked={sendViaEmail} onChange={e => setSendViaEmail(e.target.checked)} />
            Send gift card via email
          </label>
        </div>
        <button type="submit" disabled={loading}>Purchase Gift Card</button>
      </form>
      {success && (
        <div style={styles.success}>
          <p>Gift card purchased! Code: <strong>{success.code}</strong></p>
          <p>Sent to: {success.recipientEmail}</p>
        </div>
      )}
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
};

const styles = {
  container: { maxWidth: 500, margin: '0 auto', padding: 20 },
  success: { backgroundColor: '#d4edda', color: '#155724', padding: 10, marginTop: 20 },
  error: { backgroundColor: '#f8d7da', color: '#721c24', padding: 10, marginTop: 20 },
};

export default GiftCardPurchase;