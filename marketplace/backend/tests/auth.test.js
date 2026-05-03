const request = require('supertest');
const { app } = require('./setup');
const User = require('../models/User');

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    const validUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'buyer',
    };

    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body).toHaveProperty('token');
    });

    it('should reject duplicate email', async () => {
      await User.create(validUser);
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: '', email: 'invalid', password: '123' });
      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Login User', email: 'login@test.com', password: 'pass123', role: 'buyer' });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'pass123' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', 'login@test.com');
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'wrong' });
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/Invalid credentials/i);
    });

    it('should reject non‑existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'pass' });
      expect(res.statusCode).toBe(401);
    });
  });
});