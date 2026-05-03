// src/components/Admin/AdminOrders.js
import React, { useState, useEffect } from 'react';
import {
  getAdminOrders,
  updateAdminOrder,
  bulkOrdersAction,
  exportReport,
} from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import BulkActionBar from './BulkActionBar';

/**
 * AdminOrders Component
 *
 * Complete order management for admin:
 * - List all orders with pagination
 * - Filter by order status, payment status, date range
 * - Bulk actions: cancel, mark paid, mark shipped, mark delivered
 * - Export current filtered orders to CSV
 * - Individual: update order status, update payment status, edit tracking
 * - View order details link
 */
const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    paymentStatus: '',
    startDate: '',
    endDate: '',
  });
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingTracking, setEditingTracking] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.status) params.status = filters.status;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const response = await getAdminOrders(params);
      setOrders(response.data.orders);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Individual actions
  const handleStatusUpdate = async (orderId, newStatus) => {
    setActionLoading(orderId);
    try {
      await updateAdminOrder(orderId, { status: newStatus });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePaymentStatusUpdate = async (orderId, newPaymentStatus) => {
    setActionLoading(orderId);
    try {
      await updateAdminOrder(orderId, { paymentStatus: newPaymentStatus });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update payment status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTrackingUpdate = async (orderId, trackingNumber, carrier) => {
    setActionLoading(orderId);
    try {
      await updateAdminOrder(orderId, { trackingNumber, carrier });
      setEditingTracking(null);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update tracking');
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk actions
  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedOrders(orders.map((o) => o._id));
    else setSelectedOrders([]);
  };

  const handleSelectOne = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleBulkAction = async (action) => {
    if (!selectedOrders.length) return;
    setBulkLoading(true);
    try {
      await bulkOrdersAction(selectedOrders, action);
      setSelectedOrders([]);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportReport('orders');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    setSelectedOrders([]);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setFilters((prev) => ({ ...prev, page: newPage }));
    setSelectedOrders([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) return <LoadingSpinner message="Loading orders..." />;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div style={styles.container}>
      {/* Filters Bar */}
      <div style={styles.filtersBar}>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Order Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filters.paymentStatus}
          onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Payment Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          style={styles.dateInput}
          placeholder="Start Date"
        />
        <span style={styles.dateSeparator}>to</span>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          style={styles.dateInput}
          placeholder="End Date"
        />
        <button onClick={fetchOrders} style={styles.filterBtn}>Apply</button>
        <button onClick={handleExport} disabled={exporting} style={styles.exportBtn}>
          {exporting ? 'Exporting...' : '📥 Export CSV'}
        </button>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedOrders.length}
        onAction={handleBulkAction}
        onClear={() => setSelectedOrders([])}
        loading={bulkLoading}
        customActions={[
          { value: 'cancel', label: 'Cancel', color: '#dc3545' },
          { value: 'mark-paid', label: 'Mark Paid', color: '#28a745' },
          { value: 'mark-shipped', label: 'Mark Shipped', color: '#17a2b8' },
          { value: 'mark-delivered', label: 'Mark Delivered', color: '#007bff' },
        ]}
      />

      {/* Orders Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedOrders.length === orders.length && orders.length > 0}
                />
              </th>
              <th>Order #</th>
              <th>Buyer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Order Status</th>
              <th>Payment</th>
              <th>Tracking</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order._id)}
                    onChange={() => handleSelectOne(order._id)}
                  />
                </td>
                <td style={styles.orderNumber}>{order.orderNumber}</td>
                <td>
                  <div>{order.buyerId?.name || order.buyerInfo?.name || 'Guest'}</div>
                  <div style={styles.buyerEmail}>{order.buyerId?.email || order.buyerInfo?.email}</div>
                </td>
                <td>{formatDate(order.createdAt)}</td>
                <td style={styles.orderTotal}>${order.total.toFixed(2)}</td>
                <td>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                    disabled={actionLoading === order._id}
                    style={styles.statusSelect}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td>
                  <select
                    value={order.paymentStatus}
                    onChange={(e) => handlePaymentStatusUpdate(order._id, e.target.value)}
                    disabled={actionLoading === order._id}
                    style={styles.paymentSelect}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </td>
                <td>
                  {editingTracking === order._id ? (
                    <div style={styles.trackingEdit}>
                      <input
                        type="text"
                        placeholder="Tracking #"
                        defaultValue={order.trackingNumber || ''}
                        id={`tracking-${order._id}`}
                        style={styles.trackingInput}
                      />
                      <select
                        id={`carrier-${order._id}`}
                        defaultValue={order.carrier || 'usps'}
                        style={styles.carrierSelect}
                      >
                        <option value="usps">USPS</option>
                        <option value="fedex">FedEx</option>
                        <option value="ups">UPS</option>
                        <option value="dhl">DHL</option>
                        <option value="other">Other</option>
                      </select>
                      <button
                        onClick={() => {
                          const tracking = document.getElementById(`tracking-${order._id}`).value;
                          const carrier = document.getElementById(`carrier-${order._id}`).value;
                          handleTrackingUpdate(order._id, tracking, carrier);
                        }}
                        style={styles.saveTrackingBtn}
                      >
                        Save
                      </button>
                      <button onClick={() => setEditingTracking(null)} style={styles.cancelTrackingBtn}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={styles.trackingDisplay}>
                      <span>{order.trackingNumber || '—'}</span>
                      <button onClick={() => setEditingTracking(order._id)} style={styles.editTrackingBtn}>
                        ✏️
                      </button>
                    </div>
                  )}
                </td>
                <td>
                  <a
                    href={`/order/${order._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.viewLink}
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            style={styles.pageBtn}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>
            Page {pagination.page} of {pagination.pages} ({pagination.total} orders)
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            style={styles.pageBtn}
          >
            Next
          </button>
        </div>
      )}
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
  filtersBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
    alignItems: 'center',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
  },
  dateSeparator: {
    fontSize: '14px',
    color: '#666',
  },
  filterBtn: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  exportBtn: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0',
    fontWeight: '600',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #f0f0f0',
    verticalAlign: 'middle',
  },
  orderNumber: {
    fontWeight: '600',
  },
  buyerEmail: {
    fontSize: '11px',
    color: '#6c757d',
    marginTop: '2px',
  },
  orderTotal: {
    fontWeight: 'bold',
    color: '#28a745',
  },
  statusSelect: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ced4da',
    fontSize: '12px',
    cursor: 'pointer',
  },
  paymentSelect: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ced4da',
    fontSize: '12px',
    cursor: 'pointer',
  },
  trackingDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  editTrackingBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  },
  trackingEdit: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  trackingInput: {
    width: '110px',
    padding: '4px 6px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '12px',
  },
  carrierSelect: {
    padding: '4px 6px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '12px',
  },
  saveTrackingBtn: {
    padding: '4px 8px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  cancelTrackingBtn: {
    padding: '4px 8px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  viewLink: {
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '13px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  pageBtn: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#6c757d',
  },
};

export default AdminOrders;