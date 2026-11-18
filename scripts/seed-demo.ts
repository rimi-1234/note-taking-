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
  // One-click login on the frontend; the backend stops its password and email from being changed.
  {
    name: 'Demo User',
    email: DEMO_USER_EMAIL,
    role: 'user' as const,
    interests: ['coding', 'music', 'travel'],
  },
];

const RETIRED_DEMO_EMAILS = ['demo-admin@example.com'];

async function main() {
  await connectDb();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const retired = await User.find({ email: { $in: RETIRED_DEMO_EMAILS } }).select('_id');
  const retiredIds = retired.map((u) => u._id);
  await Promise.all([
    User.deleteMany({ _id: { $in: retiredIds } }),
    Note.deleteMany({ owner: { $in: retiredIds } }),
    Post.deleteMany({ author: { $in: retiredIds } }),
  ]);

  // The single admin doubles as the demo admin; existing name, interests and content are kept.
  const admin = await User.findOneAndUpdate(
    { email: DEMO_ADMIN_EMAIL },
    {
      $set: { passwordHash, role: 'admin' },
      $setOnInsert: { name: 'Admin', interests: ['security', 'reading'], tokenVersion: 0 },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  await Note.updateOne(
    { owner: admin._id, title: 'Admin checklist' },
    {
      $setOnInsert: {
        content: 'Review new users\nCheck the interests report\nSpot-check notes across owners',
      },
    },
    { upsert: true },
  );

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
  ]);

  await Post.insertMany([
    { title: 'Hello from Alice', body: 'Public post about chess.', author: users[0]!._id },
    { title: 'Reading list', body: 'A few books I recommend.', author: users[0]!._id },
    { title: 'Bob on music', body: 'Albums I keep replaying.', author: users[1]!._id },
    { title: 'Carol on coding', body: 'Notes on MongoDB indexes.', author: users[2]!._id },
    { title: 'Hello world', body: 'First post from the demo account. Posts are public to signed-in users.', author: users[3]!._id },
    { title: 'Favourite playlists', body: 'Lo-fi for focus, jazz for evenings.', author: users[3]!._id },
  ]);

  logger.info(
    {
      admin: admin.email,
      users: users.map((u) => ({ email: u.email, interests: u.interests })),
      password: DEMO_PASSWORD,
      removed: retiredIds.length,
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
