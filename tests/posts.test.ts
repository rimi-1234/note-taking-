import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/lib/password.js';
import { signAccessToken } from '../src/lib/tokens.js';
import { Post, User } from '../src/models/index.js';

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
    interests: ['chess'],
  });
  const bob = await User.create({
    name: 'Bob',
    email: 'bob@example.com',
    passwordHash,
    role: 'user',
    interests: ['reading'],
  });
  return { alice, bob };
}

describe('posts and $lookup', () => {
  const app = createApp();

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Post.deleteMany({})]);
  });

  it('creates a post and lists a user posts newest first with pagination', async () => {
    const { alice } = await seed();
    const token = signAccessToken(alice);

    const created = await request(app)
      .post('/api/posts')
      .set(authHeader(token))
      .send({ title: 'Hello', body: 'World' });
    expect(created.status).toBe(201);
    expect(created.body.post.author).toBe(alice._id.toString());

    await Post.insertMany([
      { title: 'Older', body: '1', author: alice._id },
      { title: 'Newer', body: '2', author: alice._id },
    ]);

    const page = await request(app)
      .get(`/api/users/${alice._id.toString()}/posts`)
      .query({ page: 1, limit: 2 })
      .set(authHeader(token));

    expect(page.status).toBe(200);
    expect(page.body.user).toMatchObject({
      _id: alice._id.toString(),
      name: 'Alice',
      interests: ['chess'],
    });
    expect(page.body).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(page.body.data).toHaveLength(2);
    // Newest first (_id descending)
    expect(page.body.data[0]._id > page.body.data[1]._id).toBe(true);
  });

  it('returns 404 for an unknown user', async () => {
    const { alice } = await seed();
    const res = await request(app)
      .get('/api/users/000000000000000000000099/posts')
      .set(authHeader(signAccessToken(alice)));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('cannot delete another users post', async () => {
    const { alice, bob } = await seed();
    const post = await Post.create({
      title: 'Bob post',
      body: 'secret',
      author: bob._id,
    });

    const res = await request(app)
      .delete(`/api/posts/${post._id.toString()}`)
      .set(authHeader(signAccessToken(alice)));
    expect(res.status).toBe(404);

    expect(await Post.findById(post._id)).toBeTruthy();

    const own = await request(app)
      .delete(`/api/posts/${post._id.toString()}`)
      .set(authHeader(signAccessToken(bob)));
    expect(own.status).toBe(204);
  });
});
