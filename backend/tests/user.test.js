const request = require('supertest');
const { app } = require('./setup');
const User = require('../models/User');

describe('User Routes', () => {
  let userToken;
  let userId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Profile User', email: 'profile@test.com', password: 'pass123', role: 'buyer' });
    userToken = res.body.token;
    userId = res.body.user._id;
  });

  describe('GET /api/user/profile', () => {
    it('should return current user profile', async () => {
      const res = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('email', 'profile@test.com');
      expect(res.body.user).toHaveProperty('name', 'Profile User');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/user/profile');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should update name and phone', async () => {
      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'New Name', phone: '1234567890' });
      expect(res.statusCode).toBe(200);
      expect(res.body.user.name).toBe('New Name');
      expect(res.body.user.phone).toBe('1234567890');
    });

    it('should update address', async () => {
      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ address: { street: '123 Main St', city: 'Anytown', state: 'CA', zipCode: '90210', country: 'USA' } });
      expect(res.statusCode).toBe(200);
      expect(res.body.user.address.street).toBe('123 Main St');
    });
  });

  describe('PUT /api/user/language', () => {
    it('should update preferred language', async () => {
      const res = await request(app)
        .put('/api/user/language')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ language: 'fr' });
      expect(res.statusCode).toBe(200);
      expect(res.body.language).toBe('fr');
      const user = await User.findById(userId);
      expect(user.preferredLanguage).toBe('fr');
    });

    it('should reject unsupported language', async () => {
      const res = await request(app)
        .put('/api/user/language')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ language: 'xx' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/user/change-password', () => {
    it('should change password with correct current password', async () => {
      const res = await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentPassword: 'pass123', newPassword: 'newpass456' });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/updated/i);
    });

    it('should reject wrong current password', async () => {
      const res = await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentPassword: 'wrong', newPassword: 'newpass' });
      expect(res.statusCode).toBe(401);
    });
  });
});