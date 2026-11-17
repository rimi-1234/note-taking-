import { z } from 'zod';
import { connectDb, disconnectDb } from '../src/db.js';
import { hashPassword } from '../src/lib/password.js';
import { logger } from '../src/lib/logger.js';
import { User } from '../src/models/index.js';

const adminSeedSchema = z.object({
  ADMIN_NAME: z.string().trim().min(1).default('Admin'),
  ADMIN_EMAIL: z.string().trim().email().transform((v) => v.toLowerCase()),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),
});

async function main() {
  const parsed = adminSeedSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error(`Invalid admin seed configuration:\n${problems}`);
    process.exit(1);
  }

  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = parsed.data;
  await connectDb();

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const user = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        name: ADMIN_NAME,
        passwordHash,
        role: 'admin',
        interests: [],
      },
      $setOnInsert: {
        tokenVersion: 0,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  logger.info(
    { id: user._id.toString(), email: user.email, role: user.role },
    'Admin seed complete (safe to rerun)',
  );

  await disconnectDb();
}

main().catch(async (err) => {
  logger.fatal({ err }, 'seed failed');
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
