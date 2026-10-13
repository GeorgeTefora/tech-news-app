import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { openDb, ROOT } from './db.ts';
import { ingestAll } from './ingest/guides.ts';
import { startFeedScheduler } from './ingest/feeds.ts';
import { registerApi } from './routes/api.ts';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const TOKEN = process.env.APP_TOKEN ?? '';
const COOKIE = 'tna_token';

const db = openDb();
// First run (or empty DB): load the bundled guides and feed list.
if (!(db.prepare('SELECT COUNT(*) AS n FROM guides').get() as { n: number }).n) {
  console.log('[ingest] empty database, ingesting content/ …', ingestAll(db));
}

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'warn' }, trustProxy: false });

// ---- optional shared-secret auth for non-loopback clients ----
const isLoopback = (ip: string) => ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
const safeEq = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const cookieToken = (header?: string) =>
  header?.split(';').map((c) => c.trim().split('=')).find(([k]) => k === COOKIE)?.[1] ?? '';

if (TOKEN) {
  app.addHook('onRequest', async (req, reply) => {
    // `tailscale serve` proxies from loopback (tailnet devices are already authenticated);
    // Funnel traffic comes from the public internet, so it always needs the token.
    const local = isLoopback(req.ip) && !req.headers['tailscale-funnel-request'];
    if (local || !req.url.startsWith('/api/') || req.url === '/api/login') return;
    const supplied = cookieToken(req.headers.cookie) || (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!safeEq(decodeURIComponent(supplied), TOKEN)) return reply.code(401).send({ error: 'auth required' });
  });
}
app.post<{ Body: { token?: string } }>('/api/login', async (req, reply) => {
  if (!TOKEN) return { ok: true };
  if (!safeEq(String(req.body?.token ?? ''), TOKEN)) return reply.code(401).send({ error: 'Wrong token' });
  reply.header('set-cookie', `${COOKIE}=${encodeURIComponent(TOKEN)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
  return { ok: true };
});

registerApi(app, db);
app.get('/api/health', async () => ({ ok: true }));

// ---- serve the built PWA (production) ----
const dist = resolve(ROOT, 'web/dist');
if (existsSync(dist)) {
  await app.register(fastifyStatic, { root: dist, wildcard: false });
  app.setNotFoundHandler((req, reply) => {
    if (req.method === 'GET' && !req.url.startsWith('/api/')) return reply.sendFile('index.html');
    return reply.code(404).send({ error: 'Not found' });
  });
}

const timer = startFeedScheduler(db);
await app.listen({ port: PORT, host: HOST });

const lan = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === 'IPv4' && !n.internal)
  .map((n) => `http://${n!.address}:${PORT}`);
console.log(`Tech News App on http://localhost:${PORT}`);
if (HOST === '0.0.0.0') console.log(`  LAN/Tailscale: ${lan.join('  ')}`);
if (!existsSync(dist)) console.log('  (API only: run `npm run build` to serve the web app from here, or use `npm run dev`)');
if (HOST === '0.0.0.0' && !TOKEN) console.log('  Tip: set APP_TOKEN in .env to require a login from other devices.');

const shutdown = async () => {
  clearInterval(timer);
  await app.close();
  db.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
