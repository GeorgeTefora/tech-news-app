import type { FastifyInstance } from 'fastify';
import { now, type DB } from '../db.ts';
import { refreshFeeds } from '../ingest/feeds.ts';
import { ingestAll } from '../ingest/guides.ts';
import { readCapped, readUrl, ReaderError, safeFetch } from '../reader.ts';

type Row = Record<string, unknown>;
const KINDS = new Set(['item', 'concept', 'question', 'week', 'glossary']);
const STATUSES = new Set(['todo', 'reading', 'done']);

function getSetting(db: DB, key: string): string | null {
  const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return r?.value ?? null;
}
function setSetting(db: DB, key: string, value: string) {
  db.prepare('INSERT INTO settings VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

/** Week range a plan entry covers, e.g. "Weeks 1–3, AI…" → [1, 3]; "Week 10 and ongoing" → [10, ∞]. */
export function weekRange(label: string): [number, number] {
  const m = label.match(/Weeks?\s+(\d+)(?:\s*[–-]\s*(\d+))?/i);
  if (!m) return [-1, -1];
  const start = Number(m[1]);
  if (/ongoing/i.test(label)) return [start, Infinity];
  return [start, m[2] ? Number(m[2]) : start];
}

const withProgress = (kind: string, alias: string) =>
  `LEFT JOIN progress p ON p.kind = '${kind}' AND p.ref_id = ${alias}.id`;

export function registerApi(app: FastifyInstance, db: DB) {
  const all = (sql: string, ...params: (string | number | null)[]) => db.prepare(sql).all(...params) as Row[];

  const planStart = () => {
    let s = getSetting(db, 'plan_start');
    if (!s) {
      s = new Date().toISOString().slice(0, 10);
      setSetting(db, 'plan_start', s);
    }
    return s;
  };

  const plan = () => {
    const start = planStart();
    const currentWeek = Math.max(0, Math.floor((Date.now() - Date.parse(start)) / (7 * 86_400_000)));
    const weeks = all(`SELECT w.*, COALESCE(p.status, 'todo') AS status, COALESCE(p.notes, '') AS notes
      FROM plan_weeks w ${withProgress('week', 'w')} ORDER BY w.ord`).map((w) => {
      const [from, to] = weekRange(String(w.label));
      return { ...w, guide_numbers: JSON.parse(String(w.guide_numbers)), from, to: to === Infinity ? null : to, current: currentWeek >= from && currentWeek <= to };
    });
    return { start, currentWeek, weeks };
  };

  const guideStats = () =>
    all(`SELECT g.id, g.number, g.title, g.subtitle, g.tag,
        (SELECT COUNT(*) FROM items i WHERE i.guide_id = g.id) AS items,
        (SELECT COUNT(*) FROM items i JOIN progress p ON p.kind='item' AND p.ref_id=i.id AND p.status='done' WHERE i.guide_id = g.id) AS items_done,
        (SELECT COUNT(*) FROM concepts c WHERE c.guide_id = g.id) AS concepts,
        (SELECT COUNT(*) FROM concepts c JOIN progress p ON p.kind='concept' AND p.ref_id=c.id AND p.status='done' WHERE c.guide_id = g.id) AS concepts_done,
        (SELECT COUNT(*) FROM questions q WHERE q.guide_id = g.id) AS questions,
        (SELECT COUNT(*) FROM questions q JOIN progress p ON p.kind='question' AND p.ref_id=q.id AND p.status='done' WHERE q.guide_id = g.id) AS questions_done
      FROM guides g ORDER BY g.number`);

  app.get('/api/meta', async () => ({
    tags: (all(`SELECT DISTINCT tag FROM guides WHERE number > 0 ORDER BY number`) as { tag: string }[]).map((r) => r.tag),
    guides: guideStats(),
  }));

  app.get('/api/plan', async () => plan());

  app.get<{ Params: { id: string } }>('/api/guides/:id', async (req, reply) => {
    const g = db.prepare(`SELECT * FROM guides WHERE id = ? OR CAST(number AS TEXT) = ? OR printf('%02d', number) = ?`).get(req.params.id, req.params.id, req.params.id) as Row | undefined;
    if (!g) return reply.code(404).send({ error: 'Guide not found' });
    const id = String(g.id);
    return {
      ...g,
      sections: all('SELECT ord, heading, md FROM sections WHERE guide_id = ? ORDER BY ord', id),
      items: all(`SELECT i.*, COALESCE(p.status,'todo') AS status, COALESCE(p.notes,'') AS notes FROM items i ${withProgress('item', 'i')} WHERE i.guide_id = ? ORDER BY i.ord`, id),
      concepts: all(`SELECT c.*, COALESCE(p.status,'todo') AS status, COALESCE(p.notes,'') AS notes, p.updated_at FROM concepts c ${withProgress('concept', 'c')} WHERE c.guide_id = ? ORDER BY c.ord`, id),
      questions: all(`SELECT q.*, COALESCE(p.status,'todo') AS status, COALESCE(p.notes,'') AS notes, p.updated_at FROM questions q ${withProgress('question', 'q')} WHERE q.guide_id = ? ORDER BY q.ord`, id),
      glossary: all(`SELECT e.*, COALESCE(p.status,'todo') AS status, COALESCE(p.notes,'') AS notes FROM glossary e ${withProgress('glossary', 'e')} WHERE e.guide_id = ? ORDER BY e.ord`, id),
    };
  });

  app.get('/api/items', async () =>
    all(`SELECT i.*, g.number AS guide_number, g.title AS guide_title, COALESCE(p.status,'todo') AS status, COALESCE(p.notes,'') AS notes
      FROM items i JOIN guides g ON g.id = i.guide_id ${withProgress('item', 'i')} ORDER BY g.number, i.ord`));

  app.get('/api/glossary', async () =>
    all(`SELECT e.*, COALESCE(p.status,'todo') AS status, COALESCE(p.notes,'') AS notes FROM glossary e ${withProgress('glossary', 'e')} ORDER BY e.ord`));

  app.put<{ Body: { kind: string; id: string; status?: string; notes?: string } }>('/api/progress', async (req, reply) => {
    const { kind, id, status, notes } = req.body ?? ({} as never);
    if (!KINDS.has(kind) || typeof id !== 'string') return reply.code(400).send({ error: 'Bad kind/id' });
    if (status !== undefined && !STATUSES.has(status)) return reply.code(400).send({ error: 'Bad status' });
    db.prepare(`INSERT INTO progress (kind, ref_id, status, notes, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(kind, ref_id) DO UPDATE SET
        status = COALESCE(?, progress.status), notes = COALESCE(?, progress.notes), updated_at = excluded.updated_at`).run(
      kind, id, status ?? 'todo', notes ?? '', now(), status ?? null, notes ?? null,
    );
    return db.prepare('SELECT * FROM progress WHERE kind = ? AND ref_id = ?').get(kind, id);
  });

  app.get<{ Querystring: { limit?: string } }>('/api/articles', async (req) => {
    const limit = Math.min(Number(req.query.limit ?? 600), 2000);
    return all(`SELECT a.id, a.title, a.url, a.published_at, a.summary, a.read, a.saved, a.added_at,
        f.title AS feed_title, f.tags AS tags
      FROM articles a JOIN feeds f ON f.id = a.feed_id
      ORDER BY COALESCE(a.published_at, a.added_at) DESC LIMIT ?`, limit).map((a) => ({ ...a, tags: JSON.parse(String(a.tags)) }));
  });

  app.patch<{ Params: { id: string }; Body: { read?: boolean; saved?: boolean } }>('/api/articles/:id', async (req, reply) => {
    const { read, saved } = req.body ?? {};
    const r = db.prepare('UPDATE articles SET read = COALESCE(?, read), saved = COALESCE(?, saved) WHERE id = ?').run(
      read === undefined ? null : Number(read), saved === undefined ? null : Number(saved), req.params.id);
    if (!r.changes) return reply.code(404).send({ error: 'Not found' });
    return { ok: true };
  });

  app.post('/api/articles/mark-read', async (req) => {
    const ids = ((req.body as { ids?: string[] })?.ids ?? []).slice(0, 2000);
    const stmt = db.prepare('UPDATE articles SET read = 1 WHERE id = ?');
    for (const id of ids) stmt.run(id);
    return { ok: true, count: ids.length };
  });

  app.get('/api/feeds', async () =>
    all(`SELECT f.*, (SELECT COUNT(*) FROM articles a WHERE a.feed_id = f.id) AS articles,
        (SELECT COUNT(*) FROM articles a WHERE a.feed_id = f.id AND a.read = 0) AS unread
      FROM feeds f ORDER BY f.title`).map((f) => ({ ...f, tags: JSON.parse(String(f.tags)) })));

  app.patch<{ Params: { id: string }; Body: { enabled: boolean } }>('/api/feeds/:id', async (req) => {
    db.prepare('UPDATE feeds SET enabled = ? WHERE id = ?').run(Number(!!req.body?.enabled), req.params.id);
    return { ok: true };
  });

  app.post('/api/feeds/refresh', async () => refreshFeeds(db));

  app.post('/api/ingest', async () => ingestAll(db));

  app.get<{ Querystring: { q?: string } }>('/api/search', async (req) => {
    const q = (req.query.q ?? '').trim();
    if (q.length < 2) return [];
    // Quote each term so user punctuation can't break FTS syntax; prefix-match the last one.
    const terms = q.split(/\s+/).map((t) => `"${t.replace(/"/g, '""')}"`);
    terms[terms.length - 1] += '*';
    try {
      return all(`SELECT kind, ref_id, tag, title, snippet(search_fts, 4, '<mark>', '</mark>', '…', 16) AS snippet
        FROM search_fts WHERE search_fts MATCH ? ORDER BY rank LIMIT 50`, terms.join(' '));
    } catch {
      return [];
    }
  });

  app.get('/api/dashboard', async () => {
    const p = plan();
    const current = p.weeks.filter((w) => w.current);
    const focusGuides = new Set(current.flatMap((w) => w.guide_numbers as number[]));
    const nextItems = all(`SELECT i.id, i.title, i.url, i.tier, i.est_minutes, i.tag, g.number AS guide_number, COALESCE(p.status,'todo') AS status
      FROM items i JOIN guides g ON g.id = i.guide_id ${withProgress('item', 'i')}
      WHERE COALESCE(p.status,'todo') != 'done'
      ORDER BY CASE COALESCE(p.status,'todo') WHEN 'reading' THEN 0 ELSE 1 END,
        CASE i.tier WHEN 'start' THEN 0 WHEN 'core' THEN 1 WHEN 'deep' THEN 2 ELSE 3 END, g.number, i.ord`)
      .filter((i) => i.status === 'reading' || !focusGuides.size || focusGuides.has(Number(i.guide_number)))
      .slice(0, 6);
    const latest = all(`SELECT a.id, a.title, a.url, a.published_at, a.read, a.saved, f.title AS feed_title, f.tags
      FROM articles a JOIN feeds f ON f.id = a.feed_id WHERE a.read = 0
      ORDER BY COALESCE(a.published_at, a.added_at) DESC LIMIT 8`).map((a) => ({ ...a, tags: JSON.parse(String(a.tags)) }));
    const counts = db.prepare(`SELECT
        (SELECT COUNT(*) FROM articles WHERE read = 0) AS unread,
        (SELECT COUNT(*) FROM articles WHERE saved = 1) AS saved`).get();
    const randomTerm = db.prepare(`SELECT * FROM glossary ORDER BY RANDOM() LIMIT 1`).get();
    return { plan: { start: p.start, currentWeek: p.currentWeek, current }, guides: guideStats(), nextItems, latest, counts, randomTerm };
  });

  app.put<{ Body: { plan_start?: string } }>('/api/settings', async (req, reply) => {
    const s = req.body?.plan_start;
    if (s !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) return reply.code(400).send({ error: 'plan_start must be YYYY-MM-DD' });
      setSetting(db, 'plan_start', s);
    }
    return { plan_start: planStart() };
  });

  app.get<{ Querystring: { url?: string; refresh?: string } }>('/api/read', async (req, reply) => {
    if (!req.query.url) return reply.code(400).send({ error: 'url is required' });
    try {
      return await readUrl(db, req.query.url, req.query.refresh === '1');
    } catch (e) {
      const status = e instanceof ReaderError ? e.status : 502;
      return reply.code(status).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Streams PDFs through the server so they can be embedded in the reader.
  app.get<{ Querystring: { url?: string } }>('/api/raw', async (req, reply) => {
    if (!req.query.url) return reply.code(400).send({ error: 'url is required' });
    try {
      const { res } = await safeFetch(req.query.url, 'application/pdf,*/*');
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !/application\/pdf/i.test(type)) {
        await res.body?.cancel();
        return reply.code(415).send({ error: 'Only PDFs can be proxied' });
      }
      const buf = await readCapped(res);
      return reply.type('application/pdf').header('cache-control', 'private, max-age=86400').send(buf);
    } catch (e) {
      const status = e instanceof ReaderError ? e.status : 502;
      return reply.code(status).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });
}
