import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOrder, cancelOrder, updateOrderStatus } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';
import API from '../../services/api';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('usps');
  const [downloading, setDownloading] = useState(null); // store item index being downloaded

  // Dispute modal states
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState([]); // array of File objects
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeModalError, setDisputeModalError] = useState('');

  useEffect(() => {
    if (isAuthenticated) fetchOrder();
  }, [id, isAuthenticated]);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOrder(id);
      setOrder(response.data.order);
      if (response.data.order.trackingNumber) {
        setTrackingNumber(response.data.order.trackingNumber);
        setTrackingCarrier(response.data.order.carrier || 'usps');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setUpdating(true);
    try {
      await cancelOrder(id, 'Cancelled by customer');
      await fetchOrder();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await updateOrderStatus(id, newStatus);
      await fetchOrder();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddTracking = async () => {
    if (!trackingNumber.trim()) {
      alert('Please enter a tracking number');
      return;
    }
    setUpdating(true);
    try {
      await updateOrderStatus(id, order.status, trackingNumber, trackingCarrier);
      await fetchOrder();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add tracking');
    } finally {
      setUpdating(false);
    }
  };

  // Digital product download handler
  const handleDownload = async (itemIndex, item) => {
    setDownloading(itemIndex);
    try {
      // Step 1: Request download token
      const tokenRes = await API.post(`/digital/download/${id}/${itemIndex}`);
      const { token, expiresAt, maxDownloads, remaining, files, licenseKey } = tokenRes.data;

      if (!files || files.length === 0) {
        alert('No downloadable files found for this product.');
        return;
      }

      // Step 2: Use token to get actual file URL (or redirect to signed URL)
      const fileRes = await API.get(`/digital/file/${token}`);
      if (fileRes.data.downloadUrl) {
        window.open(fileRes.data.downloadUrl, '_blank');
      } else {
        alert('Download link not available');
      }

      // Show license key if provided
      if (fileRes.data.licenseKey) {
        alert(`Your license key: ${fileRes.data.licenseKey}\nPlease save it for future reference.`);
      } else if (licenseKey) {
        alert(`Your license key: ${licenseKey}\nPlease save it for future reference.`);
      }

      // Refresh order to update download count (if needed)
      await fetchOrder();
    } catch (err) {
      const msg = err.response?.data?.error || 'Download failed. Please try again later.';
      alert(msg);
    } finally {
      setDownloading(null);
    }
  };

  // ----- Dispute modal handlers -----
  const resetDisputeForm = () => {
    setDisputeReason('');
    setDisputeDesc('');
    setDisputeEvidence([]);
    setDisputeModalError('');
  };

  const handleOpenDispute = () => {
    if (!order || !user) return;
    // Optional: check if order is eligible (paid, not cancelled, not already disputed)
    if (order.paymentStatus !== 'paid' || order.status === 'cancelled') {
      alert('You can only open a dispute for paid and non-cancelled orders.');
      return;
    }
    resetDisputeForm();
    setShowDisputeModal(true);
  };

  const handleEvidenceChange = (e) => {
    const files = Array.from(e.target.files);
    // Limit total files to 5 and total size to 10MB
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (files.length > 5) {
      setDisputeModalError('You can upload at most 5 files.');
      return;
    }
    if (totalSize > 10 * 1024 * 1024) {
      setDisputeModalError('Total file size cannot exceed 10MB.');
      return;
    }
    setDisputeEvidence(prev => [...prev, ...files]);
    setDisputeModalError('');
  };

  const removeEvidenceFile = (index) => {
    setDisputeEvidence(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDispute = async () => {
    // Validate fields
    if (!disputeReason.trim()) {
      setDisputeModalError('Please select a reason for the dispute.');
      return;
    }
    if (!disputeDesc.trim()) {
      setDisputeModalError('Please provide a detailed description.');
      return;
    }
    if (disputeDesc.length < 20) {
      setDisputeModalError('Description must be at least 20 characters.');
      return;
    }

    setSubmittingDispute(true);
    setDisputeModalError('');

    try {
      const formData = new FormData();
      formData.append('orderId', order._id);
      formData.append('reason', disputeReason);
      formData.append('description', disputeDesc);
      // Append each evidence file
      disputeEvidence.forEach((file, idx) => {
        formData.append('evidence', file);
      });

      // Note: API.post automatically sets Content-Type for FormData
      await API.post('/disputes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Dispute opened successfully. An administrator will review your case.');
      setShowDisputeModal(false);
      resetDisputeForm();
      // Optionally refresh order to show dispute status (if backend returns it)
      await fetchOrder();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to open dispute. Please try again later.';
      setDisputeModalError(errorMsg);
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleCloseDisputeModal = () => {
    setShowDisputeModal(false);
    resetDisputeForm();
  };

  // ------------------------------------------------------------

  const renderVariations = (selectedVariations) => {
    if (!selectedVariations || Object.keys(selectedVariations).length === 0) return null;
    return (
      <div style={styles.variationContainer}>
        {Object.entries(selectedVariations).map(([key, value]) => (
          <span key={key} style={styles.variationBadge}>
            {key}: {value}
          </span>
        ))}
      </div>
    );
  };

  const renderDigitalStatus = (item) => {
    // If product is digital, we need to know if the user has valid token
    // We can check if item.downloadTokens exists and is not expired
    const tokenDoc = item.downloadTokens?.find(t => t.expiresAt > new Date());
    const remainingDownloads = tokenDoc ? tokenDoc.maxDownloads - tokenDoc.downloadCount : (item.maxDownloads || 3);
    const isExpired = tokenDoc ? tokenDoc.expiresAt < new Date() : false;
    const hasValidToken = tokenDoc && tokenDoc.downloadCount < tokenDoc.maxDownloads && !isExpired;

    if (!item.productId?.isDigital && !item.isDigital) return null;

    return (
      <div style={styles.digitalInfo}>
        {order.paymentStatus === 'paid' && order.status !== 'cancelled' ? (
          hasValidToken ? (
            <div>
              <span style={styles.downloadRemaining}>Downloads left: {remainingDownloads}</span>
              <button
                onClick={() => handleDownload(order.items.indexOf(item), item)}
                disabled={downloading === order.items.indexOf(item)}
                style={styles.downloadBtn}
              >
                {downloading === order.items.indexOf(item) ? 'Preparing...' : '📥 Download'}
              </button>
            </div>
          ) : isExpired ? (
            <span style={styles.expired}>Download link expired</span>
          ) : (
            <button
              onClick={() => handleDownload(order.items.indexOf(item), item)}
              disabled={downloading === order.items.indexOf(item)}
              style={styles.downloadBtn}
            >
              {downloading === order.items.indexOf(item) ? 'Preparing...' : '📥 Download'}
            </button>
          )
        ) : (
          <span style={styles.notPaid}>Available after payment</span>
        )}
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const stylesMap = {
      pending: { bg: '#ffc107', color: '#333', text: 'Pending' },
      processing: { bg: '#17a2b8', color: 'white', text: 'Processing' },
      shipped: { bg: '#007bff', color: 'white', text: 'Shipped' },
      delivered: { bg: '#28a745', color: 'white', text: 'Delivered' },
      cancelled: { bg: '#dc3545', color: 'white', text: 'Cancelled' },
    };
    const s = stylesMap[status] || stylesMap.pending;
    return <span style={{ backgroundColor: s.bg, color: s.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>{s.text}</span>;
  };

  const getPaymentStatusBadge = (status) => {
    const stylesMap = {
      pending: { bg: '#ffc107', color: '#333', text: 'Pending' },
      paid: { bg: '#28a745', color: 'white', text: 'Paid' },
      failed: { bg: '#dc3545', color: 'white', text: 'Failed' },
      refunded: { bg: '#6c757d', color: 'white', text: 'Refunded' },
    };
    const s = stylesMap[status] || stylesMap.pending;
    return <span style={{ backgroundColor: s.bg, color: s.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>{s.text}</span>;
  };

  const canCancel = () => {
    if (!order) return false;
    return ['pending', 'processing'].includes(order.status) && order.paymentStatus !== 'paid';
  };

  const canUpdateStatus = () => {
    if (!order || !user) return false;
    const isSeller = order.items.some(item => item.sellerId === user.id);
    return isSeller && order.status !== 'cancelled' && order.status !== 'delivered';
  };

  const canOpenDispute = () => {
    if (!order || !user) return false;
    const isBuyer = order.buyerId?._id === user.id;
    // Only buyer, order is paid, not cancelled, not already disputed (if you have a flag)
    // For simplicity we assume no existing dispute flag, but you can add order.disputeExists check
    return isBuyer && order.paymentStatus === 'paid' && order.status !== 'cancelled';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) return <LoadingSpinner message="Loading order details..." />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!order) return <div className="alert alert-warning">Order not found</div>;

  const isBuyer = user && order.buyerId?._id === user.id;
  const isSellerView = user && order.items.some(item => item.sellerId === user.id);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>
        <h1 style={styles.title}>Order Details</h1>
        <div style={styles.headerRight}>
          {canCancel() && (
            <button onClick={handleCancelOrder} disabled={updating} style={styles.cancelBtn}>
              Cancel Order
            </button>
          )}
          {canOpenDispute() && (
            <button onClick={handleOpenDispute} style={styles.disputeBtn}>
              ⚖️ Open Dispute
            </button>
          )}
          <button onClick={() => window.print()} style={styles.printBtn}>🖨️ Print</button>
        </div>
      </div>

      {/* Order Summary */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2>Order #{order.orderNumber}</h2>
            <p style={styles.date}>Placed on {formatDate(order.createdAt)}</p>
          </div>
          <div style={styles.badgeGroup}>
            {getStatusBadge(order.status)}
            {getPaymentStatusBadge(order.paymentStatus)}
          </div>
        </div>
        <div style={styles.summaryGrid}>
          <div><h4>Order Total</h4><p style={styles.total}>${order.total.toFixed(2)}</p></div>
          <div><h4>Payment Method</h4><p>{order.paymentMethod?.replace('_', ' ').toUpperCase()}</p></div>
          <div><h4>Items</h4><p>{order.items.reduce((sum, i) => sum + i.quantity, 0)} products</p></div>
        </div>
      </div>

      {/* Two column: Address & Tracking */}
      <div style={styles.twoColumn}>
        <div style={styles.card}>
          <h3>Shipping Address</h3>
          <p>
            {order.shippingAddress.street}<br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
            {order.shippingAddress.country}
          </p>
          {order.shippingAddress.instructions && <p><strong>Instructions:</strong> {order.shippingAddress.instructions}</p>}
        </div>
        <div style={styles.card}>
          <h3>Tracking Information</h3>
          {order.trackingNumber ? (
            <>
              <p><strong>Tracking Number:</strong> {order.trackingNumber}</p>
              <p><strong>Carrier:</strong> {order.carrier?.toUpperCase()}</p>
              <p><strong>Status:</strong> {order.status === 'delivered' ? 'Delivered' : 'In transit'}</p>
            </>
          ) : (
            <p>No tracking information yet.</p>
          )}
          {canUpdateStatus() && (
            <div style={styles.trackingForm}>
              <input type="text" placeholder="Tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} style={styles.input} />
              <select value={trackingCarrier} onChange={(e) => setTrackingCarrier(e.target.value)} style={styles.select}>
                <option value="usps">USPS</option>
                <option value="fedex">FedEx</option>
                <option value="ups">UPS</option>
                <option value="dhl">DHL</option>
                <option value="other">Other</option>
              </select>
              <button onClick={handleAddTracking} disabled={updating} style={styles.trackingBtn}>
                {order.trackingNumber ? 'Update Tracking' : 'Add Tracking'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Order Items Table */}
      <div style={styles.card}>
        <h3>Order Items</h3>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr><th>Product</th><th>Price</th><th>Quantity</th><th>Total</th><th>Digital</th></tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={styles.productCell}>
                      <img src={item.imageUrl || 'https://via.placeholder.com/60'} alt={item.name} style={styles.productImage} />
                      <div>
                        <Link to={`/product/${item.productId}`} style={styles.productLink}>{item.name}</Link>
                        {renderVariations(item.selectedVariations)}
                        {item.sku && <div style={styles.sku}>SKU: {item.sku}</div>}
                      </div>
                    </div>
                  </td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>{item.quantity}</td>
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
                  <td style={styles.digitalCell}>
                    {renderDigitalStatus(item)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan="4" style={styles.tfootRight}>Subtotal</td><td>${order.subtotal.toFixed(2)}</td></tr>
              <tr><td colSpan="4" style={styles.tfootRight}>Shipping</td><td>${order.shippingCost.toFixed(2)}</td></tr>
              <tr><td colSpan="4" style={styles.tfootRight}>Tax</td><td>${order.tax.toFixed(2)}</td></tr>
              <tr><td colSpan="4" style={styles.tfootRight}><strong>Total</strong></td><td><strong>${order.total.toFixed(2)}</strong></td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Order Timeline */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div style={styles.card}>
          <h3>Order Timeline</h3>
          <div style={styles.timeline}>
            {order.statusHistory.map((event, idx) => (
              <div key={idx} style={styles.timelineItem}>
                <div style={styles.timelineDot}></div>
                <div style={styles.timelineContent}>
                  <strong>{event.status.charAt(0).toUpperCase() + event.status.slice(1)}</strong>
                  <p>{event.note || `Order ${event.status}`}</p>
                  <small>{formatDate(event.timestamp)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seller Actions */}
      {canUpdateStatus() && (
        <div style={styles.card}>
          <h3>Update Order Status</h3>
          <div style={styles.statusActions}>
            <button onClick={() => handleUpdateStatus('processing')} disabled={order.status !== 'pending'} style={styles.statusBtn}>Mark as Processing</button>
            <button onClick={() => handleUpdateStatus('shipped')} disabled={order.status !== 'processing'} style={styles.statusBtn}>Mark as Shipped</button>
            <button onClick={() => handleUpdateStatus('delivered')} disabled={order.status !== 'shipped'} style={styles.statusBtn}>Mark as Delivered</button>
          </div>
        </div>
      )}

          {/* ------ Dispute Modal (Overlay) ------ */}
      {showDisputeModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Open a Dispute</h3>
            <button onClick={handleCloseDisputeModal} style={styles.modalCloseBtn}>×</button>

            {disputeModalError && (
              <div style={styles.errorMsg}>{disputeModalError}</div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Reason for dispute *</label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                style={styles.selectFull}
                required
              >
                <option value="">Select a reason</option>
                <option value="not_received">Item not received</option>
                <option value="wrong_item">Wrong item received</option>
                <option value="damaged">Item damaged or defective</option>
                <option value="not_as_described">Not as described</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Detailed description *</label>
              <textarea
                rows="4"
                value={disputeDesc}
                onChange={(e) => setDisputeDesc(e.target.value)}
                style={styles.textarea}
                placeholder="Please provide as much detail as possible (minimum 20 characters)..."
              />
              <small style={styles.charCounter}>{disputeDesc.length}/5000</small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Evidence (optional, up to 5 files, max 10MB total)</label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.txt"
                onChange={handleEvidenceChange}
                style={styles.fileInput}
              />
              {disputeEvidence.length > 0 && (
                <div style={styles.fileList}>
                  {disputeEvidence.map((file, idx) => (
                    <div key={idx} style={styles.fileItem}>
                      <span>{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                      <button type="button" onClick={() => removeEvidenceFile(idx)} style={styles.removeFileBtn}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.modalActions}>
              <button onClick={handleCloseDisputeModal} style={styles.modalCancelBtn} disabled={submittingDispute}>
                Cancel
              </button>
              <button onClick={handleSubmitDispute} style={styles.modalSubmitBtn} disabled={submittingDispute}>
                {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '1000px', margin: '0 auto', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  backBtn: { padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  title: { fontSize: '24px', fontWeight: '600', margin: 0 },
  headerRight: { display: 'flex', gap: '12px' },
  cancelBtn: { padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  disputeBtn: { padding: '8px 16px', backgroundColor: '#fd7e14', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  printBtn: { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  card: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px', marginBottom: '20px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' },
  date: { color: '#666', fontSize: '14px', marginTop: '4px' },
  badgeGroup: { display: 'flex', gap: '8px' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '16px' },
  total: { fontSize: '24px', fontWeight: 'bold', color: '#28a745' },
  twoColumn: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
  trackingForm: { marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' },
  input: { flex: 2, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' },
  select: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px' },
  trackingBtn: { padding: '8px 16px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  productCell: { display: 'flex', gap: '12px', alignItems: 'center' },
  productImage: { width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' },
  productLink: { color: '#007bff', textDecoration: 'none' },
  variationContainer: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', marginBottom: '4px' },
  variationBadge: { backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '12px', fontSize: '11px', color: '#495057' },
  sku: { fontSize: '11px', color: '#999' },
  digitalCell: { verticalAlign: 'middle' },
  digitalInfo: { display: 'flex', flexDirection: 'column', gap: '6px' },
  downloadBtn: { padding: '4px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  downloadRemaining: { fontSize: '11px', color: '#28a745' },
  expired: { fontSize: '11px', color: '#dc3545' },
  notPaid: { fontSize: '11px', color: '#ffc107' },
  tfootRight: { textAlign: 'right' },
  timeline: { marginTop: '16px' },
  timelineItem: { display: 'flex', gap: '16px', marginBottom: '16px', position: 'relative' },
  timelineDot: { width: '12px', height: '12px', backgroundColor: '#007bff', borderRadius: '50%', marginTop: '4px' },
  timelineContent: { flex: 1 },
  statusActions: { display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' },
  statusBtn: { padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  // Dispute modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '550px',
    width: '90%',
    padding: '24px',
    position: 'relative',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: { marginTop: 0, marginBottom: '20px', fontSize: '22px' },
  modalCloseBtn: {
    position: 'absolute',
    top: '12px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
  },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', fontWeight: '500', marginBottom: '8px' },
  selectFull: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' },
  textarea: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'inherit' },
  charCounter: { display: 'block', textAlign: 'right', fontSize: '12px', color: '#666' },
  fileInput: { marginTop: '5px' },
  fileList: { marginTop: '10px', maxHeight: '120px', overflowY: 'auto', border: '1px solid #eee', padding: '8px', borderRadius: '6px' },
  fileItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '13px' },
  removeFileBtn: { background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' },
  modalCancelBtn: { padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  modalSubmitBtn: { padding: '8px 16px', backgroundColor: '#fd7e14', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  errorMsg: { backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' },
};

export default OrderDetail;