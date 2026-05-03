/**
 * Create Admin User Script
 * 
 * This script creates an admin user in the database.
 * It can be run via: npm run create-admin
 * 
 * Features:
 * - Interactive prompts for admin details (name, email, password)
 * - Checks if admin already exists
 * - Option to upgrade existing user to admin
 * - Secure password hashing
 * - Input validation
 * - Colorful console output for better UX
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import User model (adjust path if needed)
const User = require('../models/User');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper to prompt user
const askQuestion = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isStrongPassword = (password) => {
  return password.length >= 6;
};

// Main function
const createAdmin = async () => {
  console.log(`\n${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}       MARKETPLACE ADMIN CREATION TOOL${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/marketplace';
    console.log(`${colors.blue}📡 Connecting to MongoDB...${colors.reset}`);
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}\n`);

    // Get admin details from user input
    console.log(`${colors.yellow}📝 Enter admin user details:${colors.reset}\n`);

    // Name
    let name = await askQuestion(`${colors.bright}Full Name${colors.reset} (default: Super Admin): `);
    if (!name.trim()) name = 'Super Admin';
    name = name.trim();

    // Email
    let email = await askQuestion(`${colors.bright}Email${colors.reset} (default: admin@marketplace.com): `);
    if (!email.trim()) email = 'admin@marketplace.com';
    email = email.toLowerCase().trim();
    
    while (!isValidEmail(email)) {
      console.log(`${colors.red}❌ Invalid email format. Please try again.${colors.reset}`);
      email = await askQuestion(`${colors.bright}Email${colors.reset}: `);
      email = email.toLowerCase().trim();
    }

    // Password
    let password = await askQuestion(`${colors.bright}Password${colors.reset} (min 6 chars, default: Admin@123): `);
    if (!password.trim()) password = 'Admin@123';
    password = password.trim();
    
    while (!isStrongPassword(password)) {
      console.log(`${colors.red}❌ Password must be at least 6 characters.${colors.reset}`);
      password = await askQuestion(`${colors.bright}Password${colors.reset} (min 6 chars): `);
      password = password.trim();
    }

    // Phone (optional)
    let phone = await askQuestion(`${colors.bright}Phone${colors.reset} (optional): `);
    phone = phone.trim() || undefined;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log(`\n${colors.yellow}⚠️ User with email ${email} already exists.${colors.reset}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Admin: ${existingUser.isAdmin ? 'Yes' : 'No'}\n`);
      
      if (!existingUser.isAdmin) {
        const makeAdmin = await askQuestion(`Make this user an admin? (y/n): `);
        if (makeAdmin.toLowerCase() === 'y') {
          existingUser.isAdmin = true;
          existingUser.role = 'admin';
          await existingUser.save();
          console.log(`\n${colors.green}✅ User ${existingUser.name} is now an admin.${colors.reset}`);
        } else {
          console.log(`\n${colors.yellow}❌ Operation cancelled. No changes made.${colors.reset}`);
        }
      } else {
        console.log(`${colors.green}✅ User is already an admin.${colors.reset}`);
      }
      
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin user
    const admin = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      isAdmin: true,
      phone,
      isActive: true,
      createdAt: new Date()
    });

    await admin.save();

    // Success output
    console.log(`\n${colors.green}${colors.bright}✅ Admin user created successfully!${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}📧 Email:${colors.reset} ${email}`);
    console.log(`${colors.bright}🔑 Password:${colors.reset} ${password}`);
    console.log(`${colors.bright}👤 Name:${colors.reset} ${name}`);
    console.log(`${colors.bright}🆔 User ID:${colors.reset} ${admin._id}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`\n${colors.yellow}⚠️ Please save these credentials securely.${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Error creating admin:${colors.reset}`, error.message);
    process.exit(1);
  } finally {
    // Close database connection and readline interface
    await mongoose.disconnect();
    rl.close();
    console.log(`${colors.blue}👋 Database connection closed.${colors.reset}\n`);
  }
};

// Run the script
createAdmin();