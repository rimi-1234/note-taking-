import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { AppError, errorHandler, notFoundHandler } from './lib/errors.js';
import { logger } from './lib/logger.js';
import { createGlobalLimiter } from './middleware/rate-limit.js';
import { createAdminNotesRouter } from './routes/admin-notes.routes.js';
import { createAdminUsersRouter } from './routes/admin-users.routes.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createMeRouter } from './routes/me.routes.js';
import { createNotesRouter } from './routes/notes.routes.js';
import { createPostsRouter } from './routes/posts.routes.js';
import { createUsersRouter } from './routes/users.routes.js';

export function createApp() {
  const app = express();

  // Render (and most PaaS) terminate TLS at one proxy hop; needed for real client IPs and Secure cookies.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Requests without an Origin header (curl, server-to-server) are not subject to CORS.
        if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
        callback(new AppError(403, 'CORS_NOT_ALLOWED', 'Origin not allowed'));
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
  app.use(createGlobalLimiter());

  app.get('/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down' });
  });

  app.use('/api/auth', createAuthRouter());
  app.use('/api/users', createMeRouter());
  app.use('/api/users', createUsersRouter());
  app.use('/api/notes', createNotesRouter());
  app.use('/api/posts', createPostsRouter());
  app.use('/api/admin/notes', createAdminNotesRouter());
  app.use('/api/admin/users', createAdminUsersRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
