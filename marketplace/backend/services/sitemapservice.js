/**
 * services/sitemapService.js
 * Generates dynamic sitemap.xml for:
 * - Products
 * - Categories
 * - Blog posts
 * - Seller shops
 * - Dynamic content pages (CMS)
 * - Static homepage
 * 
 * Supports sitemap index for large sites (>50,000 URLs).
 */

const Product = require('../models/Product');
const Category = require('../models/Category');      // If you have a Category model
const BlogPost = require('../models/BlogPost');      // If you have a blog
const Shop = require('../models/Shop');
const Page = require('../models/Page');              // ✅ Headless CMS pages
const { create } = require('xmlbuilder2');

const BASE_URL = process.env.CLIENT_URL || 'https://yourdomain.com';
const SITEMAP_CACHE_TTL = 3600; // 1 hour in seconds

/**
 * Format a date to YYYY-MM-DD for sitemap <lastmod>
 * @param {Date|string} date
 * @returns {string}
 */
const formatDate = (date) => {
  return date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
};

// ========== URL COLLECTORS ==========

/**
 * Get all active product URLs
 */
const getProductUrls = async () => {
  const products = await Product.find({ isActive: true })
    .select('slug updatedAt')
    .lean();
  return products.map(p => ({
    loc: `${BASE_URL}/product/${p.slug || p._id}`,
    lastmod: formatDate(p.updatedAt),
    changefreq: 'weekly',
    priority: 0.8,
  }));
};

/**
 * Get all active category URLs (if categories have dedicated pages)
 */
const getCategoryUrls = async () => {
  if (!Category) return [];
  const categories = await Category.find({ isActive: true })
    .select('slug updatedAt')
    .lean();
  return categories.map(c => ({
    loc: `${BASE_URL}/category/${c.slug}`,
    lastmod: formatDate(c.updatedAt),
    changefreq: 'daily',
    priority: 0.7,
  }));
};

/**
 * Get all published blog post URLs
 */
const getBlogUrls = async () => {
  if (!BlogPost) return [];
  const posts = await BlogPost.find({ isPublished: true })
    .select('slug updatedAt')
    .lean();
  return posts.map(post => ({
    loc: `${BASE_URL}/blog/${post.slug}`,
    lastmod: formatDate(post.updatedAt),
    changefreq: 'weekly',
    priority: 0.6,
  }));
};

/**
 * Get all active seller shop URLs (custom domain or /shop/:slug)
 */
const getShopUrls = async () => {
  const shops = await Shop.find({ isActive: true })
    .select('slug updatedAt')
    .lean();
  return shops.map(shop => ({
    loc: `${BASE_URL}/shop/${shop.slug}`,
    lastmod: formatDate(shop.updatedAt),
    changefreq: 'weekly',
    priority: 0.5,
  }));
};

/**
 * Get all published CMS content pages (About, Contact, Privacy, Terms, etc.)
 */
const getContentPageUrls = async () => {
  const pages = await Page.find({ isPublished: true })
    .select('slug updatedAt')
    .lean();
  return pages.map(page => ({
    loc: `${BASE_URL}/pages/${page.slug}`,
    lastmod: formatDate(page.updatedAt),
    changefreq: 'monthly',
    priority: 0.5,
  }));
};

/**
 * Static pages (home only – others are managed via CMS)
 */
const getStaticUrls = () => {
  return [
    { loc: `${BASE_URL}/`, changefreq: 'daily', priority: 1.0 },
    // No more hardcoded /about, /contact, /faq – these come from CMS pages.
  ];
};

// ========== SITEMAP GENERATORS ==========

/**
 * Generate the complete sitemap XML (single file)
 * Useful for smaller sites (< 50,000 URLs)
 */
const generateSitemapXml = async () => {
  const productUrls = await getProductUrls();
  const categoryUrls = await getCategoryUrls();
  const blogUrls = await getBlogUrls();
  const shopUrls = await getShopUrls();
  const contentPageUrls = await getContentPageUrls();
  const staticUrls = getStaticUrls();

  const allUrls = [
    ...staticUrls,
    ...productUrls,
    ...categoryUrls,
    ...blogUrls,
    ...shopUrls,
    ...contentPageUrls,
  ];

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

  for (const url of allUrls) {
    const urlElem = root.ele('url');
    urlElem.ele('loc').txt(url.loc);
    if (url.lastmod) urlElem.ele('lastmod').txt(url.lastmod);
    if (url.changefreq) urlElem.ele('changefreq').txt(url.changefreq);
    if (url.priority) urlElem.ele('priority').txt(url.priority.toString());
  }

  return root.end({ prettyPrint: true });
};

/**
 * Generate a sitemap index (multiple sitemap files) for large sites.
 * Each sitemap file should be generated separately and stored.
 * This function returns the index XML.
 */
const generateSitemapIndex = async () => {
  // For large sites, you would generate each sitemap chunk and store them as files.
  // Here we provide the index template.
  const sitemaps = [
    { loc: `${BASE_URL}/sitemap-products.xml`, lastmod: formatDate(new Date()) },
    { loc: `${BASE_URL}/sitemap-categories.xml`, lastmod: formatDate(new Date()) },
    { loc: `${BASE_URL}/sitemap-blog.xml`, lastmod: formatDate(new Date()) },
    { loc: `${BASE_URL}/sitemap-shops.xml`, lastmod: formatDate(new Date()) },
    { loc: `${BASE_URL}/sitemap-pages.xml`, lastmod: formatDate(new Date()) },
    { loc: `${BASE_URL}/sitemap-static.xml`, lastmod: formatDate(new Date()) },
  ];
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('sitemapindex', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });
  for (const sitemap of sitemaps) {
    const sitemapElem = root.ele('sitemap');
    sitemapElem.ele('loc').txt(sitemap.loc);
    sitemapElem.ele('lastmod').txt(sitemap.lastmod);
  }
  return root.end({ prettyPrint: true });
};

module.exports = {
  generateSitemapXml,
  generateSitemapIndex,
  // For external use (e.g., cron job) you may export individual collections as well
};