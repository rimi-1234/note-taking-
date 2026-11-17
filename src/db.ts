import mongoose from 'mongoose';
import { env, isProduction } from './config/env.js';
import { logger } from './lib/logger.js';

// Indexes are declared with schema.index() and built explicitly by `npm run sync-indexes`
// in production, so the deployed index set is exactly what the code declares.
mongoose.set('autoIndex', !isProduction);
mongoose.set('strictQuery', true);

export async function connectDb(uri = env.MONGODB_URI): Promise<void> {
  await mongoose.connect(uri);
  logger.info({ db: mongoose.connection.name }, 'Connected to MongoDB');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
