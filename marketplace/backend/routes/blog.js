const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');

// Helper: generate unique slug
const generateSlug = (title) => {
  let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug;
};

// Public: get all published posts (paginated)
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    const filter = { status: 'published' };
    if (category) filter.categories = category;
    const posts = await Post.find(filter)
      .populate('author', 'name avatar')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Post.countDocuments(filter);
    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: get single post by slug
router.get('/posts/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: 'published' }).populate('author', 'name avatar');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.views += 1;
    await post.save();
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin/Seller: create post
router.post('/posts', auth, async (req, res) => {
  try {
    const { title, content, excerpt, featuredImage, categories, tags, status } = req.body;
    let slug = generateSlug(title);
    // ensure unique slug
    let uniqueSlug = slug;
    let count = 1;
    while (await Post.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${slug}-${count++}`;
    }
    const post = new Post({
      title,
      slug: uniqueSlug,
      content,
      excerpt,
      featuredImage,
      categories,
      tags,
      status,
      author: req.user.id,
      publishedAt: status === 'published' ? new Date() : null,
    });
    await post.save();
    res.status(201).json({ success: true, post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update post
router.put('/posts/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { title, content, excerpt, featuredImage, categories, tags, status } = req.body;
    if (title) post.title = title;
    if (content) post.content = content;
    if (excerpt) post.excerpt = excerpt;
    if (featuredImage) post.featuredImage = featuredImage;
    if (categories) post.categories = categories;
    if (tags) post.tags = tags;
    if (status && status !== post.status) {
      post.status = status;
      if (status === 'published' && !post.publishedAt) post.publishedAt = new Date();
    }
    await post.save();
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete post
router.delete('/posts/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    await post.remove();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;