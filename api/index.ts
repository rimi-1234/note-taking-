import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/app.js';
import { connectDb } from '../src/db.js';

const app = createApp();
let connecting: Promise<void> | null = null;

// Vercel serverless entry: reuse one Mongo connection across warm invocations.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  connecting ??= connectDb().catch((err) => {
    connecting = null;
    throw err;
  });
  await connecting;
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
