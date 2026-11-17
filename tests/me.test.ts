import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/lib/password.js';
import { signAccessToken } from '../src/lib/tokens.js';
import { REFRESH_COOKIE_NAME } from '../src/lib/cookies.js';
import { authenticate } from '../src/middleware/authenticate.js';
import { requireRole } from '../src/middleware/require-role.js';
import { errorHandler } from '../src/lib/errors.js';
import { User } from '../src/models/index.js';

async function seedUsers() {
  const passwordHash = await hashPassword('Password123!');
  const user = await User.create({
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash,
    role: 'user',
    interests: ['chess'],
  });
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash,
    role: 'admin',
    interests: [],
  });
  return { user, admin, password: 'Password123!' };
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('RBAC and profile', () => {
  const app = createApp();

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('returns 401 when the Bearer token is missing', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 for an expired or invalid access token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set(authHeader('not.a.jwt'));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 when the user was deleted after the token was issued', async () => {
    const { user } = await seedUsers();
    const token = signAccessToken(user);
    await User.deleteOne({ _id: user._id });

    const res = await request(app).get('/api/users/me').set(authHeader(token));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('GET /api/users/me returns the public profile', async () => {
    const { user } = await seedUsers();
    const token = signAccessToken(user);

    const res = await request(app).get('/api/users/me').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      _id: user._id.toString(),
      email: 'alice@example.com',
      name: 'Alice',
      role: 'user',
      interests: ['chess'],
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('PATCH /api/users/me updates name and interests', async () => {
    const { user } = await seedUsers();
    const token = signAccessToken(user);

    const res = await request(app)
      .patch('/api/users/me')
      .set(authHeader(token))
      .send({ name: 'Alice Updated', interests: [' Reading ', 'Chess'] });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Alice Updated');
    expect(res.body.user.interests).toEqual(['reading', 'chess']);
  });

  it('password change bumps tokenVersion, clears refresh cookie, and revokes old access tokens', async () => {
    const { user, password } = await seedUsers();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password });
    const oldAccess = login.body.accessToken as string;

    const res = await request(app)
      .patch('/api/users/me')
      .set(authHeader(oldAccess))
      .send({ currentPassword: password, newPassword: 'NewPassword9!' });

    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'];
    const cookieText = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie ?? '');
    expect(cookieText).toMatch(new RegExp(`${REFRESH_COOKIE_NAME}=`));

    const refreshedUser = await User.findById(user._id);
    expect(refreshedUser?.tokenVersion).toBe(1);

    const denied = await request(app).get('/api/users/me').set(authHeader(oldAccess));
    expect(denied.status).toBe(401);

    const reLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'NewPassword9!' });
    expect(reLogin.status).toBe(200);
  });

  it('rejects password change when currentPassword is wrong', async () => {
    const { user } = await seedUsers();
    const token = signAccessToken(user);

    const res = await request(app)
      .patch('/api/users/me')
      .set(authHeader(token))
      .send({ currentPassword: 'wrong', newPassword: 'NewPassword9!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');
  });

  it('requireRole blocks non-admins with 403 FORBIDDEN', async () => {
    const { user, admin } = await seedUsers();
    const guardApp = express();
    guardApp.get('/admin-only', authenticate, requireRole('admin'), (_req, res) => {
      res.status(200).json({ ok: true });
    });
    guardApp.use(errorHandler);

    const asUser = await request(guardApp)
      .get('/admin-only')
      .set(authHeader(signAccessToken(user)));
    expect(asUser.status).toBe(403);
    expect(asUser.body.error.code).toBe('FORBIDDEN');

    const asAdmin = await request(guardApp)
      .get('/admin-only')
      .set(authHeader(signAccessToken(admin)));
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body).toEqual({ ok: true });
  });
});
