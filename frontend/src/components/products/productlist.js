import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import ProductFilters from './ProductFilters';
import { getProducts } from '../../services/api';
import SkeletonProductCard from '../UI/SkeletonProductCard';
import useCart from '../../hooks/useCart'; // ✅ Cart hook

/**
 * ProductList Component - Displays grid of products with filters and pagination
 * Features:
 * - Fetches products from API with query params
 * - Handles loading and error states
 * - Integrates with ProductFilters for filtering/sorting/search
 * - Pagination support
 * - Empty state when no products found
 * - Skeleton loading placeholders
 * - Uses global cart hook for add-to-cart functionality
 */
const ProductList = ({ initialFilters = {} }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addItem } = useCart(); // ✅ Get add to cart function

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    sort: '-createdAt',
    category: '',
    minPrice: '',
    maxPrice: '',
    search: '',
    ...initialFilters
  });

  // Parse URL query params on mount and when location changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlFilters = {};
    
    if (params.get('search')) urlFilters.search = params.get('search');
    if (params.get('category')) urlFilters.category = params.get('category');
    if (params.get('minPrice')) urlFilters.minPrice = params.get('minPrice');
    if (params.get('maxPrice')) urlFilters.maxPrice = params.get('maxPrice');
    if (params.get('sort')) urlFilters.sort = params.get('sort');
    if (params.get('page')) urlFilters.page = parseInt(params.get('page'));
    
    if (Object.keys(urlFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...urlFilters }));
    }
  }, [location.search]);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.sort) params.sort = filters.sort;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      
      const response = await getProducts(params);
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Update URL when filters change
  const updateURL = useCallback((newFilters) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice);
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice);
    if (newFilters.sort && newFilters.sort !== '-createdAt') params.set('sort', newFilters.sort);
    if (newFilters.page && newFilters.page > 1) params.set('page', newFilters.page);
    
    const newURL = params.toString() ? `/?${params.toString()}` : '/';
    navigate(newURL, { replace: true });
  }, [navigate]);

  // Handle filter changes from ProductFilters component
  const handleFilterChange = (newFilters) => {
    const updatedFilters = {
      ...filters,
      ...newFilters,
      page: 1
    };
    setFilters(updatedFilters);
    updateURL(updatedFilters);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    
    const updatedFilters = { ...filters, page: newPage };
    setFilters(updatedFilters);
    updateURL(updatedFilters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle sort change (convenience)
  const handleSortChange = (sortValue) => {
    handleFilterChange({ sort: sortValue });
  };

  // Render loading skeletons (using reusable SkeletonProductCard)
  const renderSkeletons = () => {
    return Array(6).fill(0).map((_, i) => <SkeletonProductCard key={i} />);
  };

  // Render empty state
  const renderEmpty = () => (
    <div style={styles.emptyContainer}>
      <div style={styles.emptyIcon}>🔍</div>
      <h3 style={styles.emptyTitle}>No products found</h3>
      <p style={styles.emptyText}>
        We couldn't find any products matching your criteria.
        Try adjusting your filters or search term.
      </p>
      <button onClick={() => handleFilterChange({ search: '', category: '', minPrice: '', maxPrice: '', sort: '-createdAt' })} style={styles.resetButton}>
        Clear all filters
      </button>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div style={styles.errorContainer}>
      <div style={styles.errorIcon}>⚠️</div>
      <h3 style={styles.errorTitle}>Something went wrong</h3>
      <p style={styles.errorText}>{error}</p>
      <button onClick={fetchProducts} style={styles.retryButton}>
        Try Again
      </button>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Filters Bar */}
      <ProductFilters 
        onFilterChange={handleFilterChange}
        initialFilters={filters}
      />

      {/* Results Header */}
      <div style={styles.resultsHeader}>
        <div style={styles.resultsCount}>
          {!loading && !error && (
            <span>Showing {products.length} of {pagination.total} products</span>
          )}
        </div>
        <div style={styles.sortDropdown}>
          <label htmlFor="sort" style={styles.sortLabel}>Sort by:</label>
          <select 
            id="sort"
            value={filters.sort}
            onChange={(e) => handleSortChange(e.target.value)}
            style={styles.sortSelect}
          >
            <option value="-createdAt">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
            <option value="sold">Best Selling</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div style={styles.grid}>
          {renderSkeletons()}
        </div>
      ) : error ? (
        renderError()
      ) : products.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          <div style={styles.grid}>
            {products.map(product => (
              <ProductCard 
                key={product._id}
                product={product}
                onAddToCart={addItem} // ✅ Pass addItem from hook
                layout="grid"
                showQuickView={true}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={styles.pagination}>
              <button 
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                style={{
                  ...styles.pageButton,
                  ...(pagination.page === 1 ? styles.pageButtonDisabled : {})
                }}
              >
                ← Previous
              </button>
              
              <div style={styles.pageNumbers}>
                {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        ...styles.pageNumber,
                        ...(pagination.page === pageNum ? styles.pageNumberActive : {})
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                style={{
                  ...styles.pageButton,
                  ...(pagination.page === pagination.pages ? styles.pageButtonDisabled : {})
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ========== STYLES ==========
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  resultsCount: {
    fontSize: '14px',
    color: '#666'
  },
  sortDropdown: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  sortLabel: {
    fontSize: '14px',
    color: '#333'
  },
  sortSelect: {
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
    cursor: 'pointer'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '8px'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '20px',
    color: '#333',
    marginBottom: '8px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px'
  },
  resetButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '8px'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  errorTitle: {
    fontSize: '20px',
    color: '#dc3545',
    marginBottom: '8px'
  },
  errorText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px'
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    marginTop: '20px',
    flexWrap: 'wrap'
  },
  pageButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  pageButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  },
  pageNumbers: {
    display: 'flex',
    gap: '5px'
  },
  pageNumber: {
    padding: '8px 12px',
    backgroundColor: '#f8f9fa',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  pageNumberActive: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff'
  }
};

export default ProductList;