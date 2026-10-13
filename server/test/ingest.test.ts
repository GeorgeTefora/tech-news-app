import { describe, expect, it } from 'vitest';
import { openDb } from '../src/db.ts';
import { ingestAll, loadGuides } from '../src/ingest/guides.ts';
import { weekRange } from '../src/routes/api.ts';

const guides = loadGuides();
const bySlug = (prefix: string) => guides.find((g) => g.slug.startsWith(prefix))!;

describe('parseGuide on the real roadmap guides', () => {
  it('loads all eight guides with numbers and tags', () => {
    expect(guides.map((g) => g.number)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(bySlug('01').tag).toBe('AI Engineering');
    expect(bySlug('06').tag).toBe('Culture');
  });

  it('extracts 01 – AI Engineering structure', () => {
    const g = bySlug('01');
    expect(g.title).toBe('AI Engineering');
    expect(g.overview).toMatch(/on top of/);
    expect(g.concepts).toHaveLength(11);
    const tiers = (t: string) => g.items.filter((i) => i.tier === t).length;
    expect([tiers('start'), tiers('core'), tiers('deep')]).toEqual([4, 9, 6]);
    expect(g.questions).toHaveLength(3);
  });

  it('parses item title, url, time and note', () => {
    const karpathy = bySlug('01').items[0];
    expect(karpathy.title).toBe('Intro to Large Language Models – Andrej Karpathy (video)');
    expect(karpathy.url).toBe('https://www.youtube.com/watch?v=zjkBMFhNj_g');
    expect(karpathy.estMinutes).toBe(60);
    expect(karpathy.note).toMatch(/^the best one-hour mental model/);

    const book = bySlug('01').items.find((i) => i.title.startsWith('AI Engineering – Chip Huyen'))!;
    expect(book.url).toBeNull();
    expect(book.tier).toBe('deep');

    const wave = bySlug('02').items.find((i) => i.title === 'Recent supply-chain wave (2025–26)')!;
    expect(wave.note).toMatch(/^a run of malicious npm packages/);
    expect(bySlug('07').items.some((i) => i.section === 'Routine')).toBe(false);

    const docker = bySlug('03').items.find((i) => i.title === 'Docker overview')!;
    expect(docker.estMinutes).toBe(30);
    expect(docker.note).toMatch(/^read the official/);
  });

  it('extracts the 10-week plan from 00 with guide references', () => {
    const weeks = bySlug('00').planWeeks;
    expect(weeks).toHaveLength(7);
    expect(weeks[0].label).toBe('Week 0 (today)');
    expect(weeks[0].guideNumbers.sort()).toEqual([6, 7]);
    expect(weeks[1].guideNumbers).toEqual([1]);
    expect(bySlug('00').items).toHaveLength(0);
  });

  it('builds the culture glossary from 06', () => {
    const g = bySlug('06');
    expect(g.glossary.length).toBeGreaterThan(40);
    expect(g.glossary.map((e) => e.term)).toContain('"Vibe coding"');
  });

  it('has unique ids within each guide', () => {
    for (const g of guides) {
      const ids = [...g.items, ...g.concepts, ...g.glossary, ...g.questions].map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('weekRange', () => {
  it('handles single weeks, ranges and ongoing', () => {
    expect(weekRange('Week 0 (today)')).toEqual([0, 0]);
    expect(weekRange('Weeks 1–3, AI Engineering (01)')).toEqual([1, 3]);
    expect(weekRange('Week 10 and ongoing')).toEqual([10, Infinity]);
  });
});

describe('ingest into SQLite', () => {
  it('is idempotent and preserves progress', () => {
    const db = openDb(':memory:');
    ingestAll(db);
    const item = db.prepare('SELECT id FROM items LIMIT 1').get() as { id: string };
    db.prepare(`INSERT INTO progress VALUES ('item', ?, 'done', 'great', '2026-10-13')`).run(item.id);
    ingestAll(db);
    const p = db.prepare(`SELECT p.status FROM progress p JOIN items i ON i.id = p.ref_id WHERE p.ref_id = ?`).get(item.id) as { status: string };
    expect(p.status).toBe('done');
    const fts = db.prepare(`SELECT title FROM search_fts WHERE search_fts MATCH 'retrieval' LIMIT 5`).all();
    expect(fts.length).toBeGreaterThan(0);
    db.close();
  });
});
