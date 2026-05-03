const { client, INDEX_NAME } = require('../config/elasticsearch');
const Product = require('../models/Product');

/**
 * Index a single product in Elasticsearch
 * @param {Object} product - Mongoose product document
 */
const indexProduct = async (product) => {
  try {
    // Prepare geo_point from MongoDB GeoJSON (if exists)
    let location = null;
    if (product.location && product.location.coordinates && product.location.coordinates.length === 2) {
      // Elasticsearch geo_point expects { lat, lon }
      location = {
        lat: product.location.coordinates[1],
        lon: product.location.coordinates[0],
      };
    }

    const body = {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      category: product.category,
      brand: product.brand || null,
      price: product.price,
      rating: product.ratings?.average || 0,
      soldCount: product.soldCount || 0,
      tags: product.tags || [],
      isActive: product.isActive,
      sellerId: product.sellerId.toString(),
      createdAt: product.createdAt,
      isPromoted: product.isPromoted || false,
      promotionEndDate: product.promotionEndDate || null,
      location,
      // Completion suggester field (autocomplete)
      name_suggest: {
        input: [product.name],
        weight: 10,
      },
    };

    await client.index({
      index: INDEX_NAME,
      id: product._id.toString(),
      body,
    });
  } catch (err) {
    console.error(`Failed to index product ${product._id}:`, err.message);
    throw err; // Re‑throw so caller can handle
  }
};

/**
 * Delete a product from Elasticsearch index
 * @param {string} productId - Product ID
 */
const deleteProduct = async (productId) => {
  try {
    await client.delete({
      index: INDEX_NAME,
      id: productId.toString(),
    });
  } catch (err) {
    // If document not found, ignore error (already not indexed)
    if (err.meta?.statusCode !== 404) {
      console.error(`Failed to delete product ${productId} from Elasticsearch:`, err.message);
    }
  }
};

/**
 * Bulk sync all active products (run once on deployment)
 * Also optionally deletes products that are no longer active.
 */
const bulkSync = async () => {
  try {
    const products = await Product.find({ isActive: true });
    const body = products.flatMap((doc) => [
      { index: { _index: INDEX_NAME, _id: doc._id.toString() } },
      {
        id: doc._id.toString(),
        name: doc.name,
        description: doc.description,
        category: doc.category,
        brand: doc.brand || null,
        price: doc.price,
        rating: doc.ratings?.average || 0,
        soldCount: doc.soldCount || 0,
        tags: doc.tags || [],
        isActive: doc.isActive,
        sellerId: doc.sellerId.toString(),
        createdAt: doc.createdAt,
        isPromoted: doc.isPromoted || false,
        promotionEndDate: doc.promotionEndDate || null,
        location: doc.location && doc.location.coordinates ? {
          lat: doc.location.coordinates[1],
          lon: doc.location.coordinates[0],
        } : null,
        name_suggest: { input: [doc.name], weight: 10 },
      },
    ]);

    if (body.length) {
      const response = await client.bulk({ body });
      if (response.errors) {
        console.error('Bulk indexing had errors:', response.items.filter(item => item.index.error));
      } else {
        console.log(`✅ Bulk indexed ${products.length} products to Elasticsearch`);
      }
    }
  } catch (err) {
    console.error('Bulk sync failed:', err.message);
  }
};

module.exports = { indexProduct, deleteProduct, bulkSync };