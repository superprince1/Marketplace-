// routes/products.js – add these endpoints after authentication middleware

const multer = require('multer');
const upload = multer({ dest: 'uploads/csv/' });
const { processProductCsv } = require('../services/csvService');

// ========== CSV IMPORT ==========
// POST /api/products/csv/import
router.post('/csv/import', auth, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }
    const sellerId = req.user.id;
    const result = await processProductCsv(req.file.path, sellerId);
    
    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => err && console.error('CSV cleanup error:', err));
    
    res.json({
      success: true,
      summary: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        failed: result.failed,
      },
      errors: result.errors, // array of row-level errors
      errorCsvUrl: result.errorCsvUrl, // if we generate error CSV
    });
  } catch (err) {
    console.error('CSV import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== CSV EXPORT ==========
// GET /api/products/csv/export
router.get('/csv/export', auth, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const products = await Product.find({ sellerId }).lean();
    
    // Define CSV columns
    const columns = [
      '_id', 'sku', 'name', 'description', 'price', 'comparePrice', 
      'category', 'stock', 'isDigital', 'tags', 'imageUrls', 
      'isActive', 'isFeatured', 'weight', 'dimensions'
    ];
    
    const json2csv = require('json2csv').parse;
    const csv = json2csv(products, { fields: columns });
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`products-export-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: err.message });
  }
});