import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const AdminDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await API.get('/disputes/admin/all');
      setDisputes(res.data.disputes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resolveDispute = async (id, status, resolution, note, refundAmount) => {
    try {
      await API.put(`/disputes/admin/${id}`, { status, resolution, resolutionNote: note, refundAmount });
      alert('Dispute resolved');
      fetchDisputes();
      setSelected(null);
    } catch (err) {
      alert(err.response?.data?.error);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h2>Dispute Resolution</h2>
      <table style={styles.table}>
        <thead><tr><th>Order #</th><th>Buyer</th><th>Seller</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {disputes.map(d => (
            <tr key={d._id}>
              <td>{d.orderId?.orderNumber}</td>
              <td>{d.buyerId?.name} ({d.buyerId?.email})</td>
              <td>{d.sellerId?.name}</td>
              <td>{d.reason}</td>
              <td>{d.status}</td>
              <td><button onClick={() => setSelected(d)}>Review</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected && (
        <div style={styles.modal}>
          <h3>Dispute #{selected.orderId?.orderNumber}</h3>
          <p><strong>Reason:</strong> {selected.reason}</p>
          <p><strong>Description:</strong> {selected.description}</p>
          <div><strong>Evidence:</strong> {selected.evidence?.map((url,i) => <a key={i} href={url} target="_blank">View</a>)}</div>
          <select id="status" defaultValue={selected.status} style={styles.select}>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
          </select>
          <select id="resolution" style={styles.select}>
            <option value="refunded">Refunded</option>
            <option value="partial_refund">Partial Refund</option>
            <option value="rejected">Rejected</option>
            <option value="replacement">Replacement</option>
          </select>
          <input type="number" id="refundAmount" placeholder="Refund amount" />
          <textarea id="note" placeholder="Resolution notes" rows="3" />
          <button onClick={() => {
            const status = document.getElementById('status').value;
            const resolution = document.getElementById('resolution').value;
            const note = document.getElementById('note').value;
            const refundAmount = parseFloat(document.getElementById('refundAmount').value) || 0;
            resolveDispute(selected._id, status, resolution, note, refundAmount);
          }}>Resolve</button>
          <button onClick={() => setSelected(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '20px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'white', padding: '20px', zIndex: 1000, boxShadow: '0 0 10px rgba(0,0,0,0.3)' },
  select: { display: 'block', marginBottom: '10px' },
};

export default AdminDisputes;