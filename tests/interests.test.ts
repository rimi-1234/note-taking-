import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/lib/password.js';
import { signAccessToken } from '../src/lib/tokens.js';
import { User } from '../src/models/index.js';

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
    interests: [],
  });
  await User.create({
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash,
    role: 'user',
    interests: ['chess', 'reading'],
  });
  await User.create({
    name: 'Bob',
    email: 'bob@example.com',
    passwordHash,
    role: 'user',
    interests: ['reading'],
  });
  await User.create({
    name: 'No Interests',
    email: 'none@example.com',
    passwordHash,
    role: 'user',
    interests: [],
  });
  const user = await User.create({
    name: 'Carol',
    email: 'carol@example.com',
    passwordHash,
    role: 'user',
    interests: ['coding'],
  });
  return { admin, user };
}

describe('interests aggregation', () => {
  const app = createApp();

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('groups users by interest and excludes empty interests', async () => {
    const { admin } = await seed();
    const res = await request(app)
      .get('/api/users/by-interest')
      .query({ page: 1, limit: 10 })
      .set(authHeader(signAccessToken(admin)));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3); // chess, reading, coding
    const byInterest = Object.fromEntries(
      res.body.data.map((g: { interest: string; count: number }) => [g.interest, g.count]),
    );
    expect(byInterest.reading).toBe(2);
    expect(byInterest.chess).toBe(1);
    expect(byInterest.coding).toBe(1);
    expect(Object.keys(byInterest).includes('')).toBe(false);
  });

  it('paginates interest groups and supports interest filter', async () => {
    const { admin } = await seed();

    const page1 = await request(app)
      .get('/api/users/by-interest')
      .query({ page: 1, limit: 1 })
      .set(authHeader(signAccessToken(admin)));
    expect(page1.body.data).toHaveLength(1);
    expect(page1.body.totalPages).toBe(3);

    const filtered = await request(app)
      .get('/api/users/by-interest')
      .query({ interest: 'Chess' })
      .set(authHeader(signAccessToken(admin)));
    expect(filtered.status).toBe(200);
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.data[0]).toMatchObject({
      interest: 'chess',
      count: 1,
    });
    expect(filtered.body.data[0].users[0].email).toBe('alice@example.com');
  });

  it('returns 403 for non-admin users', async () => {
    const { user } = await seed();
    const res = await request(app)
      .get('/api/users/by-interest')
      .set(authHeader(signAccessToken(user)));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
