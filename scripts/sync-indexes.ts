import { connectDb, disconnectDb } from '../src/db.js';
import { logger } from '../src/lib/logger.js';
import { Note, Post, User } from '../src/models/index.js';

async function main() {
  await connectDb();

  // syncIndexes creates missing indexes and drops indexes that are no longer in the schema.
  const results = await Promise.all([
    User.syncIndexes().then((dropped) => ({ model: 'User', dropped })),
    Note.syncIndexes().then((dropped) => ({ model: 'Note', dropped })),
    Post.syncIndexes().then((dropped) => ({ model: 'Post', dropped })),
  ]);

  for (const result of results) {
    logger.info(result, 'Indexes synced');
  }

  await disconnectDb();
}

main().catch(async (err) => {
  logger.fatal({ err }, 'sync-indexes failed');
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
