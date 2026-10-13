// Loads content/guides/*.md and content/feeds.json into SQLite.
// Content rows are replaced wholesale; progress rows are keyed by stable ids so
// they survive re-ingestion.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, tx, type DB } from '../db.ts';
import { parseGuide, plain, stableId, type ParsedGuide } from './parseGuide.ts';

export const CONTENT_DIR = resolve(ROOT, 'content');

export function loadGuides(dir = resolve(CONTENT_DIR, 'guides')): ParsedGuide[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => parseGuide(readFileSync(resolve(dir, f), 'utf8'), f));
}

export function ingestGuides(db: DB, guides: ParsedGuide[]) {
  tx(db, () => {
    for (const t of ['sections', 'items', 'concepts', 'glossary', 'questions', 'plan_weeks', 'guides']) {
      db.exec(`DELETE FROM ${t}`);
    }
    db.exec(`DELETE FROM search_fts WHERE kind != 'article'`);

    const insGuide = db.prepare('INSERT INTO guides VALUES (?, ?, ?, ?, ?, ?)');
    const insSection = db.prepare('INSERT INTO sections VALUES (?, ?, ?, ?)');
    const insItem = db.prepare('INSERT INTO items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insConcept = db.prepare('INSERT INTO concepts VALUES (?, ?, ?, ?, ?)');
    const insGloss = db.prepare('INSERT INTO glossary VALUES (?, ?, ?, ?, ?, ?)');
    const insQuestion = db.prepare('INSERT INTO questions VALUES (?, ?, ?, ?)');
    const insWeek = db.prepare('INSERT INTO plan_weeks VALUES (?, ?, ?, ?, ?)');
    const insFts = db.prepare('INSERT INTO search_fts (kind, ref_id, tag, title, body) VALUES (?, ?, ?, ?, ?)');

    for (const g of guides) {
      insGuide.run(g.slug, g.number, g.title, g.subtitle, g.overview, g.tag);
      for (const s of g.sections) insSection.run(g.slug, s.ord, s.heading, s.md);
      for (const i of g.items) {
        insItem.run(i.id, g.slug, i.ord, i.tier, i.section, i.title, i.url, i.estMinutes, i.note, i.md, g.tag);
        insFts.run('item', i.id, g.tag, i.title, plain(i.note));
      }
      for (const c of g.concepts) {
        insConcept.run(c.id, g.slug, c.ord, c.term, c.md);
        insFts.run('concept', c.id, g.tag, c.term, plain(c.md));
      }
      for (const e of g.glossary) {
        insGloss.run(e.id, g.slug, e.ord, e.section, e.term, e.md);
        insFts.run('glossary', e.id, g.tag, e.term, plain(e.md));
      }
      for (const q of g.questions) {
        insQuestion.run(q.id, g.slug, q.ord, q.md);
        insFts.run('question', q.id, g.tag, plain(q.md), '');
      }
      for (const w of g.planWeeks) insWeek.run(w.id, w.ord, w.label, w.md, JSON.stringify(w.guideNumbers));
    }
  });
}

interface FeedSeed {
  title: string;
  url: string;
  site?: string;
  tags: string[];
}

/** Upserts feeds from content/feeds.json, keeping fetch state for existing ones. */
export function ingestFeeds(db: DB, path = resolve(CONTENT_DIR, 'feeds.json')) {
  const seeds = JSON.parse(readFileSync(path, 'utf8')) as FeedSeed[];
  const upsert = db.prepare(`
    INSERT INTO feeds (id, title, url, site, tags) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET title = excluded.title, site = excluded.site, tags = excluded.tags`);
  tx(db, () => {
    for (const f of seeds) upsert.run(stableId('feed', f.url), f.title, f.url, f.site ?? null, JSON.stringify(f.tags));
  });
  return seeds.length;
}

export function ingestAll(db: DB) {
  const guides = loadGuides();
  ingestGuides(db, guides);
  const feeds = ingestFeeds(db);
  return {
    guides: guides.length,
    items: guides.reduce((n, g) => n + g.items.length, 0),
    concepts: guides.reduce((n, g) => n + g.concepts.length, 0),
    glossary: guides.reduce((n, g) => n + g.glossary.length, 0),
    questions: guides.reduce((n, g) => n + g.questions.length, 0),
    weeks: guides.reduce((n, g) => n + g.planWeeks.length, 0),
    feeds,
  };
}
