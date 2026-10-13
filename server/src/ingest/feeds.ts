// Polls RSS/Atom feeds and stores new articles.
import Parser from 'rss-parser';
import { now, tx, type DB } from '../db.ts';
import { plain, stableId } from './parseGuide.ts';

const parser = new Parser({ timeout: 15_000 });
const UA = 'Mozilla/5.0 (compatible; TechNewsApp/0.1; personal reader)';
const KEEP_DAYS = 60;

interface FeedRow {
  id: string;
  title: string;
  url: string;
  tags: string;
}

function stripHtml(html: string) {
  return plain(html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"'));
}

async function fetchFeed(db: DB, feed: FeedRow) {
  const res = await fetch(feed.url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const parsed = await parser.parseString(await res.text());
  const tags = JSON.parse(feed.tags) as string[];
  const ins = db.prepare(`
    INSERT INTO articles (id, feed_id, title, url, published_at, summary, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, summary = excluded.summary`);
  const fts = db.prepare(`INSERT INTO search_fts (kind, ref_id, tag, title, body) VALUES ('article', ?, ?, ?, ?)`);
  const existing = db.prepare(`SELECT 1 FROM articles WHERE id = ?`);
  let added = 0;
  tx(db, () => {
    for (const entry of parsed.items.slice(0, 50)) {
      const url = entry.link ?? entry.guid;
      if (!url || !entry.title) continue;
      const id = stableId('article', url);
      const isNew = !existing.get(id);
      const summary = stripHtml(entry.contentSnippet ?? entry.summary ?? entry.content ?? '').slice(0, 400);
      const published = entry.isoDate ?? (entry.pubDate ? new Date(entry.pubDate).toISOString() : null);
      ins.run(id, feed.id, plain(entry.title), url, published, summary, now());
      if (isNew) {
        fts.run(id, tags.join(' '), plain(entry.title), summary);
        added++;
      }
    }
  });
  return added;
}

export async function refreshFeeds(db: DB, onlyId?: string) {
  const feeds = (onlyId
    ? db.prepare('SELECT id, title, url, tags FROM feeds WHERE id = ?').all(onlyId)
    : db.prepare('SELECT id, title, url, tags FROM feeds WHERE enabled = 1').all()) as unknown as FeedRow[];
  const mark = db.prepare('UPDATE feeds SET last_fetched = ?, last_error = ? WHERE id = ?');
  const results = await Promise.allSettled(feeds.map((f) => fetchFeed(db, f)));
  let added = 0;
  const errors: Record<string, string> = {};
  results.forEach((r, i) => {
    const f = feeds[i];
    if (r.status === 'fulfilled') {
      added += r.value;
      mark.run(now(), null, f.id);
    } else {
      const msg = String(r.reason?.message ?? r.reason);
      errors[f.title] = msg;
      mark.run(now(), msg, f.id);
    }
  });
  pruneArticles(db);
  return { feeds: feeds.length, added, errors };
}

/** Drops old, unsaved articles so the DB stays small. */
export function pruneArticles(db: DB) {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();
  tx(db, () => {
    db.prepare(`DELETE FROM search_fts WHERE kind = 'article' AND ref_id IN
      (SELECT id FROM articles WHERE saved = 0 AND COALESCE(published_at, added_at) < ?)`).run(cutoff);
    db.prepare(`DELETE FROM articles WHERE saved = 0 AND COALESCE(published_at, added_at) < ?`).run(cutoff);
  });
}

export function startFeedScheduler(db: DB, minutes = Number(process.env.FEED_INTERVAL_MIN ?? 30)) {
  const run = () =>
    refreshFeeds(db)
      .then((r) => console.log(`[feeds] refreshed ${r.feeds} feeds, ${r.added} new articles`, Object.keys(r.errors).length ? r.errors : ''))
      .catch((e) => console.error('[feeds] refresh failed', e));
  const last = db.prepare('SELECT MAX(last_fetched) AS t FROM feeds').get() as { t: string | null };
  if (!last.t || Date.now() - Date.parse(last.t) > minutes * 60_000) run();
  return setInterval(run, minutes * 60_000);
}
