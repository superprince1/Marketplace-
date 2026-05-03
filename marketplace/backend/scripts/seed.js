/**
 * Database Seeder Script
 * 
 * Populates the database with sample data for testing.
 * Run with: npm run seed
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@marketplace.com',
    password: 'Admin@123',
    role: 'admin',
    isAdmin: true
  },
  {
    name: 'Test Seller',
    email: 'seller@test.com',
    password: 'seller123',
    role: 'seller'
  },
  {
    name: 'Test Buyer',
    email: 'buyer@test.com',
    password: 'buyer123',
    role: 'buyer'
  }
];

const sampleProducts = [
  {
    name: 'Wireless Headphones',
    price: 79.99,
    compareAtPrice: 129.99,
    description: 'High-quality wireless headphones with noise cancellation.',
    category: 'Electronics',
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
    tags: ['audio', 'wireless', 'headphones'],
    isFeatured: true
  },
  {
    name: 'Smart Watch',
    price: 199.99,
    compareAtPrice: 299.99,
    description: 'Fitness tracker with heart rate monitor and GPS.',
    category: 'Electronics',
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
    tags: ['wearable', 'fitness', 'smartwatch'],
    isFeatured: true
  },
  {
    name: 'Cotton T-Shirt',
    price: 19.99,
    description: 'Comfortable 100% cotton t-shirt.',
    category: 'Clothing',
    stock: 100,
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300',
    tags: ['clothing', 'tshirt', 'cotton']
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/marketplace');
    console.log(`${colors.cyan}✅ Connected to MongoDB${colors.reset}`);

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log(`${colors.yellow}🗑️ Cleared existing data${colors.reset}`);

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({ ...userData, password: hashedPassword });
      await user.save();
      createdUsers.push(user);
      console.log(`${colors.green}✅ Created user: ${user.name} (${user.role})${colors.reset}`);
    }

    // Find seller ID for products
    const seller = createdUsers.find(u => u.role === 'seller');
    
    // Create products
    for (const productData of sampleProducts) {
      const product = new Product({
        ...productData,
        sellerId: seller._id,
        sellerName: seller.name
      });
      await product.save();
      console.log(`${colors.green}✅ Created product: ${product.name}${colors.reset}`);
    }

    console.log(`\n${colors.green}${colors.bright}🎉 Database seeded successfully!${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`👤 Admin: admin@marketplace.com / Admin@123`);
    console.log(`👤 Seller: seller@test.com / seller123`);
    console.log(`👤 Buyer: buyer@test.com / buyer123`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}❌ Seed error:${colors.reset}`, error.message);
    process.exit(1);
  }
};

seedDatabase();