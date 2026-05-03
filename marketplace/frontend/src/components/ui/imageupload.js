import React, { useState } from 'react';
import API from '../../services/api';

const ImageUpload = ({ onUpload, multiple = false, maxFiles = 5, label = 'Upload Images' }) => {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState([]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (!multiple && files.length > 1) {
      alert('Only one file allowed');
      return;
    }
    if (files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Preview
    const previewUrls = files.map(file => URL.createObjectURL(file));
    setPreviews(previewUrls);

    setUploading(true);
    const formData = new FormData();
    files.forEach(file => formData.append(multiple ? 'images' : 'image', file));

    try {
      const endpoint = multiple ? '/upload/images' : '/upload/image';
      const res = await API.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const urls = multiple ? res.data.imageUrls : [res.data.imageUrl];
      onUpload(urls);
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>{label}</label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        multiple={multiple}
        disabled={uploading}
        style={styles.input}
      />
      {uploading && <p style={styles.uploading}>Uploading...</p>}
      {previews.length > 0 && (
        <div style={styles.previews}>
          {previews.map((url, idx) => (
            <img key={idx} src={url} alt="Preview" style={styles.preview} />
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { margin: '12px 0' },
  label: { display: 'block', fontWeight: '500', marginBottom: '6px' },
  input: { marginBottom: '8px' },
  uploading: { fontSize: '12px', color: '#007bff' },
  previews: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' },
  preview: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' },
};

export default ImageUpload;