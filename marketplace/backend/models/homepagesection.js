const mongoose = require('mongoose');

const HomepageSectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['hero', 'categories', 'flashDeals', 'promoted', 'digital', 'topShops', 'recentlyViewed', 'newsletter'],
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  title: String,
  subtitle: String,
  link: String,
  backgroundColor: String,
  image: String,
  imageLink: String,
  slides: [{
    image: String,
    link: String,
    title: String,
    subtitle: String,
  }],
  productLimit: { type: Number, default: 8 },
  productFilters: {
    category: String,
    promoted: Boolean,
    discount: Number,
    sort: String,
  },
  categories: [{
    name: String,
    icon: String,
    color: String,
    link: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('HomepageSection', HomepageSectionSchema);