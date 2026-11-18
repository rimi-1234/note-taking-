import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { DEMO_ADMIN_EMAIL, DEMO_USER_EMAIL } from '../src/lib/demo.js';
import { hashPassword } from '../src/lib/password.js';
import { signAccessToken } from '../src/lib/tokens.js';
import { Note, Post, User } from '../src/models/index.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function seed() {
  const passwordHash = await hashPassword('Password123!');
  const admin = await User.create({ name: 'Admin', email: DEMO_ADMIN_EMAIL, passwordHash, role: 'admin' });
  const demoUser = await User.create({ name: 'Demo User', email: DEMO_USER_EMAIL, passwordHash, role: 'user' });
  const alice = await User.create({ name: 'Alice', email: 'alice@example.com', passwordHash, role: 'user' });
  return { admin, demoUser, alice };
}

describe('demo accounts', () => {
  const app = createApp();

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Note.deleteMany({}), Post.deleteMany({})]);
  });

  it('gives the demo admin full user management', async () => {
    const { admin, alice } = await seed();
    const token = signAccessToken(admin);

    const created = await request(app)
      .post('/api/admin/users')
      .set(auth(token))
      .send({ name: 'Xavier', email: 'x@example.com', password: 'Password123!' });
    expect(created.status).toBe(201);

    const patched = await request(app)
      .patch(`/api/admin/users/${alice.id}`)
      .set(auth(token))
      .send({ name: 'Alice W', password: 'NewPassword123!' });
    expect(patched.status).toBe(200);

    const deleted = await request(app).delete(`/api/admin/users/${created.body.user._id}`).set(auth(token));
    expect(deleted.status).toBe(204);
  });

  it('stops anyone changing the login details of, or deleting, a demo account', async () => {
    const { admin, demoUser } = await seed();
    const token = signAccessToken(admin);

    for (const target of [admin, demoUser]) {
      for (const body of [{ password: 'NewPassword123!' }, { email: 'new@example.com' }]) {
        const res = await request(app).patch(`/api/admin/users/${target.id}`).set(auth(token)).send(body);
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('DEMO_READ_ONLY');
      }
    }

    const promoted = await request(app)
      .patch(`/api/admin/users/${demoUser.id}`)
      .set(auth(token))
      .send({ role: 'admin' });
    expect(promoted.status).toBe(403);

    const deleted = await request(app).delete(`/api/admin/users/${demoUser.id}`).set(auth(token));
    expect(deleted.status).toBe(403);

    const renamed = await request(app)
      .patch(`/api/admin/users/${demoUser.id}`)
      .set(auth(token))
      .send({ interests: ['music'] });
    expect(renamed.status).toBe(200);
    expect(renamed.body.user.interests).toEqual(['music']);
  });

  it('blocks demo password changes on the profile but allows profile edits', async () => {
    const { admin, demoUser } = await seed();

    for (const user of [admin, demoUser]) {
      const token = signAccessToken(user);
      const pw = await request(app)
        .patch('/api/users/me')
        .set(auth(token))
        .send({ currentPassword: 'Password123!', newPassword: 'NewPassword123!' });
      expect(pw.status).toBe(403);
      expect(pw.body.error.code).toBe('DEMO_READ_ONLY');

      const profile = await request(app).patch('/api/users/me').set(auth(token)).send({ name: 'Renamed' });
      expect(profile.status).toBe(200);
      expect(profile.body.user.name).toBe('Renamed');
    }
  });
});
