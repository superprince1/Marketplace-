const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_API_KEY ? {
    apiKey: process.env.ELASTICSEARCH_API_KEY,
  } : undefined,
});

const INDEX_NAME = 'products';

/**
 * Create Elasticsearch index with full mappings and settings.
 * Run this once (e.g., on server startup) to ensure the index exists.
 */
const createIndex = async () => {
  try {
    const exists = await client.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await client.indices.create({
        index: INDEX_NAME,
        body: {
          settings: {
            analysis: {
              filter: {
                synonym_filter: {
                  type: 'synonym',
                  synonyms_path: 'analysis/synonyms.txt', // path relative to Elasticsearch config
                },
              },
              analyzer: {
                search_analyzer: {
                  tokenizer: 'standard',
                  filter: ['lowercase', 'synonym_filter'],
                },
              },
            },
          },
          mappings: {
            properties: {
              // Core fields
              id: { type: 'keyword' },
              name: {
                type: 'text',
                analyzer: 'standard',
                search_analyzer: 'search_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              description: {
                type: 'text',
                analyzer: 'standard',
                search_analyzer: 'search_analyzer',
              },
              category: { type: 'keyword' },
              brand: { type: 'keyword' },          // optional, for brand filtering
              price: { type: 'float' },
              rating: { type: 'float' },
              soldCount: { type: 'integer' },
              tags: { type: 'keyword' },
              isActive: { type: 'boolean' },
              sellerId: { type: 'keyword' },
              createdAt: { type: 'date' },

              // Promoted listings (boosting)
              isPromoted: { type: 'boolean' },
              promotionEndDate: { type: 'date' },

              // Geo‑location (for distance searches)
              location: { type: 'geo_point' },

              // Autocomplete (completion suggester)
              name_suggest: { type: 'completion' },
            },
          },
        },
      });
      console.log(`✅ Elasticsearch index '${INDEX_NAME}' created.`);
    } else {
      console.log(`ℹ️ Elasticsearch index '${INDEX_NAME}' already exists.`);
    }
  } catch (err) {
    console.error('❌ Failed to create Elasticsearch index:', err.message);
  }
};

module.exports = { client, INDEX_NAME, createIndex };