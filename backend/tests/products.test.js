const request = require('supertest');
const { app } = require('./setup');
const User = require('../models/User');
const Product = require('../models/Product');

describe('Product Routes', () => {
  let sellerToken;
  let sellerId;
  let productId;

  beforeAll(async () => {
    const seller = await User.create({
      name: 'Test Seller',
      email: 'seller@test.com',
      password: 'hashed',
      role: 'seller',
      isActive: true,
    });
    sellerId = seller._id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller@test.com', password: 'hashed' });
    sellerToken = loginRes.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      await Product.create([
        { name: 'Product A', price: 10, category: 'Electronics', sellerId, isActive: true },
        { name: 'Product B', price: 20, category: 'Clothing', sellerId, isActive: true },
      ]);
    });

    it('should return all active products', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toBe(200);
      expect(res.body.products).toHaveLength(2);
    });

    it('should filter by category', async () => {
      const res = await request(app).get('/api/products?category=Electronics');
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe('Product A');
    });

    it('should respect pagination', async () => {
      const res = await request(app).get('/api/products?page=1&limit=1');
      expect(res.body.products).toHaveLength(1);
      expect(res.body.pagination.total).toBe(2);
    });
  });

  describe('POST /api/products (seller)', () => {
    const newProduct = {
      name: 'New Item',
      price: 99.99,
      description: 'A great product',
      category: 'Electronics',
      stock: 10,
    };

    it('should create a product with valid token', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(newProduct);
      expect(res.statusCode).toBe(201);
      expect(res.body.product.name).toBe('New Item');
      productId = res.body.product._id;
    });

    it('should reject non‑seller', async () => {
      const buyer = await User.create({ name: 'Buyer', email: 'buyer@test.com', password: 'pass', role: 'buyer' });
      const loginRes = await request(app).post('/api/auth/login').send({ email: 'buyer@test.com', password: 'pass' });
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send(newProduct);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product owned by seller', async () => {
      const res = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ name: 'Updated Name', price: 129.99 });
      expect(res.statusCode).toBe(200);
      expect(res.body.product.name).toBe('Updated Name');
      expect(res.body.product.price).toBe(129.99);
    });

    it('should reject update of non‑owned product', async () => {
      const otherSeller = await User.create({ name: 'Other', email: 'other@test.com', password: 'pass', role: 'seller' });
      const otherLogin = await request(app).post('/api/auth/login').send({ email: 'other@test.com', password: 'pass' });
      const res = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${otherLogin.body.token}`)
        .send({ name: 'Hacked' });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should soft delete product', async () => {
      const res = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(res.statusCode).toBe(200);
      const deleted = await Product.findById(productId);
      expect(deleted.isActive).toBe(false);
    });
  });
});