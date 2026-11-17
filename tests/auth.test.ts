import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/lib/password.js';
import { REFRESH_COOKIE_NAME } from '../src/lib/cookies.js';
import { User } from '../src/models/index.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

function asCookieArray(setCookie: string | string[] | undefined): string[] {
  if (!setCookie) return [];
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

function extractRefreshCookie(setCookie: string | string[] | undefined): string | undefined {
  for (const header of asCookieArray(setCookie)) {
    if (header.startsWith(`${REFRESH_COOKIE_NAME}=`)) {
      return header.split(';')[0];
    }
  }
  return undefined;
}

describe('auth core', () => {
  const app = createApp();
  const email = 'alice@example.com';
  const password = 'Password123!';

  beforeEach(async () => {
    await User.deleteMany({});
    await User.create({
      name: 'Alice',
      email,
      passwordHash: await hashPassword(password),
      role: 'user',
      interests: ['chess'],
    });
  });

  it('logs in with valid credentials and sets an httpOnly refresh cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      email,
      name: 'Alice',
      role: 'user',
      interests: ['chess'],
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('tokenVersion');

    const cookie = extractRefreshCookie(res.headers['set-cookie']);
    expect(cookie).toBeTruthy();
    const cookieHeader = asCookieArray(res.headers['set-cookie']).join(';');
    expect(cookieHeader).toMatch(/HttpOnly/i);
    expect(cookieHeader).toMatch(/Path=\/api\/auth/i);
  });

  it('returns the same INVALID_CREDENTIALS for wrong email and wrong password', async () => {
    const wrongEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password });
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' });

    for (const res of [wrongEmail, wrongPassword]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
      });
    }
  });

  it('rejects invalid login bodies with VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rotates the refresh cookie and returns a new access token', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password });
    const cookie = extractRefreshCookie(login.headers['set-cookie'])!;

    const refresh = await request(app)
      .post('/api/auth/refresh')
      .set(CSRF)
      .set('Cookie', cookie);

    expect(refresh.status).toBe(200);
    expect(refresh.body.accessToken).toEqual(expect.any(String));
    expect(refresh.body.accessToken).not.toBe(login.body.accessToken);
    expect(refresh.body.user.email).toBe(email);

    const rotated = extractRefreshCookie(refresh.headers['set-cookie']);
    expect(rotated).toBeTruthy();
    expect(rotated).not.toBe(cookie);
  });

  it('requires the X-Requested-With header on refresh and logout', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password });
    const cookie = extractRefreshCookie(login.headers['set-cookie'])!;

    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(refresh.status).toBe(403);
    expect(refresh.body.error.code).toBe('CSRF_REJECTED');

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(403);
    expect(logout.body.error.code).toBe('CSRF_REJECTED');
  });

  it('logout bumps tokenVersion so refresh afterwards fails', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password });
    const cookie = extractRefreshCookie(login.headers['set-cookie'])!;

    const logout = await request(app).post('/api/auth/logout').set(CSRF).set('Cookie', cookie);
    expect(logout.status).toBe(204);

    const user = await User.findOne({ email });
    expect(user?.tokenVersion).toBe(1);

    const refresh = await request(app).post('/api/auth/refresh').set(CSRF).set('Cookie', cookie);
    expect(refresh.status).toBe(401);
    expect(refresh.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rate-limits repeated login attempts per IP', async () => {
    process.env.RATE_LIMIT_LOGIN_MAX = '3';
    const limitedApp = createApp();

    for (let i = 0; i < 3; i += 1) {
      const res = await request(limitedApp)
        .post('/api/auth/login')
        .send({ email, password: 'wrong-password' });
      expect(res.status).toBe(401);
    }

    const blocked = await request(limitedApp)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');

    delete process.env.RATE_LIMIT_LOGIN_MAX;
  });
});
