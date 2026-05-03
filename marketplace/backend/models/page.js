const mongoose = require('mongoose');

const PageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Page title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    excerpt: {
      type: String,
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    },
    metaTitle: {
      type: String,
      maxlength: [200, 'Meta title cannot exceed 200 characters'],
    },
    metaDescription: {
      type: String,
      maxlength: [500, 'Meta description cannot exceed 500 characters'],
    },
    template: {
      type: String,
      enum: ['default', 'full-width', 'narrow'],
      default: 'default',
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Auto-generate slug from title if not provided
PageSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-');
  }
  if (this.isModified('slug')) {
    this.slug = this.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
  next();
});

module.exports = mongoose.model('Page', PageSchema);