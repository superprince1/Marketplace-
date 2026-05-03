📘 documentation.md – Complete Marketplace Documentation

```markdown
# Marketplace Platform Documentation

**Version:** 1.0.0  
**Author:** Prince Stephen Mordi  
**License:** UNLICENSED (Private)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Key Features](#key-features)
4. [System Architecture](#system-architecture)
5. [Installation & Setup](#installation--setup)
6. [Environment Variables](#environment-variables)
7. [API Documentation](#api-documentation)
8. [Frontend Components](#frontend-components)
9. [Admin Panel](#admin-panel)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)
13. [Monetization](#monetization)
14. [Digital Products](#digital-products)
15. [Real‑time Chat](#real‑time-chat)
16. [Email Notifications](#email-notifications)
17. [SEO & Marketing](#seo--marketing)
18. [Security](#security)
19. [Contributing](#contributing)
20. [License](#license)

---

## Project Overview

**Marketplace** is a full‑featured, multi‑vendor e‑commerce platform where:
- **Buyers** can browse products, add to cart, checkout, leave reviews, and chat with sellers.
- **Sellers** can manage products, orders, track shipments, run promotions (coupons), and view analytics.
- **Admins** have full control over users, products, orders, monetization, homepage layout, and platform settings.

The platform supports both **physical** and **digital** products (downloadable files, license keys) with secure download tokens.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express.js, MongoDB (Mongoose), Socket.io |
| **Frontend** | React 18, React Router, Axios, Context API |
| **Authentication** | JWT, bcrypt |
| **File Upload** | Cloudinary + Multer |
| **Email** | Nodemailer |
| **Newsletter** | Mailchimp API |
| **Payments** | Simulated (ready for Stripe/PayPal/Paystack/Coinbase) |
| **Testing** | Jest, Supertest, MongoDB Memory Server, Cypress, k6 |
| **Security** | Helmet, express-rate-limit, CORS, input sanitization, HTTPS redirect |
| **Charts** | Recharts |
| **SEO** | react-helmet-async |

---

## Key Features

### Core Marketplace
- User registration / login (buyer, seller, admin)
- Product listing with search, filters (category, price), pagination
- Product detail page with image gallery, variations, stock status
- Shopping cart (persistent in localStorage)
- Checkout with shipping address, tax, shipping cost
- Order history & order detail page
- Cancel order (before shipping)
- Product reviews & ratings (star system, verified purchase)
- Wishlist (save products for later)

### Seller Features
- Seller dashboard (products, orders, analytics, shop profile)
- Product management (add, edit, delete, restore, variations, digital files)
- Order management (update status, add tracking)
- Coupon creation (percentage/fixed discount)
- Shop profile (custom slug, banner, policies, social links)
- Analytics (sales chart, top products)

### Admin Features
- Admin dashboard with statistics (users, products, orders, revenue)
- User management (view, edit role, activate/deactivate, delete)
- Product management (view all, toggle featured/active, delete)
- Order management (update status, payment status, tracking)
- Monetization settings (commission, subscriptions, promoted listings, fees)
- Homepage section manager (enable/disable, reorder, edit titles/links)
- General platform settings (site name, tax, shipping, currency, timezone)
- Activity logs (filter by action, date range)

### Communication & Marketing
- Real‑time chat between buyer and seller (Socket.io)
- Email notifications (order confirmation, shipping update)
- Blog (create, edit, publish posts)
- Newsletter subscription (Mailchimp integration)
- Social sharing buttons (Facebook, Twitter, LinkedIn, WhatsApp, Reddit)
- SEO meta tags per product (react-helmet)

### Digital Products
- Upload files (Cloudinary) and assign to product
- License keys management (bulk add, assign on download)
- Max downloads per customer (configurable)
- Secure download tokens (expire after 7 days, IP logging)

### Security & Performance
- JWT authentication with role‑based access
- Rate limiting (API and auth endpoints)
- Helmet for security headers
- CORS hardened (restrict to trusted origins)
- Input sanitization (XSS protection)
- HTTPS redirect in production
- Unit tests (backend & frontend)
- End‑to‑end tests (Cypress)
- Load testing (k6 / Artillery)

---

## System Architecture

```

Client (React App)
│
├─ HTTP / Socket.io
│
▼
Backend (Node.js + Express)
│
├─ Routes (auth, products, orders, chat, shop, coupons, analytics, blog, newsletter, upload, digital, admin)
├─ Middleware (auth, admin, rateLimit, sanitize)
├─ Models (User, Product, Order, Review, Shop, Coupon, Post, Message, PlatformSettings, HomepageSection)
│
▼
Database (MongoDB)
│
└─ Cloudinary (images/files), Mailchimp (newsletter), Nodemailer (email)

```

---

## Installation & Setup

### Prerequisites
- Node.js v16+ and npm
- MongoDB (local or Atlas)
- Cloudinary account (free tier)
- Mailchimp account (optional, for newsletter)

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/marketplace.git
cd marketplace
```

Step 2: Backend Setup

```bash
cd backend
npm install
```

Create .env file (see Environment Variables).

Start MongoDB locally or use Atlas URI.

Run database seed (optional):

```bash
npm run seed
```

Create admin user:

```bash
npm run create-admin
```

Start backend:

```bash
npm run dev   # development with auto‑restart
# or
npm start     # production
```

Step 3: Frontend Setup

```bash
cd frontend
npm install
```

Create .env file in frontend root:

```
REACT_APP_API_URL=http://localhost:5000/api
```

Start frontend:

```bash
npm start
```

Open http://localhost:3000

---

Environment Variables

Backend .env

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/marketplace

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=30d

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@marketplace.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Mailchimp
MAILCHIMP_API_KEY=your-api-key-us21
MAILCHIMP_SERVER_PREFIX=us21
MAILCHIMP_AUDIENCE_ID=your-audience-id

# Paystack (optional)
PAYSTACK_SECRET_KEY=sk_test_...

# Coinbase (optional)
COINBASE_API_KEY=your_coinbase_api_key
```

Frontend .env

```
REACT_APP_API_URL=http://localhost:5000/api
```

---

API Documentation

Authentication

Method Endpoint Description Access
POST /api/auth/register Register new user (buyer/seller) Public
POST /api/auth/login Login, returns JWT Public
GET /api/auth/me Get current user Private
PUT /api/auth/profile Update profile Private
PUT /api/auth/change-password Change password Private

Products

Method Endpoint Description Access
GET /api/products List products (filter, sort, paginate) Public
GET /api/products/:id Get single product Public
GET /api/products/seller/:sellerId Get seller's products Public
POST /api/products Create product Seller only
PUT /api/products/:id Update product Owner seller
DELETE /api/products/:id Soft delete product Owner seller
POST /api/products/:id/restore Restore product Owner seller
POST /api/products/:id/promote Promote product (cost deducted from balance) Seller only

Orders

Method Endpoint Description Access
POST /api/orders/checkout Create order from cart Buyer
POST /api/orders/:id/pay Simulate payment Buyer
GET /api/orders Get buyer's orders Buyer
GET /api/orders/:id Get single order Buyer/Seller
PUT /api/orders/:id/cancel Cancel order Buyer
GET /api/orders/seller/orders Get seller's orders Seller
PUT /api/orders/:id/status Update order status Seller
POST /api/orders/:id/tracking Add tracking Seller

Other Endpoints

Endpoint Description
/api/reviews Product reviews & ratings
/api/wishlist User wishlist (add/remove/view)
/api/chat Chat messages & conversations
/api/shop Shop profiles (public, seller)
/api/coupons Promo codes (validate, create)
/api/analytics Seller analytics (sales chart, top products)
/api/blog Blog posts (list, single, create, update)
/api/newsletter Mailchimp subscription
/api/upload Cloudinary image upload
/api/digital Digital product file upload, license keys, download tokens
/api/admin/* Admin panel endpoints (users, products, orders, settings, homepage)

---

Frontend Components

Pages

· / – Homepage (dynamic sections controlled by admin)
· /products – Product listing with filters & pagination
· /product/:id – Product detail (reviews, wishlist, chat)
· /cart – Shopping cart
· /checkout – Shipping & payment (redirect from cart)
· /orders – Order history
· /order/:id – Order detail (download digital items)
· /wishlist – Saved products
· /seller/* – Seller dashboard (products, orders, analytics, shop, coupons)
· /admin/* – Admin panel (stats, users, products, orders, monetization, homepage, settings, logs)
· /blog – Blog listing
· /blog/:slug – Blog post
· /shop/:slug – Seller's public storefront
· /newsletter – Newsletter subscription page

Reusable Components

· Navbar, Footer
· ProductCard, ProductList, ProductFilters
· StarRating, ReviewSection
· WishlistButton, WishlistPage
· ChatWidget (floating chat)
· SocialShare
· ImageUpload
· LoadingSpinner, NotFound
· NewsletterSignup

---

Admin Panel

Accessible at /admin (admin user only). Tabs:

Tab Description
Statistics Platform overview: total users, products, orders, revenue, monthly chart.
Users View, filter, edit role, activate/deactivate, delete users.
Products View all products, search, toggle featured/active, delete permanently.
Orders View all orders, update status, payment status, tracking number.
Monetization Enable/disable commission, listing fees, promoted listings, subscriptions, transaction fee, shipping markup, withdrawal fees, premium shop, lead generation, advertising banner. Configure rates and prices. Manage subscription plans.
Homepage Enable/disable sections, reorder, edit titles, links, product limits.
Settings General platform settings: site name, tax rate, free shipping threshold, default shipping cost, currency, timezone, order prefix, min order amount, enable reviews.
Activity Logs Filter admin actions by type and date range.

---

Testing

Backend Unit Tests (Jest)

```bash
cd backend
npm test          # run once
npm run test:watch  # watch mode
```

Frontend Unit Tests (Jest + React Testing Library)

```bash
cd frontend
npm test
```

End‑to‑End (Cypress)

```bash
cd frontend
npx cypress open      # interactive
npx cypress run       # headless
```

Load Testing (k6)

```bash
k6 run load-test.js
```

---

Deployment

Backend (Render / Railway / AWS)

1. Push code to GitHub.
2. Create a new Web Service on Render (or similar).
3. Set environment variables (same as .env).
4. Build command: npm install
5. Start command: npm start
6. Add MongoDB Atlas URI as MONGODB_URI.

Frontend (Vercel / Netlify)

1. Connect your GitHub repository.
2. Build command: npm run build
3. Publish directory: build
4. Set environment variable: REACT_APP_API_URL = your backend API URL.

Production Checklist

· Set NODE_ENV=production
· Use HTTPS (Render/Netlify provide it automatically)
· Set strong JWT secret
· Enable rate limiting (already done)
· Use real email SMTP (SendGrid, AWS SES)
· Enable Cloudinary secure delivery
· Run database backups

---

Troubleshooting

Issue Solution
MongoDB connection error Check MONGODB_URI and ensure MongoDB is running.
JWT invalid Check JWT_SECRET is consistent across restarts.
CORS error Ensure CLIENT_URL in backend .env matches frontend URL.
Image upload fails Verify Cloudinary credentials and folder permissions.
Chat not working Ensure Socket.io is running and firewall allows WebSocket.
Email not sent Check SMTP credentials and use less secure apps / app password.
Tests fail Run npm install again, ensure MongoDB Memory Server is compatible.

---

Monetization

The platform includes a full monetization suite that the admin can enable/disable from the Admin → Monetization tab:

· Commission per sale – percentage of each order.
· Listing fees – per product listing.
· Promoted listings – sellers pay per day to boost visibility.
· Subscription plans – monthly plans that override commission rate and product limits.
· Transaction fee markup – extra percentage on top of payment gateway fee.
· Shipping markup – flat fee added to shipping cost.
· Withdrawal / payout fees – fixed and/or percentage fee when sellers withdraw earnings.
· Premium shop features – one‑time fee for additional shop capabilities.
· Lead generation – export email list for a price.
· Advertising banner – show a custom HTML/image banner on the homepage.

All rates and toggles are stored in PlatformSettings model and respected across the platform.

---

Digital Products

Sellers can create digital products (e‑books, software, printables). Features:

· Upload files via Cloudinary (multiple files per product).
· Add license keys (bulk upload, assigned on first download).
· Set maximum downloads per customer (default 3).
· Buyers receive a secure download token (valid 7 days) after purchase.
· Download limit enforced; IP address logged.
· License keys revealed only on first download.

---

Real‑time Chat

Buyers and sellers can chat directly on product pages. Powered by Socket.io:

· Conversation ID based on buyer‑seller‑product.
· Messages stored in Message model with read receipts.
· Unread message counts and conversation list available via API.
· Seller can see all conversations with buyers.

---

Email Notifications

· Order confirmation – sent to buyer after successful checkout.
· Shipping update – sent to buyer when seller marks order as shipped and adds tracking number.

Emails use Nodemailer; templates are in backend/utils/emailTemplates.js. Configure SMTP in .env.

---

SEO & Marketing

· Dynamic meta tags per product using react-helmet-async.
· Blog with categories, tags, author, and SEO‑friendly slugs.
· Social sharing buttons (Facebook, Twitter, LinkedIn, WhatsApp, Reddit).
· Newsletter subscription via Mailchimp (backend endpoint /api/newsletter/subscribe).
· Open Graph & Twitter Card meta tags in index.html.

---

Security

· Helmet – sets secure HTTP headers.
· Rate limiting – protects API from abuse.
· CORS – restricts to trusted origins only.
· Input sanitization – removes < > characters from all user input (basic XSS protection).
· JWT – stateless authentication with role‑based access.
· HTTPS redirect – in production, all HTTP traffic is redirected to HTTPS.
· Password hashing – bcrypt with salt.

---

Contributing

This project is private and not open for external contributions. Internal team members should follow the existing code style and write tests for new features.

---

License

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited. © 2025 Prince Stephen Mordi. All rights reserved.

---

Support

For questions or issues, contact:
Prince Stephen Mordi – [your-email@example.com]

---

Thank you for using Marketplace Platform! 🚀

```

This `documentation.md` file can be placed in the project root. It covers everything from installation to advanced features, making it easy for any developer or admin to understand and operate the marketplace.