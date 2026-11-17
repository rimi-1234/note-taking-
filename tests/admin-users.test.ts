import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/lib/password.js';
import { signAccessToken } from '../src/lib/tokens.js';
import { Note, Post, User } from '../src/models/index.js';

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function seed() {
  const passwordHash = await hashPassword('Password123!');
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash,
    role: 'admin',
  });
  const admin2 = await User.create({
    name: 'Admin Two',
    email: 'admin2@example.com',
    passwordHash,
    role: 'admin',
  });
  const alice = await User.create({
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash,
    role: 'user',
    interests: ['chess'],
  });
  return { admin, admin2, alice };
}

describe('admin users', () => {
  const app = createApp();

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Note.deleteMany({}), Post.deleteMany({})]);
  });

  it('lists, creates, reads and updates users', async () => {
    const { admin } = await seed();
    const token = signAccessToken(admin);

    const listed = await request(app)
      .get('/api/admin/users')
      .query({ page: 1, limit: 10 })
      .set(authHeader(token));
    expect(listed.status).toBe(200);
    expect(listed.body.total).toBe(3);

    const created = await request(app)
      .post('/api/admin/users')
      .set(authHeader(token))
      .send({
        name: 'Carol',
        email: 'carol@example.com',
        password: 'Password123!',
        role: 'user',
        interests: ['coding'],
      });
    expect(created.status).toBe(201);
    expect(created.body.user.email).toBe('carol@example.com');
    const carolId = created.body.user._id as string;

    const read = await request(app).get(`/api/admin/users/${carolId}`).set(authHeader(token));
    expect(read.status).toBe(200);
    expect(read.body.user.name).toBe('Carol');

    const updated = await request(app)
      .patch(`/api/admin/users/${carolId}`)
      .set(authHeader(token))
      .send({ name: 'Carol Updated', interests: ['music'] });
    expect(updated.status).toBe(200);
    expect(updated.body.user.name).toBe('Carol Updated');
    expect(updated.body.user.interests).toEqual(['music']);
  });

  it('returns 409 EMAIL_TAKEN on duplicate email', async () => {
    const { admin } = await seed();
    const res = await request(app)
      .post('/api/admin/users')
      .set(authHeader(signAccessToken(admin)))
      .send({
        name: 'Dup',
        email: 'alice@example.com',
        password: 'Password123!',
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('blocks self-delete and self-demote when another admin exists', async () => {
    const { admin } = await seed();
    const token = signAccessToken(admin);

    const selfDelete = await request(app)
      .delete(`/api/admin/users/${admin._id.toString()}`)
      .set(authHeader(token));
    expect(selfDelete.status).toBe(400);
    expect(selfDelete.body.error.code).toBe('CANNOT_MODIFY_SELF');

    const selfDemote = await request(app)
      .patch(`/api/admin/users/${admin._id.toString()}`)
      .set(authHeader(token))
      .send({ role: 'user' });
    expect(selfDemote.status).toBe(400);
    expect(selfDemote.body.error.code).toBe('CANNOT_MODIFY_SELF');
  });

  it('blocks removing or demoting the last admin with LAST_ADMIN', async () => {
    const passwordHash = await hashPassword('Password123!');
    const onlyAdmin = await User.create({
      name: 'Only Admin',
      email: 'only@example.com',
      passwordHash,
      role: 'admin',
    });
    const token = signAccessToken(onlyAdmin);

    const demote = await request(app)
      .patch(`/api/admin/users/${onlyAdmin._id.toString()}`)
      .set(authHeader(token))
      .send({ role: 'user' });
    expect(demote.status).toBe(409);
    expect(demote.body.error.code).toBe('LAST_ADMIN');

    const del = await request(app)
      .delete(`/api/admin/users/${onlyAdmin._id.toString()}`)
      .set(authHeader(token));
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe('LAST_ADMIN');
  });

  it('cascades notes and posts when a user is deleted', async () => {
    const { admin, alice } = await seed();
    await Note.create({ title: 'Alice note', content: 'x', owner: alice._id });
    await Post.create({ title: 'Alice post', body: 'y', author: alice._id });

    const res = await request(app)
      .delete(`/api/admin/users/${alice._id.toString()}`)
      .set(authHeader(signAccessToken(admin)));
    expect(res.status).toBe(204);

    expect(await User.findById(alice._id)).toBeNull();
    expect(await Note.countDocuments({ owner: alice._id })).toBe(0);
    expect(await Post.countDocuments({ author: alice._id })).toBe(0);
  });

  it('revokes tokens when role is changed', async () => {
    const { admin, alice } = await seed();
    const aliceToken = signAccessToken(alice);

    const before = await request(app).get('/api/users/me').set(authHeader(aliceToken));
    expect(before.status).toBe(200);

    const demote = await request(app)
      .patch(`/api/admin/users/${alice._id.toString()}`)
      .set(authHeader(signAccessToken(admin)))
      .send({ role: 'admin' });
    expect(demote.status).toBe(200);

    const after = await request(app).get('/api/users/me').set(authHeader(aliceToken));
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 403 for non-admin callers', async () => {
    const { alice } = await seed();
    const res = await request(app)
      .get('/api/admin/users')
      .set(authHeader(signAccessToken(alice)));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
