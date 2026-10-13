// Copies data/app.db to backups/app-<timestamp>.db using SQLite's online backup.
import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('data/app.db');
if (!existsSync(src)) {
  console.error('No database at data/app.db yet. Run `npm run ingest` first.');
  process.exit(1);
}
mkdirSync('backups', { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = resolve(`backups/app-${stamp}.db`);
const db = new DatabaseSync(src);
await backup(db, dest);
db.close();
console.log(`Backed up to ${dest}`);
