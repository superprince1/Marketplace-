import React, { useState } from 'react';
import API from '../../services/api';

const RedeemGiftCard = ({ onSuccess }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await API.post('/gift-cards/redeem', { code });
      setMessage({ type: 'success', text: `Redeemed! New credit balance: $${res.data.newBalance}` });
      setCode('');
      if (onSuccess) onSuccess(res.data.newBalance);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Redeem failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Gift Card Code (XXXX-XXXX-XXXX-XXXX)"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
      />
      <button onClick={handleRedeem} disabled={loading}>Redeem</button>
      {message.text && <p style={{ color: message.type === 'success' ? 'green' : 'red' }}>{message.text}</p>}
    </div>
  );
};

export default RedeemGiftCard;