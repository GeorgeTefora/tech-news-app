// SQLite storage via Node's built-in `node:sqlite` (no native build step).
// Content tables (guides, items, …) are rebuilt by ingest; user state lives in
// `progress`, `articles.read/saved` and `settings`, which ingest never touches.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DEFAULT_DB_PATH = resolve(ROOT, 'data/app.db');

export type DB = DatabaseSync;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS guides (
  id TEXT PRIMARY KEY,           -- slug, e.g. 01-ai-engineering
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  overview_md TEXT NOT NULL DEFAULT '',
  tag TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sections (
  guide_id TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL,
  heading TEXT NOT NULL,
  md TEXT NOT NULL,
  PRIMARY KEY (guide_id, ord)
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  guide_id TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL,
  tier TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  est_minutes INTEGER,
  note TEXT NOT NULL DEFAULT '',
  md TEXT NOT NULL,
  tag TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  guide_id TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL,
  term TEXT NOT NULL,
  md TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS glossary (
  id TEXT PRIMARY KEY,
  guide_id TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL,
  section TEXT NOT NULL,
  term TEXT NOT NULL,
  md TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  guide_id TEXT NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL,
  md TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS plan_weeks (
  id TEXT PRIMARY KEY,
  ord INTEGER NOT NULL,
  label TEXT NOT NULL,
  md TEXT NOT NULL,
  guide_numbers TEXT NOT NULL   -- JSON array
);

-- User state. kind: item | concept | question | week | glossary
CREATE TABLE IF NOT EXISTS progress (
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',   -- todo | reading | done
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (kind, ref_id)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  site TEXT,
  tags TEXT NOT NULL,            -- JSON array
  enabled INTEGER NOT NULL DEFAULT 1,
  last_fetched TEXT,
  last_error TEXT
);
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TEXT,
  summary TEXT NOT NULL DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0,
  saved INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS articles_published ON articles(published_at DESC);

CREATE TABLE IF NOT EXISTS reader_cache (
  url TEXT PRIMARY KEY,
  payload TEXT NOT NULL,         -- JSON ReaderResult
  fetched_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
  kind UNINDEXED, ref_id UNINDEXED, tag UNINDEXED, title, body,
  tokenize = 'porter unicode61'
);
`;

export function openDb(path = process.env.DB_PATH ?? DEFAULT_DB_PATH): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}

/** Runs `fn` inside a transaction, rolling back on error. */
export function tx<T>(db: DB, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export const now = () => new Date().toISOString();
