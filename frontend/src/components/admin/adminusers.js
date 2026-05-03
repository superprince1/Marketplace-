// src/components/Admin/AdminUsers.js
import React, { useState, useEffect } from 'react';
import {
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  bulkUsersAction,
  exportReport,
  sendNotification,
} from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import BulkActionBar from './BulkActionBar';
import NotificationModal from './NotificationModal';

/**
 * AdminUsers Component
 *
 * Complete user management for admin:
 * - List all users with pagination
 * - Search by name/email
 * - Filter by role (buyer, seller, admin)
 * - Filter by status (active, inactive)
 * - Bulk actions: activate, deactivate, delete, make admin, remove admin
 * - Export current filtered users to CSV
 * - Send email notifications to selected users
 * - Individual role change, status toggle, delete
 * - Activity logs automatically recorded on backend
 */
const AdminUsers = () => {
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ page: 1, limit: 20, role: '', isActive: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch users whenever filters or search changes
  useEffect(() => {
    fetchUsers();
  }, [filters, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.role) params.role = filters.role;
      if (filters.isActive !== '') params.isActive = filters.isActive;
      if (searchTerm) params.search = searchTerm;

      const response = await getAdminUsers(params);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Individual user actions
  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId);
    try {
      await updateAdminUser(userId, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    setActionLoading(userId);
    try {
      await updateAdminUser(userId, { isActive: !currentStatus });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Permanently delete "${userName}"? This action cannot be undone.`)) return;
    setActionLoading(userId);
    try {
      await deleteAdminUser(userId);
      // Remove from selection if present
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map((u) => u._id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectOne = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkAction = async (action) => {
    if (!selectedUsers.length) return;
    if (action === 'delete' && !window.confirm(`Permanently delete ${selectedUsers.length} user(s)?`)) return;
    setBulkLoading(true);
    try {
      await bulkUsersAction(selectedUsers, action);
      setSelectedUsers([]);
      fetchUsers();
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
      const blob = await exportReport('users');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-export-${Date.now()}.csv`);
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

  // Notification sending
  const handleSendNotification = async (userIds, subject, message) => {
    try {
      const result = await sendNotification(userIds, subject, message);
      alert(`Notification sent to ${result.sentCount} of ${userIds.length} user(s).`);
    } catch (err) {
      alert(err.message || 'Failed to send notifications');
    }
  };

  // Filter and pagination helpers
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    setSelectedUsers([]);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setFilters((prev) => ({ ...prev, page: newPage }));
    setSelectedUsers([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    setSelectedUsers([]);
  };

  const getRoleBadgeStyle = (role) => {
    const styles = {
      buyer: { backgroundColor: '#28a745', color: 'white' },
      seller: { backgroundColor: '#17a2b8', color: 'white' },
      admin: { backgroundColor: '#dc3545', color: 'white' },
    };
    return styles[role] || styles.buyer;
  };

  if (loading) return <LoadingSpinner message="Loading users..." />;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div style={styles.container}>
      {/* Filters Bar */}
      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={styles.searchInput}
          />
          <button onClick={handleSearch} style={styles.searchBtn}>
            🔍
          </button>
        </div>
        <select
          value={filters.role}
          onChange={(e) => handleFilterChange('role', e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Roles</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={filters.isActive}
          onChange={(e) => handleFilterChange('isActive', e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button onClick={handleExport} disabled={exporting} style={styles.exportBtn}>
          {exporting ? 'Exporting...' : '📥 Export CSV'}
        </button>
        <button
          onClick={() => setShowNotifyModal(true)}
          disabled={selectedUsers.length === 0}
          style={{
            ...styles.notifyBtn,
            opacity: selectedUsers.length === 0 ? 0.5 : 1,
            cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          ✉️ Notify Selected
        </button>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedUsers.length}
        onAction={handleBulkAction}
        onClear={() => setSelectedUsers([])}
        loading={bulkLoading}
      />

      {/* Users Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedUsers.length === users.length && users.length > 0}
                />
              </th>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => handleSelectOne(user._id)}
                  />
                </td>
                <td style={styles.userCell}>
                  <div style={styles.userAvatar}>{user.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={styles.userName}>{user.name}</div>
                    {user.phone && <div style={styles.userPhone}>{user.phone}</div>}
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                    disabled={actionLoading === user._id}
                    style={{
                      ...styles.roleSelect,
                      ...getRoleBadgeStyle(user.role),
                    }}
                  >
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => handleStatusToggle(user._id, user.isActive)}
                    disabled={actionLoading === user._id}
                    style={{
                      ...styles.statusBtn,
                      backgroundColor: user.isActive ? '#28a745' : '#dc3545',
                    }}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => handleDeleteUser(user._id, user.name)}
                    disabled={actionLoading === user._id}
                    style={styles.deleteBtn}
                    title="Delete User"
                  >
                    🗑️
                  </button>
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
            Page {pagination.page} of {pagination.pages} ({pagination.total} users)
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

      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        userIds={selectedUsers}
        onSend={handleSendNotification}
      />
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
  searchBox: {
    display: 'flex',
    flex: 1,
    minWidth: '220px',
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px 0 0 6px',
    fontSize: '14px',
  },
  searchBtn: {
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '0 6px 6px 0',
    cursor: 'pointer',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  exportBtn: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  notifyBtn: {
    padding: '8px 16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
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
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  userName: {
    fontWeight: '500',
  },
  userPhone: {
    fontSize: '12px',
    color: '#6c757d',
  },
  roleSelect: {
    padding: '4px 8px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  statusBtn: {
    padding: '4px 12px',
    borderRadius: '20px',
    border: 'none',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '6px 10px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
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

export default AdminUsers;