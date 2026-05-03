const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const auth = require('../middleware/auth');

// Upload single image (product, avatar, etc.)
router.post('/image', auth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  res.json({ success: true, imageUrl: req.file.path });
});

// Upload multiple images (max 5)
router.post('/images', auth, upload.array('images', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }
  const imageUrls = req.files.map(file => file.path);
  res.json({ success: true, imageUrls });
});

module.exports = router;