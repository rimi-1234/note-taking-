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
  const realAdmin = await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash, role: 'admin' });
  const demoAdmin = await User.create({ name: 'Demo Admin', email: DEMO_ADMIN_EMAIL, passwordHash, role: 'admin' });
  const demoUser = await User.create({ name: 'Demo User', email: DEMO_USER_EMAIL, passwordHash, role: 'user' });
  return { realAdmin, demoAdmin, demoUser };
}

describe('demo accounts', () => {
  const app = createApp();

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Note.deleteMany({}), Post.deleteMany({})]);
  });

  it('lets the demo admin browse but not create, edit or delete users', async () => {
    const { realAdmin, demoAdmin, demoUser } = await seed();
    const token = signAccessToken(demoAdmin);

    const listed = await request(app).get('/api/admin/users').set(auth(token));
    expect(listed.status).toBe(200);
    expect(listed.body.total).toBe(3);

    const created = await request(app)
      .post('/api/admin/users')
      .set(auth(token))
      .send({ name: 'X', email: 'x@example.com', password: 'Password123!' });
    expect(created.status).toBe(403);
    expect(created.body.error.code).toBe('DEMO_READ_ONLY');

    const patched = await request(app)
      .patch(`/api/admin/users/${realAdmin.id}`)
      .set(auth(token))
      .send({ role: 'user' });
    expect(patched.status).toBe(403);

    const deleted = await request(app).delete(`/api/admin/users/${demoUser.id}`).set(auth(token));
    expect(deleted.status).toBe(403);

    expect(await User.countDocuments()).toBe(3);
    expect((await User.findById(realAdmin.id))?.role).toBe('admin');
  });

  it('still lets a real admin manage demo accounts', async () => {
    const { realAdmin, demoUser } = await seed();
    const res = await request(app)
      .patch(`/api/admin/users/${demoUser.id}`)
      .set(auth(signAccessToken(realAdmin)))
      .send({ interests: ['music'] });
    expect(res.status).toBe(200);
    expect(res.body.user.interests).toEqual(['music']);
  });

  it('blocks demo password changes but allows profile edits', async () => {
    const { demoUser } = await seed();
    const token = signAccessToken(demoUser);

    const pw = await request(app)
      .patch('/api/users/me')
      .set(auth(token))
      .send({ currentPassword: 'Password123!', newPassword: 'NewPassword123!' });
    expect(pw.status).toBe(403);
    expect(pw.body.error.code).toBe('DEMO_READ_ONLY');

    const profile = await request(app).patch('/api/users/me').set(auth(token)).send({ name: 'Demo Person' });
    expect(profile.status).toBe(200);
    expect(profile.body.user.name).toBe('Demo Person');
  });
});
