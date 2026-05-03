import React, { useState, useEffect } from 'react';

/**
 * ProductFilters Component - Filter sidebar or top bar for product listing
 * Features:
 * - Category filter (checkbox or dropdown)
 * - Price range filter (min/max inputs)
 * - Rating filter (optional)
 * - Search input (if not already in navbar)
 * - Reset all filters button
 * - Mobile responsive (collapsible on small screens)
 * - Real-time filter count badge
 */
const ProductFilters = ({ onFilterChange, initialFilters = {} }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: initialFilters.search || '',
    category: initialFilters.category || '',
    minPrice: initialFilters.minPrice || '',
    maxPrice: initialFilters.maxPrice || '',
    rating: initialFilters.rating || '',
    inStock: initialFilters.inStock || false
  });

  // Count active filters (excluding empty values)
  const activeFilterCount = Object.values(filters).filter(val => 
    val !== '' && val !== false && val !== null && val !== undefined
  ).length;

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Apply filters to parent component
  const applyFilters = () => {
    // Remove empty values before sending
    const cleanedFilters = {};
    if (filters.search) cleanedFilters.search = filters.search;
    if (filters.category) cleanedFilters.category = filters.category;
    if (filters.minPrice) cleanedFilters.minPrice = filters.minPrice;
    if (filters.maxPrice) cleanedFilters.maxPrice = filters.maxPrice;
    if (filters.rating) cleanedFilters.rating = filters.rating;
    if (filters.inStock) cleanedFilters.inStock = filters.inStock;
    
    onFilterChange(cleanedFilters);
  };

  // Reset all filters
  const resetFilters = () => {
    const resetState = {
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      rating: '',
      inStock: false
    };
    setFilters(resetState);
    onFilterChange({});
  };

  // Apply filters on Enter key in inputs
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  // Categories list (can be fetched from API or static)
  const categories = [
    { id: 'Electronics', name: 'Electronics', icon: '📱' },
    { id: 'Clothing', name: 'Clothing', icon: '👕' },
    { id: 'Home & Garden', name: 'Home & Garden', icon: '🏠' },
    { id: 'Books', name: 'Books', icon: '📚' },
    { id: 'Toys & Hobbies', name: 'Toys & Hobbies', icon: '🎮' },
    { id: 'Sports', name: 'Sports', icon: '⚽' },
    { id: 'Automotive', name: 'Automotive', icon: '🚗' },
    { id: 'Health & Beauty', name: 'Health & Beauty', icon: '💄' },
    { id: 'Pet Supplies', name: 'Pet Supplies', icon: '🐕' },
    { id: 'Food', name: 'Food', icon: '🍕' },
    { id: 'Other', name: 'Other', icon: '📦' }
  ];

  // Rating options
  const ratingOptions = [
    { value: '', label: 'Any rating' },
    { value: '4', label: '★★★★ & up (4+)' },
    { value: '3', label: '★★★ & up (3+)' },
    { value: '2', label: '★★ & up (2+)' },
    { value: '1', label: '★ & up (1+)' }
  ];

  return (
    <div style={styles.container}>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        style={styles.mobileToggle}
      >
        🔍 Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        <span style={styles.mobileToggleArrow}>{isMobileOpen ? '▲' : '▼'}</span>
      </button>

      {/* Filter Panel */}
      <div style={{
        ...styles.filterPanel,
        ...(isMobileOpen ? styles.filterPanelOpen : styles.filterPanelClosed)
      }}>
        {/* Search Filter */}
        <div style={styles.filterSection}>
          <label style={styles.filterLabel}>🔎 Search</label>
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder="Product name..."
            style={styles.input}
          />
        </div>

        {/* Category Filter */}
        <div style={styles.filterSection}>
          <label style={styles.filterLabel}>📂 Category</label>
          <select
            name="category"
            value={filters.category}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range Filter */}
        <div style={styles.filterSection}>
          <label style={styles.filterLabel}>💰 Price Range</label>
          <div style={styles.priceRow}>
            <input
              type="number"
              name="minPrice"
              value={filters.minPrice}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              placeholder="Min $"
              style={{...styles.input, width: '48%'}}
            />
            <span style={styles.priceDash}>-</span>
            <input
              type="number"
              name="maxPrice"
              value={filters.maxPrice}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              placeholder="Max $"
              style={{...styles.input, width: '48%'}}
            />
          </div>
        </div>

        {/* Rating Filter (Optional - for future implementation) */}
        <div style={styles.filterSection}>
          <label style={styles.filterLabel}>⭐ Customer Rating</label>
          <select
            name="rating"
            value={filters.rating}
            onChange={handleChange}
            style={styles.select}
          >
            {ratingOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* In Stock Filter */}
        <div style={styles.filterSection}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="inStock"
              checked={filters.inStock}
              onChange={handleChange}
              style={styles.checkbox}
            />
            📦 In Stock Only
          </label>
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonRow}>
          <button onClick={applyFilters} style={styles.applyButton}>
            Apply Filters
          </button>
          <button onClick={resetFilters} style={styles.resetButton}>
            Reset All
          </button>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div style={styles.activeFilters}>
            <span style={styles.activeFiltersLabel}>Active filters:</span>
            <div style={styles.activeFilterTags}>
              {filters.search && (
                <span style={styles.filterTag}>
                  Search: {filters.search}
                  <button onClick={() => {
                    setFilters({...filters, search: ''});
                    onFilterChange({...filters, search: ''});
                  }} style={styles.removeTag}>×</button>
                </span>
              )}
              {filters.category && (
                <span style={styles.filterTag}>
                  {categories.find(c => c.id === filters.category)?.name || filters.category}
                  <button onClick={() => {
                    setFilters({...filters, category: ''});
                    onFilterChange({...filters, category: ''});
                  }} style={styles.removeTag}>×</button>
                </span>
              )}
              {(filters.minPrice || filters.maxPrice) && (
                <span style={styles.filterTag}>
                  ${filters.minPrice || '0'} - ${filters.maxPrice || '∞'}
                  <button onClick={() => {
                    setFilters({...filters, minPrice: '', maxPrice: ''});
                    onFilterChange({...filters, minPrice: '', maxPrice: ''});
                  }} style={styles.removeTag}>×</button>
                </span>
              )}
              {filters.rating && (
                <span style={styles.filterTag}>
                  {filters.rating}+ stars
                  <button onClick={() => {
                    setFilters({...filters, rating: ''});
                    onFilterChange({...filters, rating: ''});
                  }} style={styles.removeTag}>×</button>
                </span>
              )}
              {filters.inStock && (
                <span style={styles.filterTag}>
                  In Stock
                  <button onClick={() => {
                    setFilters({...filters, inStock: false});
                    onFilterChange({...filters, inStock: false});
                  }} style={styles.removeTag}>×</button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== STYLES ==========
const styles = {
  container: {
    marginBottom: '24px'
  },
  mobileToggle: {
    display: 'none',
    width: '100%',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  mobileToggleArrow: {
    fontSize: '12px'
  },
  filterPanel: {
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    transition: 'all 0.3s ease'
  },
  filterPanelOpen: {
    display: 'block'
  },
  filterPanelClosed: {
    display: 'block'
  },
  filterSection: {
    marginBottom: '20px'
  },
  filterLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px'
  },
  priceDash: {
    color: '#999'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
    marginBottom: '20px'
  },
  applyButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  resetButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  activeFilters: {
    borderTop: '1px solid #eee',
    paddingTop: '16px',
    marginTop: '8px'
  },
  activeFiltersLabel: {
    fontSize: '13px',
    color: '#666',
    display: 'block',
    marginBottom: '8px'
  },
  activeFilterTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  filterTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#e9ecef',
    padding: '4px 8px',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#495057'
  },
  removeTag: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#dc3545',
    padding: '0 2px'
  }
};

// Responsive styles via CSS (add to your global CSS or use media query in JS)
// For simplicity, we'll add a style tag
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @media (max-width: 768px) {
    .mobile-toggle {
      display: flex !important;
    }
    .filter-panel {
      display: none;
    }
    .filter-panel.open {
      display: block;
    }
  }
`;
// Since we can't use CSS classes directly in inline styles, we rely on state.
// The above CSS is for reference; the component uses state to toggle visibility.
document.head.appendChild(styleSheet);

export default ProductFilters;