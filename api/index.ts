import type { IncomingMessage, ServerResponse } from 'node:http';

type App = (req: IncomingMessage, res: ServerResponse) => void;

let ready: Promise<App> | null = null;

// Load lazily so env/DB failures become a readable 503 instead of FUNCTION_INVOCATION_FAILED.
// Only error messages are returned (e.g. which env var is missing), never env values.
async function load(): Promise<App> {
  const [{ createApp }, { connectDb }] = await Promise.all([
    import('../src/app.js'),
    import('../src/db.js'),
  ]);
  await connectDb();
  return createApp() as unknown as App;
}

// Vercel serverless entry: reuse one app + Mongo connection across warm invocations.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  let app: App;
  try {
    ready ??= load();
    app = await ready;
  } catch (err) {
    ready = null;
    console.error('Startup failed:', err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: { code: 'STARTUP_FAILED', message: err instanceof Error ? err.message : String(err) },
      }),
    );
    return;
  }
  app(req, res);
}
