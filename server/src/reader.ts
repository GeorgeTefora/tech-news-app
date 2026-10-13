// In-app reader: fetches a page server-side (avoiding CORS / frame blocking),
// extracts the article with Readability and returns sanitized HTML.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import createDOMPurify from 'dompurify';
import { now, type DB } from './db.ts';

export type ReaderMode = 'article' | 'embed' | 'pdf' | 'iframe' | 'external';

export interface ReaderResult {
  url: string;
  finalUrl: string;
  mode: ReaderMode;
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

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const MAX_BYTES = 8 * 1024 * 1024;
const CACHE_DAYS = 14;

// ---------- SSRF guard ----------

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true;
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIp(mapped[1]) : false;
  }
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT, includes Tailscale
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ReaderError(400, 'Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new ReaderError(400, 'Only http(s) URLs are allowed');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new ReaderError(403, 'Blocked host');
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new ReaderError(502, `Could not resolve ${host}`);
  if (addrs.some((a) => isPrivateIp(a.address))) throw new ReaderError(403, 'Blocked private address');
  return url;
}

export class ReaderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** fetch() that re-checks every redirect hop against the SSRF guard. */
export async function safeFetch(raw: string, accept = 'text/html,application/xhtml+xml,*/*;q=0.8') {
  let current = raw;
  for (let hop = 0; hop < 6; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': UA, accept, 'accept-language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location')!, url).toString();
      continue;
    }
    return { res, finalUrl: url.toString() };
  }
  throw new ReaderError(508, 'Too many redirects');
}

async function readCapped(res: Response): Promise<Buffer> {
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > MAX_BYTES) throw new ReaderError(413, 'Page too large');
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new ReaderError(413, 'Page too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// ---------- special cases ----------

function youtubeId(u: URL): string | null {
  if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
  if (/(^|\.)youtube\.com$/.test(u.hostname)) {
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/);
    if (m) return m[1];
  }
  return null;
}

function frameAllowed(headers: Headers): boolean {
  const xfo = headers.get('x-frame-options');
  if (xfo && /deny|sameorigin/i.test(xfo)) return false;
  const csp = headers.get('content-security-policy');
  const fa = csp?.match(/frame-ancestors([^;]*)/i)?.[1];
  if (fa && !/\*/.test(fa)) return false;
  return true;
}

function base(url: string, partial: Partial<ReaderResult>): ReaderResult {
  return {
    url,
    finalUrl: url,
    mode: 'external',
    title: url,
    byline: null,
    siteName: null,
    excerpt: null,
    html: null,
    embedUrl: null,
    minutes: null,
    extraLinks: [],
    fetchedAt: now(),
    ...partial,
  };
}

// ---------- main ----------

export async function extract(rawUrl: string): Promise<ReaderResult> {
  const u = new URL(rawUrl);

  const yt = youtubeId(u);
  if (yt) {
    return base(rawUrl, {
      mode: 'embed',
      title: 'YouTube video',
      siteName: 'YouTube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`,
    });
  }

  const extraLinks: ReaderResult['extraLinks'] = [];
  const arxiv = u.hostname.endsWith('arxiv.org') ? u.pathname.match(/^\/(?:abs|pdf)\/([\w.\-/]+?)(?:\.pdf)?$/) : null;
  if (arxiv) {
    extraLinks.push({ label: 'PDF', url: `https://arxiv.org/pdf/${arxiv[1]}` });
    extraLinks.push({ label: 'HTML (if available)', url: `https://arxiv.org/html/${arxiv[1]}` });
  }

  const { res, finalUrl } = await safeFetch(rawUrl);
  if (!res.ok) {
    await res.body?.cancel();
    return base(rawUrl, { finalUrl, mode: 'external', title: `HTTP ${res.status}`, extraLinks });
  }
  const type = res.headers.get('content-type') ?? '';
  if (/application\/pdf/i.test(type)) {
    await res.body?.cancel();
    return base(rawUrl, { finalUrl, mode: 'pdf', title: decodeURIComponent(u.pathname.split('/').pop() || 'PDF'), embedUrl: `/api/raw?url=${encodeURIComponent(finalUrl)}`, extraLinks });
  }
  if (!/html|xml/i.test(type)) {
    await res.body?.cancel();
    return base(rawUrl, { finalUrl, mode: 'external', title: finalUrl, extraLinks });
  }

  const canFrame = frameAllowed(res.headers);
  const html = (await readCapped(res)).toString('utf8');
  const dom = new JSDOM(html, { url: finalUrl });
  const doc = dom.window.document;
  const pageTitle = doc.title?.trim() || finalUrl;
  const article = new Readability(doc, { charThreshold: 300 }).parse();

  if (!article?.content || (article.textContent ?? '').trim().length < 300) {
    return base(rawUrl, { finalUrl, mode: canFrame ? 'iframe' : 'external', title: pageTitle, embedUrl: canFrame ? finalUrl : null, extraLinks });
  }

  const purify = createDOMPurify(new JSDOM('').window as unknown as Window & typeof globalThis);
  const clean = purify.sanitize(article.content, {
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'script'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
  });
  const words = (article.textContent ?? '').trim().split(/\s+/).length;
  return base(rawUrl, {
    finalUrl,
    mode: 'article',
    title: article.title || pageTitle,
    byline: article.byline ?? null,
    siteName: article.siteName ?? u.hostname.replace(/^www\./, ''),
    excerpt: article.excerpt ?? null,
    html: clean,
    embedUrl: canFrame ? finalUrl : null,
    minutes: Math.max(1, Math.round(words / 230)),
    extraLinks,
  });
}

export async function readUrl(db: DB, url: string, refresh = false): Promise<ReaderResult> {
  if (!refresh) {
    const hit = db.prepare('SELECT payload, fetched_at FROM reader_cache WHERE url = ?').get(url) as
      | { payload: string; fetched_at: string }
      | undefined;
    if (hit && Date.now() - Date.parse(hit.fetched_at) < CACHE_DAYS * 86_400_000) return JSON.parse(hit.payload);
  }
  await assertPublicUrl(url);
  const result = await extract(url);
  db.prepare(`INSERT INTO reader_cache (url, payload, fetched_at) VALUES (?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`).run(
    url,
    JSON.stringify(result),
    result.fetchedAt,
  );
  return result;
}

export { readCapped };
