// src/components/Admin/AdminProducts.js
import React, { useState, useEffect } from 'react';
import {
  getAdminProducts,
  updateAdminProduct,
  deleteAdminProduct,
  bulkProductsAction,
  exportReport,
} from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import BulkActionBar from './BulkActionBar';

/**
 * AdminProducts Component
 *
 * Complete product management for admin:
 * - List all products with pagination
 * - Search by product name
 * - Filter by status (active / inactive)
 * - Bulk actions: activate, deactivate, delete, feature, unfeature
 * - Export current filtered products to CSV
 * - Individual: toggle featured, toggle active, permanent delete
 * - Activity logs automatically recorded on backend
 */
const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ page: 1, limit: 20, isActive: '', search: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: filters.page, limit: filters.limit };
      if (filters.isActive !== '') params.isActive = filters.isActive;
      if (filters.search) params.search = filters.search;
      const response = await getAdminProducts(params);
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Fetch products error:', err);
      setError(err.response?.data?.error || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Individual actions
  const handleToggleFeatured = async (productId, currentFeatured) => {
    setActionLoading(productId);
    try {
      await updateAdminProduct(productId, { isFeatured: !currentFeatured });
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update featured status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (productId, currentActive) => {
    setActionLoading(productId);
    try {
      await updateAdminProduct(productId, { isActive: !currentActive });
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update product status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Permanently delete "${productName}"? This cannot be undone.`)) return;
    setActionLoading(productId);
    try {
      await deleteAdminProduct(productId);
      setSelectedProducts((prev) => prev.filter((id) => id !== productId));
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete product');
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk actions
  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedProducts(products.map((p) => p._id));
    else setSelectedProducts([]);
  };

  const handleSelectOne = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleBulkAction = async (action) => {
    if (!selectedProducts.length) return;
    if (action === 'delete' && !window.confirm(`Delete ${selectedProducts.length} product(s) permanently?`)) return;
    setBulkLoading(true);
    try {
      await bulkProductsAction(selectedProducts, action);
      setSelectedProducts([]);
      fetchProducts();
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
      const blob = await exportReport('products');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products-export-${Date.now()}.csv`);
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
    setSelectedProducts([]);
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchTerm, page: 1 }));
    setSelectedProducts([]);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setFilters((prev) => ({ ...prev, page: newPage }));
    setSelectedProducts([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatPrice = (price) => `$${price.toFixed(2)}`;
  const getStockBadge = (stock) => {
    if (stock <= 0) return { label: 'Out of stock', style: { backgroundColor: '#f8d7da', color: '#721c24' } };
    if (stock < 5) return { label: `Low (${stock})`, style: { backgroundColor: '#fff3cd', color: '#856404' } };
    return { label: `${stock}`, style: { backgroundColor: '#d4edda', color: '#155724' } };
  };

  if (loading) return <LoadingSpinner message="Loading products..." />;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div style={styles.container}>
      {/* Filters Bar */}
      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={styles.searchInput}
          />
          <button onClick={handleSearch} style={styles.searchBtn}>🔍</button>
        </div>
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
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedProducts.length}
        onAction={handleBulkAction}
        onClear={() => setSelectedProducts([])}
        loading={bulkLoading}
        customActions={[
          { value: 'activate', label: 'Activate', color: '#28a745' },
          { value: 'deactivate', label: 'Deactivate', color: '#ffc107' },
          { value: 'delete', label: 'Delete', color: '#dc3545' },
          { value: 'feature', label: 'Feature', color: '#17a2b8' },
          { value: 'unfeature', label: 'Unfeature', color: '#6c757d' },
        ]}
      />

      {/* Products Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedProducts.length === products.length && products.length > 0}
                />
              </th>
              <th>Image</th>
              <th>Product Name</th>
              <th>Seller</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Featured</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const imageUrl = product.primaryImage || product.imageUrl || 'https://via.placeholder.com/60';
              const stockBadge = getStockBadge(product.stock);
              return (
                <tr key={product._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product._id)}
                      onChange={() => handleSelectOne(product._id)}
                    />
                  </td>
                  <td><img src={imageUrl} alt={product.name} style={styles.productImage} /></td>
                  <td>
                    <div style={styles.productName}>{product.name}</div>
                    <div style={styles.productId}>ID: {product._id.slice(-8)}</div>
                  </td>
                  <td>{product.sellerId?.name || product.sellerName || 'Unknown'}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>
                    <span style={{ ...styles.stockBadge, ...stockBadge.style }}>
                      {stockBadge.label}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleFeatured(product._id, product.isFeatured)}
                      disabled={actionLoading === product._id}
                      style={{
                        ...styles.featuredBtn,
                        backgroundColor: product.isFeatured ? '#ffc107' : '#e9ecef',
                        color: product.isFeatured ? '#333' : '#666',
                      }}
                    >
                      {product.isFeatured ? '★ Featured' : '☆ Set'}
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(product._id, product.isActive)}
                      disabled={actionLoading === product._id}
                      style={{
                        ...styles.statusBtn,
                        backgroundColor: product.isActive ? '#28a745' : '#dc3545',
                      }}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeleteProduct(product._id, product.name)}
                      disabled={actionLoading === product._id}
                      style={styles.deleteBtn}
                      title="Permanently Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
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
            Page {pagination.page} of {pagination.pages} ({pagination.total} products)
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
  productImage: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '6px',
  },
  productName: {
    fontWeight: '500',
  },
  productId: {
    fontSize: '11px',
    color: '#6c757d',
    marginTop: '2px',
  },
  stockBadge: {
    padding: '4px 8px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
  },
  featuredBtn: {
    padding: '4px 8px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
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

export default AdminProducts;