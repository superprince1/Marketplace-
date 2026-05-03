import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrders } from '../../services/api';
import SkeletonOrderCard from '../UI/SkeletonOrderCard'; // ✅ Skeleton loader

/**
 * OrderHistory Component – Displays user's order history
 * Now shows product variations (size, color, material) if present
 * Uses skeleton loading for better perceived performance
 */
const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ page: 1, limit: 10, status: '' });
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: filters.page, limit: filters.limit };
      if (filters.status) params.status = filters.status;
      const response = await getMyOrders(params);
      setOrders(response.data.orders);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancellingId(orderId);
    try {
      const { cancelOrder } = await import('../../services/api');
      await cancelOrder(orderId, 'Cancelled by customer');
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusFilter = (status) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  // Helper to render variation badges
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

  const getStatusBadge = (status) => {
    const stylesMap = {
      pending: { backgroundColor: '#ffc107', color: '#333' },
      processing: { backgroundColor: '#17a2b8', color: 'white' },
      shipped: { backgroundColor: '#007bff', color: 'white' },
      delivered: { backgroundColor: '#28a745', color: 'white' },
      cancelled: { backgroundColor: '#dc3545', color: 'white' },
    };
    const s = stylesMap[status] || stylesMap.pending;
    return <span style={{ ...styles.statusBadge, backgroundColor: s.backgroundColor, color: s.color }}>{status.toUpperCase()}</span>;
  };

  const canCancel = (status) => ['pending', 'processing'].includes(status);

  // Show skeletons while loading
  if (loading) {
    return (
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>My Orders</h1>
        <div style={styles.filterTabs}>
          {['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
            <button key={status || 'all'} style={styles.filterTab} disabled>
              {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
            </button>
          ))}
        </div>
        {[...Array(3)].map((_, i) => <SkeletonOrderCard key={i} />)}
      </div>
    );
  }

  if (error) return <div className="alert alert-danger">{error}</div>;

  if (orders.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>📦</div>
        <h3>No orders yet</h3>
        <p>You haven't placed any orders yet.</p>
        <Link to="/" style={styles.shopNowBtn}>Start Shopping</Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>My Orders</h1>

      {/* Status filter tabs */}
      <div style={styles.filterTabs}>
        {['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
          <button
            key={status || 'all'}
            onClick={() => handleStatusFilter(status)}
            style={{
              ...styles.filterTab,
              ...(filters.status === status ? styles.filterTabActive : {}),
            }}
          >
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {orders.map(order => (
        <div key={order._id} style={styles.orderCard}>
          {/* Header */}
          <div style={styles.orderHeader}>
            <div>
              <div style={styles.orderNumber}>Order #{order.orderNumber}</div>
              <div style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</div>
            </div>
            <div style={styles.orderStatusGroup}>
              {getStatusBadge(order.status)}
              <span style={styles.orderTotal}>${order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Items */}
          <div style={styles.orderItems}>
            {order.items.slice(0, 3).map((item, idx) => (
              <div key={idx} style={styles.orderItem}>
                <img
                  src={item.imageUrl || 'https://via.placeholder.com/60'}
                  alt={item.name}
                  style={styles.itemImage}
                />
                <div style={styles.itemDetails}>
                  <div style={styles.itemName}>{item.name}</div>
                  {renderVariations(item.selectedVariations)}
                  <div style={styles.itemMeta}>
                    {item.quantity} × ${item.price.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
            {order.items.length > 3 && (
              <div style={styles.moreItems}>+{order.items.length - 3} more item(s)</div>
            )}
          </div>

          {/* Footer actions */}
          <div style={styles.orderFooter}>
            <Link to={`/order/${order._id}`} style={styles.viewDetailsBtn}>View Details →</Link>
            {canCancel(order.status) && order.paymentStatus !== 'paid' && (
              <button
                onClick={() => handleCancelOrder(order._id)}
                disabled={cancellingId === order._id}
                style={styles.cancelBtn}
              >
                {cancellingId === order._id ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
            {order.status === 'shipped' && order.trackingNumber && (
              <span style={styles.trackingInfo}>📦 Tracking: {order.trackingNumber}</span>
            )}
          </div>
        </div>
      ))}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            style={styles.pageBtn}
          >
            ← Previous
          </button>
          <span style={styles.pageInfo}>Page {pagination.page} of {pagination.pages}</span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            style={styles.pageBtn}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '1000px', margin: '0 auto', padding: '20px' },
  pageTitle: { fontSize: '28px', fontWeight: '600', marginBottom: '24px' },
  filterTabs: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e0e0e0', paddingBottom: '12px' },
  filterTab: { padding: '8px 16px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '20px', cursor: 'pointer', fontSize: '14px' },
  filterTabActive: { backgroundColor: '#007bff', color: 'white', borderColor: '#007bff' },
  orderCard: { backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', overflow: 'hidden' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap', gap: '12px' },
  orderNumber: { fontSize: '16px', fontWeight: '600', color: '#333' },
  orderDate: { fontSize: '13px', color: '#666', marginTop: '4px' },
  orderStatusGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  statusBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  orderTotal: { fontSize: '18px', fontWeight: 'bold', color: '#28a745' },
  orderItems: { padding: '16px 20px', borderBottom: '1px solid #f0f0f0' },
  orderItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' },
  itemImage: { width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' },
  itemDetails: { flex: 1 },
  itemName: { fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '4px' },
  variationContainer: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' },
  variationBadge: { backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '12px', fontSize: '11px', color: '#495057' },
  itemMeta: { fontSize: '13px', color: '#666' },
  moreItems: { fontSize: '13px', color: '#007bff', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e0e0e0' },
  orderFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', flexWrap: 'wrap', gap: '12px' },
  viewDetailsBtn: { color: '#007bff', textDecoration: 'none', fontSize: '14px', fontWeight: '500' },
  cancelBtn: { padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  trackingInfo: { fontSize: '13px', color: '#28a745' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' },
  pageBtn: { padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  pageInfo: { fontSize: '14px', color: '#666' },
  emptyContainer: { textAlign: 'center', padding: '60px 20px' },
  emptyIcon: { fontSize: '64px', marginBottom: '16px' },
  shopNowBtn: { display: 'inline-block', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' },
};

export default OrderHistory;