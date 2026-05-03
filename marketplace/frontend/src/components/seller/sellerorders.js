import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

/**
 * SellerOrders Component - Displays orders containing seller's products
 * Features:
 * - List all orders with seller's items
 * - Filter by order status (pending, processing, shipped, delivered, cancelled)
 * - Update order status (dropdown for each order)
 * - Add tracking number and carrier
 * - View order details (expandable/collapsible)
 * - Order item details (only seller's items)
 * - Pagination
 * - Loading and empty states
 */
const SellerOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [updatingTracking, setUpdatingTracking] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user && user.role === 'seller') {
      fetchOrders();
    }
  }, [user, statusFilter, currentPage]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 10 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await API.get('/orders/seller/orders', { params });
      setOrders(response.data.orders || []);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching seller orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingStatus(orderId);
    try {
      await API.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleAddTracking = async (orderId) => {
    const trackingNumber = prompt('Enter tracking number:');
    if (!trackingNumber) return;
    const carrier = prompt('Carrier (usps/fedex/ups/dhl/other):', 'usps');
    if (!carrier) return;
    
    setUpdatingTracking(orderId);
    try {
      await API.post(`/orders/${orderId}/tracking`, { trackingNumber, carrier });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add tracking');
    } finally {
      setUpdatingTracking(null);
    }
  };

  const toggleExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const getStatusBadgeStyle = (status) => {
    const styles = {
      pending: { backgroundColor: '#ffc107', color: '#333' },
      processing: { backgroundColor: '#17a2b8', color: 'white' },
      shipped: { backgroundColor: '#007bff', color: 'white' },
      delivered: { backgroundColor: '#28a745', color: 'white' },
      cancelled: { backgroundColor: '#dc3545', color: 'white' }
    };
    return styles[status] || styles.pending;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>📋</div>
        <h3>No orders yet</h3>
        <p>When customers order your products, they will appear here.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Filter Tabs */}
      <div style={styles.filterTabs}>
        {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setCurrentPage(1);
            }}
            style={{
              ...styles.filterTab,
              ...(statusFilter === status ? styles.filterTabActive : {})
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {orders.map(order => (
        <div key={order._id} style={styles.orderCard}>
          {/* Order Header */}
          <div style={styles.orderHeader}>
            <div style={styles.orderInfo}>
              <div style={styles.orderNumber}>Order #{order.orderNumber}</div>
              <div style={styles.orderDate}>{formatDate(order.createdAt)}</div>
              <div style={styles.orderBuyer}>Buyer: {order.buyerId?.name || order.buyerInfo?.name || 'Guest'}</div>
            </div>
            <div style={styles.orderStatus}>
              <select
                value={order.status}
                onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                disabled={updatingStatus === order._id}
                style={{
                  ...styles.statusSelect,
                  ...getStatusBadgeStyle(order.status),
                  color: getStatusBadgeStyle(order.status).color,
                  backgroundColor: getStatusBadgeStyle(order.status).backgroundColor
                }}
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {updatingStatus === order._id && <span style={styles.smallSpinner}></span>}
            </div>
          </div>

          {/* Order Items Summary */}
          <div style={styles.orderSummary}>
            <div style={styles.itemsPreview}>
              {order.items.slice(0, 2).map((item, idx) => (
                <div key={idx} style={styles.previewItem}>
                  <img src={item.imageUrl || 'https://via.placeholder.com/40'} alt="" style={styles.previewImage} />
                  <div>
                    <div>{item.name}</div>
                    <div style={styles.itemMeta}>{item.quantity} × ${item.price.toFixed(2)}</div>
                  </div>
                </div>
              ))}
              {order.items.length > 2 && (
                <div style={styles.moreItems}>+{order.items.length - 2} more items</div>
              )}
            </div>
            <div style={styles.orderTotal}>
              <span>Subtotal: ${order.sellerSubtotal?.toFixed(2) || order.items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <button onClick={() => toggleExpand(order._id)} style={styles.expandBtn}>
            {expandedOrder === order._id ? '▼ Hide Details' : '▶ View Details'}
          </button>

          {/* Expanded Details */}
          {expandedOrder === order._id && (
            <div style={styles.expandedDetails}>
              <div style={styles.detailsSection}>
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> {order.buyerId?.name || order.buyerInfo?.name}</p>
                <p><strong>Email:</strong> {order.buyerId?.email || order.buyerInfo?.email}</p>
                {order.buyerInfo?.phone && <p><strong>Phone:</strong> {order.buyerInfo.phone}</p>}
                <h4>Shipping Address</h4>
                <p>
                  {order.shippingAddress.street}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
                  {order.shippingAddress.country}
                </p>
                {order.shippingAddress.instructions && (
                  <p><strong>Delivery Instructions:</strong> {order.shippingAddress.instructions}</p>
                )}
              </div>

              <div style={styles.detailsSection}>
                <h4>All Items (Seller's Items)</h4>
                {order.items.map((item, idx) => (
                  <div key={idx} style={styles.detailItem}>
                    <img src={item.imageUrl || 'https://via.placeholder.com/50'} alt="" style={styles.detailImage} />
                    <div style={styles.detailInfo}>
                      <div><strong>{item.name}</strong></div>
                      <div>SKU: {item.sku || 'N/A'}</div>
                      <div>Quantity: {item.quantity} × ${item.price.toFixed(2)} = ${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                <div style={styles.detailTotal}>
                  <strong>Total (Seller's share):</strong> ${order.items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)}
                </div>
              </div>

              <div style={styles.detailsSection}>
                <h4>Tracking Information</h4>
                {order.trackingNumber ? (
                  <p>
                    <strong>Tracking #:</strong> {order.trackingNumber}<br />
                    <strong>Carrier:</strong> {order.carrier?.toUpperCase() || 'N/A'}
                  </p>
                ) : (
                  <p>No tracking information yet.</p>
                )}
                <button
                  onClick={() => handleAddTracking(order._id)}
                  disabled={updatingTracking === order._id}
                  style={styles.trackingBtn}
                >
                  {updatingTracking === order._id ? 'Adding...' : (order.trackingNumber ? 'Update Tracking' : 'Add Tracking')}
                </button>
                {order.buyerNotes && (
                  <>
                    <h4>Buyer Notes</h4>
                    <p style={styles.buyerNotes}>{order.buyerNotes}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={styles.pageBtn}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>Page {currentPage} of {pagination.pages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
            disabled={currentPage === pagination.pages}
            style={styles.pageBtn}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

// ========== STYLES ==========
const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px'
  },
  filterTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: '12px'
  },
  filterTab: {
    padding: '6px 14px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #ddd',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s'
  },
  filterTabActive: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff'
  },
  orderCard: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '16px',
    padding: '16px',
    transition: 'box-shadow 0.2s'
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '12px'
  },
  orderInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  orderNumber: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  orderDate: {
    fontSize: '12px',
    color: '#666'
  },
  orderBuyer: {
    fontSize: '13px',
    color: '#555'
  },
  orderStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statusSelect: {
    padding: '4px 8px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  orderSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    padding: '12px 0',
    borderTop: '1px solid #f0f0f0',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: '12px'
  },
  itemsPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  previewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px'
  },
  previewImage: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px'
  },
  itemMeta: {
    fontSize: '11px',
    color: '#666'
  },
  moreItems: {
    fontSize: '12px',
    color: '#007bff'
  },
  orderTotal: {
    fontSize: '14px',
    fontWeight: '500'
  },
  expandBtn: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '4px 0'
  },
  expandedDetails: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e0e0e0',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  detailsSection: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '6px'
  },
  detailItem: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e0e0e0'
  },
  detailImage: {
    width: '50px',
    height: '50px',
    objectFit: 'cover',
    borderRadius: '4px'
  },
  detailInfo: {
    flex: 1,
    fontSize: '13px'
  },
  detailTotal: {
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px solid #ddd',
    textAlign: 'right'
  },
  trackingBtn: {
    marginTop: '8px',
    padding: '4px 12px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  buyerNotes: {
    backgroundColor: '#fff3cd',
    padding: '8px',
    borderRadius: '4px',
    marginTop: '8px',
    fontSize: '13px'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '40px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  },
  smallSpinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite'
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px'
  },
  pageBtn: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  pageInfo: {
    fontSize: '14px',
    color: '#666'
  }
};

// Add keyframe for spinner
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default SellerOrders;