import mongoose from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';
import { Note, Post, User } from '../src/models/index.js';

type IndexInfo = {
  name: string;
  key: Record<string, number>;
  unique?: boolean;
};

function indexKeys(indexes: IndexInfo[]) {
  return indexes
    .map((idx) => ({
      name: idx.name,
      key: idx.key,
      unique: Boolean(idx.unique),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

describe('mongoose indexes (decision 23)', () => {
  beforeAll(async () => {
    await Promise.all([User.syncIndexes(), Note.syncIndexes(), Post.syncIndexes()]);
  });

  it('users has exactly _id, unique email, and interests indexes', async () => {
    const indexes = (await User.collection.indexes()) as IndexInfo[];
    expect(indexKeys(indexes)).toEqual([
      { name: '_id_', key: { _id: 1 }, unique: false },
      { name: 'email_1', key: { email: 1 }, unique: true },
      { name: 'interests_1', key: { interests: 1 }, unique: false },
    ]);
  });

  it('notes has exactly _id and owner/_id compound index', async () => {
    const indexes = (await Note.collection.indexes()) as IndexInfo[];
    expect(indexKeys(indexes)).toEqual([
      { name: '_id_', key: { _id: 1 }, unique: false },
      { name: 'owner_1__id_-1', key: { owner: 1, _id: -1 }, unique: false },
    ]);
  });

  it('posts has exactly _id and author/_id compound index', async () => {
    const indexes = (await Post.collection.indexes()) as IndexInfo[];
    expect(indexKeys(indexes)).toEqual([
      { name: '_id_', key: { _id: 1 }, unique: false },
      { name: 'author_1__id_-1', key: { author: 1, _id: -1 }, unique: false },
    ]);
  });

  it('normalizes email and interests, and hides passwordHash by default', async () => {
    const user = await User.create({
      name: 'Test User',
      email: '  Alice@Example.COM ',
      passwordHash: 'not-a-real-hash',
      interests: [' Chess ', 'READING', 'chess', ''],
    });

    expect(user.email).toBe('alice@example.com');
    expect(user.interests).toEqual(['chess', 'reading']);
    expect(user.tokenVersion).toBe(0);

    const found = await User.findById(user._id).lean();
    expect(found).toBeTruthy();
    expect(found).not.toHaveProperty('passwordHash');

    const withSecret = await User.findById(user._id).select('+passwordHash').lean();
    expect(withSecret?.passwordHash).toBe('not-a-real-hash');

    const json = user.toJSON() as unknown as Record<string, unknown>;
    expect(json).not.toHaveProperty('passwordHash');
    expect(json).not.toHaveProperty('__v');
  });

  it('rejects duplicate emails via the unique index', async () => {
    await User.create({
      name: 'One',
      email: 'dup@example.com',
      passwordHash: 'hash-1',
    });

    await expect(
      User.create({
        name: 'Two',
        email: 'DUP@example.com',
        passwordHash: 'hash-2',
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('stores notes and posts with owner/author refs', async () => {
    const author = await User.create({
      name: 'Author',
      email: 'author@example.com',
      passwordHash: 'hash',
    });

    const note = await Note.create({
      title: 'Private note',
      content: 'secret',
      owner: author._id,
    });
    const post = await Post.create({
      title: 'Public post',
      body: 'hello',
      author: author._id,
    });

    expect(note.owner.toString()).toBe(author._id.toString());
    expect(post.author.toString()).toBe(author._id.toString());
    expect(mongoose.isValidObjectId(note._id)).toBe(true);
  });
});
