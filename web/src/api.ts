// Typed API client. Mutations that fail because the device is offline are
// queued in localStorage and replayed when the connection returns.

export type Status = 'todo' | 'reading' | 'done';
export type Kind = 'item' | 'concept' | 'question' | 'week' | 'glossary';
export type Tier = 'start' | 'core' | 'deep' | 'other';

export interface GuideStat {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  tag: string;
  items: number;
  items_done: number;
  concepts: number;
  concepts_done: number;
  questions: number;
  questions_done: number;
}
export interface Meta {
  tags: string[];
  guides: GuideStat[];
}
export interface Item {
  id: string;
  guide_id: string;
  guide_number?: number;
  guide_title?: string;
  tier: Tier;
  section: string;
  title: string;
  url: string | null;
  est_minutes: number | null;
  note: string;
  md: string;
  tag: string;
  status: Status;
  notes: string;
}
export interface Concept {
  id: string;
  term: string;
  md: string;
  status: Status;
  notes: string;
  updated_at?: string | null;
}
export interface Question {
  id: string;
  md: string;
  status: Status;
  notes: string;
  updated_at?: string | null;
}
export interface GlossaryEntry {
  id: string;
  guide_id: string;
  section: string;
  term: string;
  md: string;
  status: Status;
  notes: string;
}
export interface Guide {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  overview_md: string;
  tag: string;
  sections: { ord: number; heading: string; md: string }[];
  items: Item[];
  concepts: Concept[];
  questions: Question[];
  glossary: GlossaryEntry[];
}
export interface PlanWeek {
  id: string;
  label: string;
  md: string;
  guide_numbers: number[];
  status: Status;
  notes: string;
  from: number;
  to: number | null;
  current: boolean;
}
export interface Plan {
  start: string;
  currentWeek: number;
  weeks: PlanWeek[];
}
export interface Article {
  id: string;
  title: string;
  url: string;
  published_at: string | null;
  summary: string;
  read: number;
  saved: number;
  feed_title: string;
  tags: string[];
}
export interface Feed {
  id: string;
  title: string;
  url: string;
  site: string | null;
  tags: string[];
  enabled: number;
  last_fetched: string | null;
  last_error: string | null;
  articles: number;
  unread: number;
}
export interface SearchHit {
  kind: Kind | 'article';
  ref_id: string;
  tag: string;
  title: string;
  snippet: string;
}
export interface Dashboard {
  plan: { start: string; currentWeek: number; current: PlanWeek[] };
  guides: GuideStat[];
  nextItems: Pick<Item, 'id' | 'title' | 'url' | 'tier' | 'est_minutes' | 'tag' | 'status' | 'guide_number'>[];
  latest: Article[];
  counts: { unread: number; saved: number };
  randomTerm: GlossaryEntry | null;
}
export interface ReaderResult {
  url: string;
  finalUrl: string;
  mode: 'article' | 'embed' | 'pdf' | 'iframe' | 'external';
  title: string;
  byline: string | null;
  siteName: string | null;
  excerpt: string | null;
  html: string | null;
  embedUrl: string | null;
  minutes: number | null;
  extraLinks: { label: string; url: string }[];
  fetchedAt: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const authEvents = new EventTarget();

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  if (res.status === 401) authEvents.dispatchEvent(new Event('required'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ---- offline outbox for mutations ----
const OUTBOX = 'tna-outbox';
type Pending = { method: string; path: string; body: unknown };

function readOutbox(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX) ?? '[]');
  } catch {
    return [];
  }
}
function writeOutbox(list: Pending[]) {
  try {
    localStorage.setItem(OUTBOX, JSON.stringify(list));
  } catch {
    /* storage unavailable: change stays in memory only */
  }
}

async function mutate<T>(method: string, path: string, body: unknown): Promise<T | null> {
  try {
    return await request<T>(method, path, body);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    // Network failure: keep the optimistic UI state and retry later.
    writeOutbox([...readOutbox(), { method, path, body }]);
    return null;
  }
}

export async function flushOutbox() {
  const list = readOutbox();
  if (!list.length) return;
  const remaining: Pending[] = [];
  for (const p of list) {
    try {
      await request(p.method, p.path, p.body);
    } catch (e) {
      if (!(e instanceof ApiError)) remaining.push(p);
    }
  }
  writeOutbox(remaining);
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushOutbox());
  void flushOutbox();
}

export const api = {
  meta: () => request<Meta>('GET', '/api/meta'),
  plan: () => request<Plan>('GET', '/api/plan'),
  guide: (id: string) => request<Guide>('GET', `/api/guides/${encodeURIComponent(id)}`),
  items: () => request<Item[]>('GET', '/api/items'),
  glossary: () => request<GlossaryEntry[]>('GET', '/api/glossary'),
  dashboard: () => request<Dashboard>('GET', '/api/dashboard'),
  articles: () => request<Article[]>('GET', '/api/articles'),
  feeds: () => request<Feed[]>('GET', '/api/feeds'),
  search: (q: string) => request<SearchHit[]>('GET', `/api/search?q=${encodeURIComponent(q)}`),
  read: (url: string, refresh = false) =>
    request<ReaderResult>('GET', `/api/read?url=${encodeURIComponent(url)}${refresh ? '&refresh=1' : ''}`),

  setProgress: (kind: Kind, id: string, patch: { status?: Status; notes?: string }) =>
    mutate('PUT', '/api/progress', { kind, id, ...patch }),
  setArticle: (id: string, patch: { read?: boolean; saved?: boolean }) => mutate('PATCH', `/api/articles/${id}`, patch),
  markRead: (ids: string[]) => mutate('POST', '/api/articles/mark-read', { ids }),
  setFeed: (id: string, enabled: boolean) => request('PATCH', `/api/feeds/${id}`, { enabled }),
  refreshFeeds: () => request<{ feeds: number; added: number; errors: Record<string, string> }>('POST', '/api/feeds/refresh'),
  reingest: () => request<Record<string, number>>('POST', '/api/ingest'),
  setPlanStart: (plan_start: string) => request<{ plan_start: string }>('PUT', '/api/settings', { plan_start }),
  login: (token: string) => request<{ ok: boolean }>('POST', '/api/login', { token }),
};
