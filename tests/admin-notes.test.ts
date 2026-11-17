import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/lib/password.js';
import { signAccessToken } from '../src/lib/tokens.js';
import { Note, User } from '../src/models/index.js';

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function seed() {
  const passwordHash = await hashPassword('Password123!');
  const alice = await User.create({
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash,
    role: 'user',
  });
  const bob = await User.create({
    name: 'Bob',
    email: 'bob@example.com',
    passwordHash,
    role: 'user',
  });
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash,
    role: 'admin',
  });

  await Note.insertMany([
    { title: 'Alice 1', content: 'a1', owner: alice._id },
    { title: 'Alice 2', content: 'a2', owner: alice._id },
    { title: 'Bob 1', content: 'b1', owner: bob._id },
  ]);

  return { alice, bob, admin };
}

describe('admin notes', () => {
  const app = createApp();

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Note.deleteMany({})]);
  });

  it('lists all notes for admins with owner name and email populated', async () => {
    const { admin } = await seed();
    const res = await request(app)
      .get('/api/admin/notes')
      .query({ page: 1, limit: 10 })
      .set(authHeader(signAccessToken(admin)));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, limit: 10, total: 3, totalPages: 1 });
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].owner).toEqual(
      expect.objectContaining({
        _id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
      }),
    );
  });

  it('filters by owner ObjectId', async () => {
    const { alice, admin } = await seed();
    const res = await request(app)
      .get('/api/admin/notes')
      .query({ owner: alice._id.toString(), limit: 10 })
      .set(authHeader(signAccessToken(admin)));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.data).toHaveLength(2);
    for (const note of res.body.data) {
      expect(note.owner._id).toBe(alice._id.toString());
      expect(note.owner.email).toBe('alice@example.com');
    }
  });

  it('returns 403 for regular users and 401 when unauthenticated', async () => {
    const { alice } = await seed();

    const asUser = await request(app)
      .get('/api/admin/notes')
      .set(authHeader(signAccessToken(alice)));
    expect(asUser.status).toBe(403);
    expect(asUser.body.error.code).toBe('FORBIDDEN');

    const anon = await request(app).get('/api/admin/notes');
    expect(anon.status).toBe(401);
    expect(anon.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects invalid owner query with VALIDATION_ERROR', async () => {
    const { admin } = await seed();
    const res = await request(app)
      .get('/api/admin/notes')
      .query({ owner: 'bad-id' })
      .set(authHeader(signAccessToken(admin)));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
