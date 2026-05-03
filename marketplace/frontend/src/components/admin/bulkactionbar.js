// src/components/Admin/BulkActionBar.js
import React from 'react';

/**
 * BulkActionBar Component
 * 
 * Displays a bar with bulk action buttons when items are selected.
 * 
 * Features:
 * - Shows number of selected items
 * - Buttons for each bulk action (configurable)
 * - Clear selection button
 * - Loading state to disable buttons during API call
 * 
 * @param {Object} props
 * @param {number} props.selectedCount - Number of selected items
 * @param {function} props.onAction - Callback with action type (string)
 * @param {function} props.onClear - Callback to clear selection
 * @param {boolean} props.loading - Disable actions when true
 * @param {Array} props.customActions - Optional custom action list
 */
const BulkActionBar = ({
  selectedCount,
  onAction,
  onClear,
  loading = false,
  customActions = null,
}) => {
  // Default actions for users, products, orders – can be overridden
  const defaultActions = [
    { value: 'activate', label: 'Activate', color: '#28a745' },
    { value: 'deactivate', label: 'Deactivate', color: '#ffc107' },
    { value: 'delete', label: 'Delete', color: '#dc3545' },
    { value: 'make-admin', label: 'Make Admin', color: '#17a2b8' },
    { value: 'remove-admin', label: 'Remove Admin', color: '#6c757d' },
  ];

  const actions = customActions || defaultActions;

  if (selectedCount === 0) return null;

  return (
    <div style={styles.bar}>
      <span style={styles.count}>
        {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
      </span>
      <div style={styles.actions}>
        {actions.map(action => (
          <button
            key={action.value}
            onClick={() => onAction(action.value)}
            disabled={loading}
            style={{
              ...styles.actionBtn,
              backgroundColor: action.color,
            }}
            title={`Apply ${action.label} to selected items`}
          >
            {action.label}
          </button>
        ))}
        <button onClick={onClear} style={styles.clearBtn} disabled={loading}>
          Clear
        </button>
      </div>
    </div>
  );
};

const styles = {
  bar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#e9ecef',
    borderRadius: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  count: {
    fontWeight: '500',
    fontSize: '14px',
    color: '#1a1a2e',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'opacity 0.2s',
  },
  clearBtn: {
    padding: '6px 12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
};

export default BulkActionBar;