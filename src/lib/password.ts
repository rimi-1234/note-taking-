import bcrypt from 'bcryptjs';

// Cost 12 in real environments; lower in tests so suites stay fast (decision 17).
const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}
