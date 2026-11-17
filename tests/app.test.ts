import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AppError, errorHandler } from '../src/lib/errors.js';

describe('app shell', () => {
  const app = createApp();

  it('GET /health reports the database as up', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });

  it('unknown routes return the standard 404 error shape', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  it('malformed JSON returns 400 INVALID_JSON', async () => {
    const res = await request(app)
      .post('/api/anything')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('sets security headers and hides x-powered-by', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows the configured origin with credentials and rejects others', async () => {
    const allowed = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const blocked = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('CORS_NOT_ALLOWED');
  });
});

describe('error handler', () => {
  const app = express();
  app.get('/app-error', () => {
    throw new AppError(422, 'CUSTOM', 'Custom failure', { field: 'x' });
  });
  app.get('/crash', () => {
    throw new Error('secret internal detail');
  });
  app.use(errorHandler);

  it('serialises AppError with code, message and details', async () => {
    const res = await request(app).get('/app-error');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: { code: 'CUSTOM', message: 'Custom failure', details: { field: 'x' } } });
  });

  it('hides internal error messages behind a generic 500', async () => {
    const res = await request(app).get('/crash');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  });
});
