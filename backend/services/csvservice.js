const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const Product = require('../models/Product');
const path = require('path');

// Helper to parse comma-separated tags
const parseTags = (tagsStr) => {
  if (!tagsStr) return [];
  return tagsStr.split(',').map(t => t.trim()).filter(t => t);
};

// Helper to parse image URLs (semicolon separated)
const parseImages = (urlsStr) => {
  if (!urlsStr) return [];
  const urls = urlsStr.split(';').map(u => u.trim()).filter(u => u);
  return urls.map((url, idx) => ({ url, altText: '', isMain: idx === 0 }));
};

// Validate product data
const validateProduct = (row, index) => {
  const errors = [];
  if (!row.name) errors.push('Missing name');
  if (!row.price || isNaN(parseFloat(row.price)) || parseFloat(row.price) <= 0) errors.push('Invalid price');
  if (row.comparePrice && isNaN(parseFloat(row.comparePrice))) errors.push('Invalid compare price');
  if (row.stock && isNaN(parseInt(row.stock))) errors.push('Stock must be number');
  if (row.category && !['Electronics','Clothing','Books','Home & Garden','Sports','Toys','Beauty','Automotive','Health','Digital','Other'].includes(row.category)) {
    errors.push(`Invalid category: ${row.category}`);
  }
  if (row.isDigital && row.isDigital !== 'true' && row.isDigital !== 'false') errors.push('isDigital must be true/false');
  return { isValid: errors.length === 0, errors };
};

async function processProductCsv(filePath, sellerId) {
  const results = [];
  const errors = [];
  let rowIndex = 0;

  // Read and parse CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rowIndex++;
        const validation = validateProduct(row, rowIndex);
        if (!validation.isValid) {
          errors.push({ row: rowIndex, errors: validation.errors, data: row });
          return;
        }
        results.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  // Process each valid row
  let created = 0, updated = 0, failed = 0;
  const processErrors = [];

  for (const row of results) {
    try {
      // Determine if product exists (by _id or SKU)
      let product = null;
      if (row._id) {
        product = await Product.findOne({ _id: row._id, sellerId });
      } else if (row.sku) {
        product = await Product.findOne({ sku: row.sku, sellerId });
      }

      const productData = {
        name: row.name,
        price: parseFloat(row.price),
        comparePrice: row.comparePrice ? parseFloat(row.comparePrice) : null,
        description: row.description || '',
        shortDescription: row.shortDescription || '',
        category: row.category || 'Other',
        stock: row.stock ? parseInt(row.stock) : 0,
        isDigital: row.isDigital === 'true',
        tags: parseTags(row.tags),
        images: parseImages(row.imageUrls),
        isActive: row.isActive !== 'false',
        isFeatured: row.isFeatured === 'true',
        sku: row.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
        sellerId,
        sellerName: req.user?.name || 'Seller', // will be set from session
      };

      if (product) {
        // Update existing
        Object.assign(product, productData);
        await product.save();
        updated++;
      } else {
        // Create new
        product = new Product(productData);
        await product.save();
        created++;
      }
    } catch (err) {
      failed++;
      processErrors.push({ row: rowIndex, error: err.message, data: row });
    }
  }

  // Generate error CSV if any
  let errorCsvUrl = null;
  if (processErrors.length > 0 || errors.length > 0) {
    const errorRows = [...errors, ...processErrors];
    const errorCsvPath = path.join(__dirname, '../uploads/csv/errors', `errors-${Date.now()}.csv`);
    const csvWriter = createCsvWriter({
      path: errorCsvPath,
      header: [
        { id: 'row', title: 'Row Number' },
        { id: 'errors', title: 'Errors' },
        { id: 'data', title: 'Row Data' },
      ],
    });
    await csvWriter.writeRecords(errorRows.map(e => ({
      row: e.row,
      errors: e.errors.join(', '),
      data: JSON.stringify(e.data),
    })));
    errorCsvUrl = `/uploads/csv/errors/${path.basename(errorCsvPath)}`;
  }

  return {
    total: results.length + errors.length,
    created,
    updated,
    failed: failed + errors.length,
    errors: [...errors, ...processErrors],
    errorCsvUrl,
  };
}

module.exports = { processProductCsv };