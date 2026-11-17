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
  return { alice, bob, admin };
}

describe('notes CRUD', () => {
  const app = createApp();

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Note.deleteMany({})]);
  });

  it('creates, lists, reads, updates and deletes own notes', async () => {
    const { alice } = await seed();
    const token = signAccessToken(alice);

    const created = await request(app)
      .post('/api/notes')
      .set(authHeader(token))
      .send({ title: 'First note', content: 'hello' });
    expect(created.status).toBe(201);
    expect(created.body.note).toMatchObject({
      title: 'First note',
      content: 'hello',
      owner: alice._id.toString(),
    });
    const noteId = created.body.note._id as string;

    const listed = await request(app).get('/api/notes').set(authHeader(token));
    expect(listed.status).toBe(200);
    expect(listed.body).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(listed.body.data).toHaveLength(1);

    const read = await request(app).get(`/api/notes/${noteId}`).set(authHeader(token));
    expect(read.status).toBe(200);
    expect(read.body.note.title).toBe('First note');

    const updated = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set(authHeader(token))
      .send({ title: 'Updated title' });
    expect(updated.status).toBe(200);
    expect(updated.body.note.title).toBe('Updated title');

    const deleted = await request(app).delete(`/api/notes/${noteId}`).set(authHeader(token));
    expect(deleted.status).toBe(204);

    const missing = await request(app).get(`/api/notes/${noteId}`).set(authHeader(token));
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('returns pagination metadata across pages', async () => {
    const { alice } = await seed();
    const token = signAccessToken(alice);
    await Note.insertMany(
      Array.from({ length: 5 }, (_, i) => ({
        title: `Note ${i + 1}`,
        content: '',
        owner: alice._id,
      })),
    );

    const page1 = await request(app)
      .get('/api/notes')
      .query({ page: 1, limit: 2 })
      .set(authHeader(token));
    expect(page1.status).toBe(200);
    expect(page1.body).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(page1.body.data).toHaveLength(2);

    const page3 = await request(app)
      .get('/api/notes')
      .query({ page: 3, limit: 2 })
      .set(authHeader(token));
    expect(page3.body.data).toHaveLength(1);
    expect(page3.body.page).toBe(3);
  });

  it('returns 404 for another user note and never lists it', async () => {
    const { alice, bob } = await seed();
    const bobNote = await Note.create({
      title: 'Bob secret',
      content: 'private',
      owner: bob._id,
    });

    const aliceToken = signAccessToken(alice);
    const listed = await request(app).get('/api/notes').set(authHeader(aliceToken));
    expect(listed.body.total).toBe(0);

    const read = await request(app)
      .get(`/api/notes/${bobNote._id.toString()}`)
      .set(authHeader(aliceToken));
    expect(read.status).toBe(404);

    const patch = await request(app)
      .patch(`/api/notes/${bobNote._id.toString()}`)
      .set(authHeader(aliceToken))
      .send({ title: 'hacked' });
    expect(patch.status).toBe(404);
  });

  it('allows admin to read any note but not edit or delete others', async () => {
    const { alice, admin } = await seed();
    const note = await Note.create({
      title: 'Alice note',
      content: 'x',
      owner: alice._id,
    });
    const adminToken = signAccessToken(admin);

    const read = await request(app)
      .get(`/api/notes/${note._id.toString()}`)
      .set(authHeader(adminToken));
    expect(read.status).toBe(200);
    expect(read.body.note.title).toBe('Alice note');

    const patch = await request(app)
      .patch(`/api/notes/${note._id.toString()}`)
      .set(authHeader(adminToken))
      .send({ title: 'admin edit' });
    expect(patch.status).toBe(404);

    const del = await request(app)
      .delete(`/api/notes/${note._id.toString()}`)
      .set(authHeader(adminToken));
    expect(del.status).toBe(404);

    const stillThere = await Note.findById(note._id);
    expect(stillThere).toBeTruthy();
  });

  it('rejects invalid bodies and ids with VALIDATION_ERROR', async () => {
    const { alice } = await seed();
    const token = signAccessToken(alice);

    const badBody = await request(app)
      .post('/api/notes')
      .set(authHeader(token))
      .send({ title: '' });
    expect(badBody.status).toBe(400);
    expect(badBody.body.error.code).toBe('VALIDATION_ERROR');

    const badId = await request(app).get('/api/notes/not-an-id').set(authHeader(token));
    expect(badId.status).toBe(400);
    expect(badId.body.error.code).toBe('VALIDATION_ERROR');

    const badPage = await request(app)
      .get('/api/notes')
      .query({ page: 0, limit: 200 })
      .set(authHeader(token));
    expect(badPage.status).toBe(400);
    expect(badPage.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});
