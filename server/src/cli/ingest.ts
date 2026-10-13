import { openDb } from '../db.ts';
import { ingestAll } from '../ingest/guides.ts';

const db = openDb();
const counts = ingestAll(db);
db.close();
console.log('Ingested:', counts);
