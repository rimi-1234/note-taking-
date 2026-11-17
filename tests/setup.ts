import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, inject } from 'vitest';

beforeAll(async () => {
  const dbName = `test_${randomUUID().replaceAll('-', '')}`;
  await mongoose.connect(inject('mongoUri'), { dbName });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
