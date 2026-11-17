import { beforeAll, describe, expect, it } from 'vitest';
import { runExplain } from '../scripts/explain.js';
import { Note, Post, User } from '../src/models/index.js';

describe('index verification (explain)', () => {
  beforeAll(async () => {
    await Promise.all([User.syncIndexes(), Note.syncIndexes(), Post.syncIndexes()]);
  });

  it('has no COLLSCAN in API query shapes and exact index set', async () => {
    const result = await runExplain({ silent: true });
    const failures = result.rows.filter((row) => !row.ok).map((row) => row.name);
    expect(failures, `COLLSCAN in: ${failures.join(', ')}`).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.indexDetails.every((line) => line.includes(': ok'))).toBe(true);
  });
});
