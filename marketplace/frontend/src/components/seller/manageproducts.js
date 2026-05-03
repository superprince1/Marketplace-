import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProductForm from './ProductForm';
import API from '../../services/api';

/**
 * ManageProducts Component - Seller product management
 * Features:
 * - List all seller's products (active and inactive)
 * - Add new product (opens ProductForm modal)
 * - Edit existing product
 * - Delete product (soft delete)
 * - Restore deleted product
 * - Toggle featured status
 * - Search products by name
 * - Filter by status (active/inactive)
 * - Loading and empty states
 */
const ManageProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/products/seller/${user.id}`, {
        params: { includeInactive: true }
      });
      setProducts(response.data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSaveProduct = async (productData) => {
    setActionLoading(true);
    try {
      if (editingProduct) {
        // Update existing product
        await API.put(`/products/${editingProduct._id}`, productData);
        alert('Product updated successfully!');
      } else {
        // Create new product
        await API.post('/products', productData);
        alert('Product added successfully!');
      }
      setShowForm(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error('Save error:', err);
      alert(err.response?.data?.error || 'Failed to save product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? It can be restored later.')) {
      return;
    }
    setActionLoading(true);
    try {
      await API.delete(`/products/${productId}`);
      alert('Product deleted successfully');
      fetchProducts();
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.response?.data?.error || 'Failed to delete product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreProduct = async (productId) => {
    setActionLoading(true);
    try {
      await API.post(`/products/${productId}/restore`);
      alert('Product restored successfully');
      fetchProducts();
    } catch (err) {
      console.error('Restore error:', err);
      alert(err.response?.data?.error || 'Failed to restore product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFeatured = async (productId, currentFeatured) => {
    setActionLoading(true);
    try {
      await API.put(`/products/${productId}`, { isFeatured: !currentFeatured });
      fetchProducts();
    } catch (err) {
      console.error('Toggle featured error:', err);
      alert('Failed to update featured status');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter products based on search and status
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'active' 
        ? product.isActive 
        : !product.isActive;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={styles.container}>
      {/* Header with Add Button */}
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>My Products</h2>
        <button onClick={handleAddProduct} style={styles.addButton}>
          + Add New Product
        </button>
      </div>

      {/* Filters Bar */}
      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <span style={styles.searchIcon}>🔍</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Products</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading your products...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProducts.length === 0 && (
        <div style={styles.emptyContainer}>
          <div style={styles.emptyIcon}>📦</div>
          <h3 style={styles.emptyTitle}>No products found</h3>
          <p style={styles.emptyText}>
            {searchTerm || statusFilter !== 'all' 
              ? 'Try changing your search or filter criteria.'
              : 'You haven\'t added any products yet. Click the button above to get started!'}
          </p>
        </div>
      )}

      {/* Products Table */}
      {!loading && filteredProducts.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Image</th>
                <th style={styles.th}>Product Name</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Stock</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Featured</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product._id} style={styles.tr}>
                  <td style={styles.td}>
                    <img
                      src={product.primaryImage || product.imageUrl || 'https://via.placeholder.com/50'}
                      alt={product.name}
                      style={styles.productImage}
                    />
                  </td>
                  <td style={styles.td}>
                    <div style={styles.productName}>{product.name}</div>
                    <div style={styles.productId}>ID: {product._id.slice(-8)}</div>
                  </td>
                  <td style={styles.td}>${product.price.toFixed(2)}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.stockBadge,
                      ...(product.stock <= 0 ? styles.outOfStock : product.stock < 5 ? styles.lowStock : styles.inStock)
                    }}>
                      {product.stock <= 0 ? 'Out of Stock' : product.stock < 5 ? `Low (${product.stock})` : `${product.stock}`}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(product.isActive ? styles.activeBadge : styles.inactiveBadge)
                    }}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleToggleFeatured(product._id, product.isFeatured)}
                      style={{
                        ...styles.featuredBtn,
                        ...(product.isFeatured ? styles.featuredActive : {})
                      }}
                      disabled={actionLoading}
                    >
                      {product.isFeatured ? '★ Featured' : '☆ Set Featured'}
                    </button>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => handleEditProduct(product)}
                        style={styles.editBtn}
                        disabled={actionLoading}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      {product.isActive ? (
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          style={styles.deleteBtn}
                          disabled={actionLoading}
                          title="Delete (soft)"
                        >
                          🗑️
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestoreProduct(product._id)}
                          style={styles.restoreBtn}
                          disabled={actionLoading}
                          title="Restore"
                        >
                          ↩️ Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          onSave={handleSaveProduct}
          onCancel={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          loading={actionLoading}
        />
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    margin: 0
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  filtersBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  searchBox: {
    position: 'relative',
    flex: 1,
    maxWidth: '300px'
  },
  searchInput: {
    width: '100%',
    padding: '8px 32px 8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  searchIcon: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#999'
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: '#fff'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0',
    fontWeight: '600',
    color: '#555'
  },
  tr: {
    borderBottom: '1px solid #eee'
  },
  td: {
    padding: '12px',
    verticalAlign: 'middle'
  },
  productImage: {
    width: '50px',
    height: '50px',
    objectFit: 'cover',
    borderRadius: '4px'
  },
  productName: {
    fontWeight: '500',
    color: '#333',
    marginBottom: '4px'
  },
  productId: {
    fontSize: '11px',
    color: '#999'
  },
  stockBadge: {
    padding: '4px 8px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500'
  },
  inStock: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  lowStock: {
    backgroundColor: '#fff3cd',
    color: '#856404'
  },
  outOfStock: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500'
  },
  activeBadge: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  inactiveBadge: {
    backgroundColor: '#e2e3e5',
    color: '#383d41'
  },
  featuredBtn: {
    padding: '4px 8px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px'
  },
  featuredActive: {
    backgroundColor: '#ffc107',
    borderColor: '#ffc107',
    color: '#333'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  editBtn: {
    padding: '4px 8px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  deleteBtn: {
    padding: '4px 8px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  restoreBtn: {
    padding: '4px 8px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
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
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '18px',
    color: '#333',
    marginBottom: '8px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#666'
  }
};

// Add keyframe animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default ManageProducts;