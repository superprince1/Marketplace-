import React, { useState } from 'react';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const BulkProductImport = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a CSV file');
      return;
    }
    const formData = new FormData();
    formData.append('csvFile', file);
    setUploading(true);
    setError('');
    try {
      const response = await API.post('/products/csv/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data.summary);
      if (response.data.errorCsvUrl) {
        setError(`Some rows failed. Download error report: ${response.data.errorCsvUrl}`);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleCsv = () => {
    const sampleData = [
      ['name', 'price', 'comparePrice', 'description', 'category', 'stock', 'isDigital', 'tags', 'imageUrls', 'isActive', 'isFeatured', 'sku'],
      ['Sample Product', '19.99', '29.99', 'This is a sample product', 'Electronics', '100', 'false', 'gadget,new', 'https://example.com/image.jpg', 'true', 'false', 'SAMPLE-001'],
    ];
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-products.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>Bulk Product Import (CSV)</h3>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
        
        <div style={styles.sampleLink}>
          <button onClick={downloadSampleCsv} style={styles.sampleBtn}>Download Sample CSV</button>
        </div>
        
        <input type="file" accept=".csv" onChange={handleFileChange} style={styles.fileInput} />
        
        {error && <div style={styles.errorMsg}>{error}</div>}
        {result && (
          <div style={styles.result}>
            <p>✅ Total rows: {result.total}</p>
            <p>✅ Created: {result.created}</p>
            <p>✏️ Updated: {result.updated}</p>
            <p>❌ Failed: {result.failed}</p>
          </div>
        )}
        
        <div style={styles.actions}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button onClick={handleSubmit} disabled={uploading || !file} style={styles.importBtn}>
            {uploading ? <LoadingSpinner size="small" /> : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { backgroundColor:'white', borderRadius:'12px', padding:'24px', maxWidth:'500px', width:'90%', position:'relative' },
  closeBtn: { position:'absolute', top:'12px', right:'16px', background:'none', border:'none', fontSize:'24px', cursor:'pointer' },
  sampleLink: { marginBottom:'16px' },
  sampleBtn: { background:'none', border:'none', color:'#007bff', cursor:'pointer', textDecoration:'underline' },
  fileInput: { margin:'16px 0', width:'100%' },
  errorMsg: { backgroundColor:'#f8d7da', color:'#721c24', padding:'10px', borderRadius:'6px', marginBottom:'16px' },
  result: { backgroundColor:'#d4edda', color:'#155724', padding:'10px', borderRadius:'6px', marginBottom:'16px' },
  actions: { display:'flex', justifyContent:'flex-end', gap:'12px' },
  cancelBtn: { padding:'8px 16px', backgroundColor:'#6c757d', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' },
  importBtn: { padding:'8px 16px', backgroundColor:'#28a745', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' },
};

export default BulkProductImport;