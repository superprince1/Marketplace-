const express = require('express');
const router = express.Router();
const Page = require('../models/Page');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { body, param, validationResult } = require('express-validator');

// ========== PUBLIC ROUTES ==========

// Get a single page by slug (published only)
router.get('/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug, isPublished: true })
      .select('title slug content excerpt metaTitle metaDescription template publishedAt');
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json({ success: true, page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all pages (for sitemap – only slugs and lastmod)
router.get('/', async (req, res) => {
  try {
    const pages = await Page.find({ isPublished: true })
      .select('slug updatedAt')
      .lean();
    res.json({ success: true, pages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMIN ROUTES (protected) ==========

// Get all pages (admin – including unpublished)
router.get('/admin/all', auth, admin, async (req, res) => {
  try {
    const pages = await Page.find().sort({ createdAt: -1 }).populate('authorId', 'name');
    res.json({ success: true, pages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single page by ID (admin)
router.get('/admin/:id', auth, admin, param('id').isMongoId(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const page = await Page.findById(req.params.id).populate('authorId', 'name');
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json({ success: true, page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new page (admin)
router.post('/admin', auth, admin, [
  body('title').notEmpty().trim().escape().isLength({ min: 3, max: 200 }),
  body('content').notEmpty(),
  body('slug').optional().trim().escape().isSlug(),
  body('excerpt').optional().trim().escape().isLength({ max: 500 }),
  body('metaTitle').optional().trim().escape().isLength({ max: 200 }),
  body('metaDescription').optional().trim().escape().isLength({ max: 500 }),
  body('template').optional().isIn(['default', 'full-width', 'narrow']),
  body('isPublished').optional().isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { title, slug, content, excerpt, metaTitle, metaDescription, template, isPublished } = req.body;
    // Check if slug already exists
    const slugToUse = slug || title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
    const existing = await Page.findOne({ slug: slugToUse });
    if (existing) return res.status(400).json({ error: 'Slug already exists. Choose a different slug.' });
    const page = new Page({
      title,
      slug: slugToUse,
      content,
      excerpt,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt || content.substring(0, 160).replace(/<[^>]*>/g, ''),
      template: template || 'default',
      isPublished: isPublished !== undefined ? isPublished : true,
      authorId: req.user.id,
    });
    await page.save();
    res.status(201).json({ success: true, page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a page (admin)
router.put('/admin/:id', auth, admin, param('id').isMongoId(), [
  body('title').optional().trim().escape().isLength({ min: 3, max: 200 }),
  body('content').optional(),
  body('slug').optional().trim().escape().isSlug(),
  body('excerpt').optional().trim().escape().isLength({ max: 500 }),
  body('metaTitle').optional().trim().escape().isLength({ max: 200 }),
  body('metaDescription').optional().trim().escape().isLength({ max: 500 }),
  body('template').optional().isIn(['default', 'full-width', 'narrow']),
  body('isPublished').optional().isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const page = await Page.findById(req.params.id);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    const { title, slug, content, excerpt, metaTitle, metaDescription, template, isPublished } = req.body;
    if (title) page.title = title;
    if (content) page.content = content;
    if (slug && slug !== page.slug) {
      const existing = await Page.findOne({ slug, _id: { $ne: page._id } });
      if (existing) return res.status(400).json({ error: 'Slug already exists' });
      page.slug = slug;
    }
    if (excerpt !== undefined) page.excerpt = excerpt;
    if (metaTitle !== undefined) page.metaTitle = metaTitle;
    if (metaDescription !== undefined) page.metaDescription = metaDescription;
    if (template) page.template = template;
    if (isPublished !== undefined) page.isPublished = isPublished;
    if (isPublished === true && !page.publishedAt) page.publishedAt = new Date();
    await page.save();
    res.json({ success: true, page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a page (admin)
router.delete('/admin/:id', auth, admin, param('id').isMongoId(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;