// src/components/Admin/AdminLogs.js
import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

/**
 * AdminLogs Component
 * 
 * Display admin activity logs.
 * 
 * Features:
 * - Paginated list of admin actions
 * - Filter by action type
 * - Date range filter (optional)
 * - Human-readable timestamps
 * - Shows admin name, action, target, details, IP
 * 
 * Note: Backend endpoint `/api/admin/logs` must be implemented to return real data.
 *       This component includes a mock data fallback for development.
 */
const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ page: 1, limit: 50, action: '', startDate: '', endDate: '' });

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'UPDATE_USER', label: 'Update User' },
    { value: 'DELETE_USER', label: 'Delete User' },
    { value: 'UPDATE_PRODUCT', label: 'Update Product' },
    { value: 'DELETE_PRODUCT', label: 'Delete Product' },
    { value: 'UPDATE_ORDER', label: 'Update Order' },
    { value: 'BULK_USERS_ACTIVATE', label: 'Bulk Activate Users' },
    { value: 'BULK_USERS_DEACTIVATE', label: 'Bulk Deactivate Users' },
    { value: 'BULK_USERS_DELETE', label: 'Bulk Delete Users' },
    { value: 'BULK_PRODUCTS_FEATURE', label: 'Bulk Feature Products' },
    { value: 'BULK_ORDERS_CANCEL', label: 'Bulk Cancel Orders' },
    { value: 'UPDATE_SETTINGS', label: 'Update Settings' },
    { value: 'SEND_NOTIFICATION', label: 'Send Notification' },
  ];

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query parameters
      const params = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.action) params.action = filters.action;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      // Attempt to fetch from real backend endpoint
      const response = await API.get('/admin/logs', { params });
      setLogs(response.data.logs);
      setPagination({
        page: response.data.page,
        pages: response.data.pages,
        total: response.data.total,
      });
    } catch (err) {
      // If endpoint is not implemented (404) or any error, use mock data for demonstration
      if (err.response?.status === 404 || err.message.includes('404')) {
        console.warn('Admin logs endpoint not implemented. Using mock data.');
        const mockData = generateMockLogs();
        setLogs(mockData.logs);
        setPagination({
          page: filters.page,
          pages: 3,
          total: 87,
        });
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load logs');
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate mock logs for development (remove when backend endpoint is ready)
  const generateMockLogs = () => {
    const actions = ['UPDATE_USER', 'DELETE_PRODUCT', 'UPDATE_ORDER', 'BULK_USERS_ACTIVATE', 'UPDATE_SETTINGS'];
    const names = ['Admin User', 'Super Admin', 'System', 'Support Agent'];
    const mockLogs = [];
    for (let i = 0; i < 15; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      mockLogs.push({
        _id: `mock_${i}`,
        adminName: names[Math.floor(Math.random() * names.length)],
        adminId: `admin_${Math.floor(Math.random() * 100)}`,
        action,
        targetType: action.includes('USER') ? 'User' : (action.includes('PRODUCT') ? 'Product' : 'Order'),
        details: { itemId: `item_${i}`, oldValue: 'old', newValue: 'new' },
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 3600000).toISOString(),
      });
    }
    return { logs: mockLogs };
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) return <LoadingSpinner message="Loading activity logs..." />;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.filters}>
        <select
          value={filters.action}
          onChange={(e) => handleFilterChange('action', e.target.value)}
          style={styles.filterSelect}
        >
          {actionOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          style={styles.dateInput}
          placeholder="Start Date"
        />
        <span style={styles.dateSeparator}>—</span>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          style={styles.dateInput}
          placeholder="End Date"
        />
        <button onClick={fetchLogs} style={styles.filterBtn}>Apply</button>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Admin</th>
              <th>Action</th>
              <th>Target Type</th>
              <th>Details</th>
              <th>IP Address</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan="6" style={styles.noData}>No logs found</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log._id}>
                  <td style={styles.adminCell}>
                    <strong>{log.adminName}</strong>
                    <div style={styles.adminId}>{log.adminId}</div>
                  </td>
                  <td><code style={styles.actionCode}>{log.action}</code></td>
                  <td>{log.targetType || '—'}</td>
                  <td style={styles.detailsCell}>
                    <pre style={styles.detailsPre}>{JSON.stringify(log.details, null, 2)}</pre>
                  </td>
                  <td>{log.ipAddress || '—'}</td>
                  <td>{formatDate(log.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
            Page {pagination.page} of {pagination.pages} ({pagination.total} logs)
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
    borderRadius: '8px',
    padding: '20px',
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '20px',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    minWidth: '180px',
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  dateSeparator: {
    color: '#666',
  },
  filterBtn: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  tableWrapper: {
    overflowX: 'auto',
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
    verticalAlign: 'top',
  },
  adminCell: {
    lineHeight: '1.4',
  },
  adminId: {
    fontSize: '11px',
    color: '#999',
  },
  actionCode: {
    backgroundColor: '#f4f4f4',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  detailsCell: {
    maxWidth: '250px',
  },
  detailsPre: {
    margin: 0,
    fontSize: '11px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'monospace',
    backgroundColor: '#fafafa',
    padding: '4px',
    borderRadius: '4px',
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
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
    borderRadius: '4px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#666',
  },
};

export default AdminLogs;