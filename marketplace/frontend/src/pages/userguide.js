import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const UserGuide = () => {
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    { id: 'getting-started', title: 'Getting Started' },
    { id: 'for-buyers', title: 'For Buyers' },
    { id: 'for-sellers', title: 'For Sellers' },
    { id: 'for-admins', title: 'For Admins' },
    { id: 'security-privacy', title: 'Security & Privacy' },
    { id: 'troubleshooting', title: 'Troubleshooting & FAQ' },
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <div style={styles.container}>
      {/* Sticky Table of Contents */}
      <div style={styles.toc}>
        <h3>📖 Contents</h3>
        <ul style={styles.tocList}>
          {sections.map(section => (
            <li key={section.id}>
              <button
                onClick={() => scrollToSection(section.id)}
                style={{
                  ...styles.tocLink,
                  fontWeight: activeSection === section.id ? 'bold' : 'normal',
                  color: activeSection === section.id ? '#007bff' : '#333',
                }}
              >
                {section.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        <h1 style={styles.title}>📘 Marketplace Platform – Complete User Guide</h1>

        {/* ========== GETTING STARTED ========== */}
        <section id="getting-started" style={styles.section}>
          <h2>Getting Started</h2>
          <p>The marketplace supports three user roles:</p>
          <ul>
            <li><strong>Buyer</strong> – purchases products.</li>
            <li><strong>Seller</strong> – lists products, manages orders, and runs a shop.</li>
            <li><strong>Admin</strong> – controls platform settings, users, and monetization.</li>
          </ul>
          <p>To access the platform, go to <code>https://yourdomain.com</code>.</p>
        </section>

        {/* ========== FOR BUYERS ========== */}
        <section id="for-buyers" style={styles.section}>
          <h2>For Buyers</h2>
          <h3>Registration & Login</h3>
          <ul>
            <li>Click <strong>Register</strong> (top right).</li>
            <li>Fill in your name, email, password, and select <strong>Buyer</strong>.</li>
            <li>After registration, you are automatically logged in.</li>
            <li>Use <strong>Login</strong> with your email and password.</li>
          </ul>

          <h3>Browsing & Searching Products</h3>
          <ul>
            <li><strong>Homepage</strong> displays featured products, categories, and flash deals.</li>
            <li>Use the <strong>search bar</strong> (top) to find products by name.</li>
            <li>Use <strong>filters</strong> (category, price range, rating, in‑stock) on the left sidebar.</li>
            <li>Sort by <strong>newest, price low‑high, price high‑low, top rated, best selling</strong>.</li>
          </ul>

          <h3>Product Variations & Digital Products</h3>
          <ul>
            <li>Some products have variations (size, color, material). Select an option before adding to cart.</li>
            <li><strong>Digital products</strong> (ebooks, software, printables) are marked with a “Instant Download” badge. They do not require shipping.</li>
          </ul>

          <h3>Adding to Cart & Checkout</h3>
          <ul>
            <li>On a product page, choose quantity and click <strong>Add to Cart</strong>.</li>
            <li>The cart icon shows the item count.</li>
            <li>Go to <strong>Cart</strong> (top right) to review items, update quantities, or remove items.</li>
            <li>Click <strong>Proceed to Checkout</strong>.</li>
            <li>Fill in your <strong>shipping address</strong> (required only for physical products).</li>
            <li>Choose a payment method: <strong>Stripe</strong>, <strong>PayPal</strong>, <strong>Paystack</strong>, <strong>Coinbase</strong>, or <strong>Cash on Delivery</strong>.</li>
            <li>Add order notes (optional).</li>
            <li>Click <strong>Place Order & Pay</strong> – you will be redirected to the payment gateway.</li>
            <li>After successful payment, you are redirected to the order confirmation page.</li>
          </ul>

          <h3>Order History & Tracking</h3>
          <ul>
            <li>Go to <strong>My Orders</strong> (top right, under your name).</li>
            <li>Each order shows status: pending, processing, shipped, delivered, cancelled.</li>
            <li>Click <strong>View Details</strong> to see full order info, items, shipping address, and tracking number.</li>
            <li>If the order is pending or processing and not yet paid, you can <strong>cancel</strong> it.</li>
          </ul>

          <h3>Reviews & Ratings</h3>
          <ul>
            <li>After receiving a product, go to the product page.</li>
            <li>Click <strong>Write a Review</strong> (only appears if you purchased and received the item).</li>
            <li>Select a star rating (1‑5) and write a comment.</li>
            <li>Other buyers can mark your review as <strong>helpful</strong>.</li>
          </ul>

          <h3>Wishlist</h3>
          <ul>
            <li>On any product card or detail page, click the heart icon to <strong>save</strong> to your wishlist.</li>
            <li>Access your wishlist via the <strong>Wishlist</strong> link in the navigation bar.</li>
            <li>Remove items or add them directly to the cart.</li>
          </ul>

          <h3>Real‑time Chat with Sellers</h3>
          <ul>
            <li>On a product page, look for the <strong>Chat with Seller</strong> button.</li>
            <li>A chat widget opens at the bottom right.</li>
            <li>Send messages; the seller will receive them instantly (if online). Chat history is saved.</li>
          </ul>
        </section>

        {/* ========== FOR SELLERS ========== */}
        <section id="for-sellers" style={styles.section}>
          <h2>For Sellers</h2>
          <h3>Becoming a Seller</h3>
          <ul>
            <li>Register as <strong>Seller</strong> during sign‑up.</li>
            <li>If already a buyer, go to your profile and change role (admin must approve role change, or you can upgrade via settings).</li>
          </ul>

          <h3>Shop Profile (Custom URL, Banner, Policies)</h3>
          <ul>
            <li>Go to <strong>Seller Dashboard → Shop Profile</strong>.</li>
            <li>Set your shop name, custom URL (e.g., <code>/shop/my-shop</code>), logo, banner, description.</li>
            <li>Add policies (returns, shipping, payment) and social links.</li>
            <li>Save – your shop page becomes public at <code>/shop/your-slug</code>.</li>
          </ul>

          <h3>Managing Products</h3>
          <ul>
            <li>Go to <strong>Seller Dashboard → Products</strong>.</li>
            <li><strong>Add New Product</strong>: fill in name, price, description, category, stock, images (upload via Cloudinary), tags.</li>
            <li>For <strong>digital products</strong>: check “Digital Product”, set max downloads, upload files, add license keys (one per line).</li>
            <li><strong>Variations</strong>: enable “Product has variations”, add types (size/color/material) and options (value, price adjustment, stock, SKU).</li>
            <li><strong>Edit</strong> or <strong>Delete</strong> (soft delete) products. Deleted products can be <strong>Restored</strong>.</li>
          </ul>

          <h3>Managing Orders & Status Updates</h3>
          <ul>
            <li>Go to <strong>Seller Dashboard → Orders</strong>.</li>
            <li>You see orders that contain your products.</li>
            <li>Update order status:
              <ul>
                <li><strong>Pending</strong> → <strong>Processing</strong></li>
                <li><strong>Processing</strong> → <strong>Shipped</strong> (you must add a tracking number)</li>
                <li><strong>Shipped</strong> → <strong>Delivered</strong></li>
              </ul>
            </li>
            <li>After marking as shipped, the buyer receives an email with tracking.</li>
          </ul>

          <h3>Adding Tracking Information</h3>
          <ul>
            <li>On the order detail page (or via the Orders tab), click <strong>Add Tracking</strong>.</li>
            <li>Enter tracking number and carrier (USPS, FedEx, UPS, DHL, Other).</li>
            <li>The buyer can now track the shipment.</li>
          </ul>

          <h3>Coupons</h3>
          <ul>
            <li>Go to <strong>Seller Dashboard → Coupons</strong>.</li>
            <li>Create a coupon code: set discount type (percentage or fixed), discount value, minimum order amount, expiry date, usage limit, and applicable products/categories.</li>
            <li>Share the code with your customers.</li>
          </ul>

          <h3>Seller Analytics</h3>
          <ul>
            <li>Go to <strong>Seller Dashboard → Analytics</strong>.</li>
            <li>View a line chart of your sales over the last 30 days.</li>
            <li>See your top‑selling products and total revenue.</li>
          </ul>

          <h3>Affiliate Program</h3>
          <ul>
            <li>Go to <strong>Affiliate</strong> (link in navbar after login).</li>
            <li>You get a unique referral link (<code>/affiliate/go/YOURCODE?url=...</code>).</li>
            <li>Share the link. When someone clicks and makes a purchase, you earn a commission (percentage set by admin).</li>
            <li>Track clicks, conversions, and earnings in your affiliate dashboard.</li>
            <li>Set your payment method (PayPal, bank, crypto) and request payouts.</li>
          </ul>
        </section>

        {/* ========== FOR ADMINS ========== */}
        <section id="for-admins" style={styles.section}>
          <h2>For Admins</h2>
          <h3>Admin Dashboard Overview</h3>
          <ul>
            <li>Access via <code>/admin</code> (only admin users).</li>
            <li>Tabs: Statistics, Users, Products, Orders, Monetization, Homepage, Affiliates, Settings, Activity Logs.</li>
          </ul>

          <h3>Managing Users</h3>
          <ul>
            <li>Change user role (buyer, seller, admin).</li>
            <li>Activate/deactivate accounts.</li>
            <li>Delete users (cascade deletes their products if seller).</li>
            <li>Promote a user to admin.</li>
          </ul>

          <h3>Managing Products</h3>
          <ul>
            <li>Search by name.</li>
            <li>Toggle featured status.</li>
            <li>Toggle active/inactive.</li>
            <li>Permanently delete any product.</li>
          </ul>

          <h3>Managing Orders</h3>
          <ul>
            <li>Filter by status and payment status.</li>
            <li>Update