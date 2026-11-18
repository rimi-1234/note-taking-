import { connectDb, disconnectDb } from '../src/db.js';
import { DEMO_ADMIN_EMAIL, DEMO_PASSWORD, DEMO_USER_EMAIL } from '../src/lib/demo.js';
import { hashPassword } from '../src/lib/password.js';
import { logger } from '../src/lib/logger.js';
import { Note, Post, User } from '../src/models/index.js';

const demoUsers = [
  {
    name: 'Alice Writer',
    email: 'alice@example.com',
    role: 'user' as const,
    interests: ['chess', 'reading'],
  },
  {
    name: 'Bob Reader',
    email: 'bob@example.com',
    role: 'user' as const,
    interests: ['reading', 'music'],
  },
  {
    name: 'Carol Coder',
    email: 'carol@example.com',
    role: 'user' as const,
    interests: ['chess', 'coding'],
  },
  // One-click logins on the frontend; the backend keeps them read-only for account management.
  {
    name: 'Demo User',
    email: DEMO_USER_EMAIL,
    role: 'user' as const,
    interests: ['coding', 'music', 'travel'],
  },
  {
    name: 'Demo Admin',
    email: DEMO_ADMIN_EMAIL,
    role: 'admin' as const,
    interests: ['security', 'reading'],
  },
];

async function main() {
  await connectDb();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const users = [];
  for (const demo of demoUsers) {
    const user = await User.findOneAndUpdate(
      { email: demo.email },
      {
        $set: {
          name: demo.name,
          passwordHash,
          role: demo.role,
          interests: demo.interests,
        },
        $setOnInsert: { tokenVersion: 0 },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    users.push(user);
  }

  // Replace demo content so reruns stay deterministic.
  const userIds = users.map((u) => u._id);
  await Note.deleteMany({ owner: { $in: userIds } });
  await Post.deleteMany({ author: { $in: userIds } });

  await Note.insertMany([
    { title: 'Alice note 1', content: 'My first private note', owner: users[0]!._id },
    { title: 'Alice note 2', content: 'Ideas for chess openings', owner: users[0]!._id },
    { title: 'Bob note 1', content: 'Books to finish this month', owner: users[1]!._id },
    { title: 'Carol note 1', content: 'API indexing notes', owner: users[2]!._id },
    {
      title: 'Welcome to Secure Notes',
      content: 'This is a demo account. Create, edit and delete notes — only you can change them.',
      owner: users[3]!._id,
    },
    { title: 'Weekend plan', content: 'Hike in the morning\nCoffee with friends\nFinish the side project', owner: users[3]!._id },
    { title: 'Trip checklist', content: 'Passport, charger, headphones, notebook', owner: users[3]!._id },
    {
      title: 'Admin checklist',
      content: 'Review new users\nCheck the interests report\nSpot-check notes across owners',
      owner: users[4]!._id,
    },
  ]);

  await Post.insertMany([
    { title: 'Hello from Alice', body: 'Public post about chess.', author: users[0]!._id },
    { title: 'Reading list', body: 'A few books I recommend.', author: users[0]!._id },
    { title: 'Bob on music', body: 'Albums I keep replaying.', author: users[1]!._id },
    { title: 'Carol on coding', body: 'Notes on MongoDB indexes.', author: users[2]!._id },
    { title: 'Hello world', body: 'First post from the demo account. Posts are public to signed-in users.', author: users[3]!._id },
    { title: 'Favourite playlists', body: 'Lo-fi for focus, jazz for evenings.', author: users[3]!._id },
    { title: 'Admin notes', body: 'Admins can view every note but never edit someone else’s.', author: users[4]!._id },
  ]);

  logger.info(
    {
      users: users.map((u) => ({ email: u.email, interests: u.interests })),
      password: DEMO_PASSWORD,
      notes: 8,
      posts: 7,
    },
    'Demo seed complete (safe to rerun)',
  );

  await disconnectDb();
}

main().catch(async (err) => {
  logger.fatal({ err }, 'seed-demo failed');
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
