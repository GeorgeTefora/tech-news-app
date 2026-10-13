import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { marked } from 'marked';
import type { Status } from './api';

marked.setOptions({ gfm: true });

// ---------- data loading ----------

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(() => {
    setLoading(true);
    return fnRef
      .current()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void reload(), deps);
  return { data, setData, error, loading, reload };
}

export function useDebounced<T>(value: T, ms = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Filter state kept in the URL query so views are linkable and survive reloads. */
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const tags = useMemo(() => new Set((params.get('tags') ?? '').split(',').filter(Boolean)), [params]);
  const set = useCallback(
    (key: string, value: string | null) =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p);
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const toggleTag = useCallback(
    (tag: string) => {
      const next = new Set(tags);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      set('tags', [...next].join(','));
    },
    [tags, set],
  );
  return { params, tags, toggleTag, clearTags: () => set('tags', null), get: (k: string) => params.get(k) ?? '', set };
}

// ---------- helpers ----------

export const readerHref = (url: string) => `/read?url=${encodeURIComponent(url)}`;

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const fmtMinutes = (m: number | null | undefined) => (!m ? '' : m >= 60 ? `${+(m / 60).toFixed(1)} hr` : `${m} min`);

export const TAG_COLORS: Record<string, string> = {
  'AI Engineering': '#a78bfa',
  Cybersecurity: '#f87171',
  Systems: '#34d399',
  'Frontend & Tooling': '#38bdf8',
  'Stack Critique': '#fbbf24',
  Culture: '#f472b6',
  News: '#94a3b8',
  Roadmap: '#cbd5e1',
};

// ---------- components ----------

/**
 * Renders trusted guide Markdown. External links open in the in-app reader;
 * app-relative links (e.g. `/guide/01`) navigate client-side.
 */
export function Md({ md, inline = false, className }: { md: string; inline?: boolean; className?: string }) {
  const navigate = useNavigate();
  const html = useMemo(() => (inline ? marked.parseInline(md) : marked.parse(md)) as string, [md, inline]);
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a || e.ctrlKey || e.metaKey) return;
    const href = a.getAttribute('href') ?? '';
    const internal = href.startsWith('/') && !href.startsWith('//');
    if (!internal && !/^https?:/.test(href)) return;
    e.preventDefault();
    e.stopPropagation();
    navigate(internal ? href : readerHref(href));
  };
  const Tag = inline ? 'span' : 'div';
  return <Tag className={className ?? (inline ? undefined : 'md')} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}

const NEXT: Record<Status, Status> = { todo: 'reading', reading: 'done', done: 'todo' };
const LABEL: Record<Status, string> = { todo: 'To do', reading: 'Reading', done: 'Done' };

/** Cycles todo → reading → done. `binary` toggles todo ⇄ done (checklists). */
export function StatusButton({ status, onChange, binary = false }: { status: Status; onChange: (s: Status) => void; binary?: boolean }) {
  const next = binary ? (status === 'done' ? 'todo' : 'done') : NEXT[status];
  return (
    <button
      type="button"
      className={`status status-${status}${binary ? ' status-check' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(next);
      }}
      aria-label={binary ? (status === 'done' ? 'Mark not done' : 'Mark done') : `Status: ${LABEL[status]}. Change to ${LABEL[next]}`}
      title={binary ? undefined : `${LABEL[status]} → ${LABEL[next]}`}
    >
      {status === 'done' ? '✓' : status === 'reading' ? '◐' : ''}
    </button>
  );
}

export function ProgressBar({ value, total, label }: { value: number; total: number; label?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="progress" title={`${value}/${total}`}>
      <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-label">
        {value}/{total}
      </span>
    </div>
  );
}

export function TagChip({ tag, active, onClick, count }: { tag: string; active?: boolean; onClick?: () => void; count?: number }) {
  const style = { ['--tag' as string]: TAG_COLORS[tag] ?? '#94a3b8' };
  if (!onClick) return <span className="tag" style={style}>{tag}</span>;
  return (
    <button type="button" className={`chip${active ? ' active' : ''}`} style={style} onClick={onClick} aria-pressed={!!active}>
      {tag}
      {count !== undefined && <span className="chip-count">{count}</span>}
    </button>
  );
}

export function TagFilter({ tags, counts }: { tags: string[]; counts?: Record<string, number> }) {
  const f = useFilters();
  return (
    <div className="chips" role="group" aria-label="Filter by topic">
      {tags.map((t) => (
        <TagChip key={t} tag={t} active={f.tags.has(t)} onClick={() => f.toggleTag(t)} count={counts?.[t]} />
      ))}
      {f.tags.size > 0 && (
        <button type="button" className="chip chip-clear" onClick={f.clearTags}>
          Clear
        </button>
      )}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="search">
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" className={value === v ? 'active' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Notes({ value, onSave, placeholder = 'Your notes…' }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <textarea
      className="notes"
      value={v}
      placeholder={placeholder}
      rows={Math.min(8, Math.max(2, v.split('\n').length + 1))}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
    />
  );
}

export function Loading({ error, children }: { error?: string | null; children?: ReactNode }) {
  if (error) return <div className="empty error">Couldn't load: {error}</div>;
  return <div className="empty">{children ?? 'Loading…'}</div>;
}

export function ItemLink({ title, url }: { title: string; url: string | null }) {
  if (!url) return <span className="item-title">{title}</span>;
  return (
    <Link className="item-title" to={readerHref(url)}>
      {title}
    </Link>
  );
}
