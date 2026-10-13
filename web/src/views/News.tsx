import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Article } from '../api';
import { Loading, readerHref, SearchInput, Segmented, TagChip, TagFilter, timeAgo, useAsync, useDebounced, useFilters } from '../lib';

type Show = 'unread' | 'all' | 'saved';
const NEWS_TAGS = ['News', 'AI Engineering', 'Cybersecurity', 'Systems', 'Frontend & Tooling', 'Stack Critique', 'Culture'];

export default function News() {
  const { data, setData, error, reload } = useAsync(api.articles);
  const f = useFilters();
  const [q, setQ] = useState(f.get('q'));
  const dq = useDebounced(q, 120).trim().toLowerCase();
  const show = (f.get('show') || 'unread') as Show;
  const source = f.get('source');
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const articles = data ?? [];
  const filtered = useMemo(
    () =>
      articles.filter(
        (a) =>
          (show === 'all' || (show === 'unread' ? !a.read : !!a.saved)) &&
          (!f.tags.size || a.tags.some((t) => f.tags.has(t))) &&
          (!source || a.feed_title === source) &&
          (!dq || `${a.title} ${a.summary} ${a.feed_title}`.toLowerCase().includes(dq)),
      ),
    [articles, show, f.tags, source, dq],
  );
  const tagCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of articles) if (!a.read) for (const t of a.tags) m[t] = (m[t] ?? 0) + 1;
    return m;
  }, [articles]);
  const sources = useMemo(() => [...new Set(articles.map((a) => a.feed_title))].sort(), [articles]);

  if (!data) return <Loading error={error} />;

  const patch = (id: string, p: Partial<Pick<Article, 'read' | 'saved'>>) => {
    setData(articles.map((a) => (a.id === id ? { ...a, ...p } : a)));
    void api.setArticle(id, { read: p.read === undefined ? undefined : !!p.read, saved: p.saved === undefined ? undefined : !!p.saved });
  };
  const markAllRead = () => {
    const ids = filtered.filter((a) => !a.read).map((a) => a.id);
    if (!ids.length) return;
    const set = new Set(ids);
    setData(articles.map((a) => (set.has(a.id) ? { ...a, read: 1 } : a)));
    void api.markRead(ids);
  };
  const refresh = async () => {
    setRefreshing('Refreshing…');
    try {
      const r = await api.refreshFeeds();
      const errs = Object.keys(r.errors).length;
      setRefreshing(`${r.added} new from ${r.feeds} feeds${errs ? ` · ${errs} failed` : ''}`);
      await reload();
    } catch (e) {
      setRefreshing(e instanceof Error ? e.message : 'Refresh failed');
    }
    setTimeout(() => setRefreshing(null), 4000);
  };

  return (
    <div className="page">
      <header className="page-head">
        <div className="title-row spread">
          <h1>News</h1>
          <div className="btn-row">
            <button type="button" className="btn" onClick={markAllRead}>Mark shown read</button>
            <button type="button" className="btn primary" onClick={refresh} disabled={refreshing === 'Refreshing…'}>↻ Refresh</button>
          </div>
        </div>
        {refreshing && <p className="muted small" aria-live="polite">{refreshing}</p>}
      </header>

      <div className="sticky-tools stack">
        <SearchInput value={q} onChange={(v) => { setQ(v); f.set('q', v); }} placeholder="Filter headlines…" />
        <TagFilter tags={NEWS_TAGS} counts={tagCounts} />
        <div className="tool-row">
          <Segmented label="Show" value={show} onChange={(v) => f.set('show', v === 'unread' ? null : v)} options={[['unread', 'Unread'], ['all', 'All'], ['saved', 'Saved']]} />
          <select className="select" value={source} onChange={(e) => f.set('source', e.target.value || null)} aria-label="Source">
            <option value="">All sources</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <p className="muted small" aria-live="polite">{filtered.length} articles</p>

      <section className="card flush">
        {filtered.length === 0 && <div className="empty">{show === 'saved' ? 'Nothing saved yet. Tap ☆ on an article to keep it.' : 'All caught up.'}</div>}
        {filtered.map((a) => (
          <article key={a.id} className={`news-row${a.read ? ' read' : ''}`}>
            <div className="row-body">
              <Link to={readerHref(a.url)} className="item-title" onClick={() => !a.read && patch(a.id, { read: 1 })}>
                {a.title}
              </Link>
              {a.summary && <p className="row-note clamp">{a.summary}</p>}
              <div className="row-meta">
                <button type="button" className="link-btn" onClick={() => f.set('source', a.feed_title)}>{a.feed_title}</button>
                <span>{timeAgo(a.published_at)}</span>
                {a.tags.filter((t) => t !== 'News').map((t) => <TagChip key={t} tag={t} />)}
              </div>
            </div>
            <div className="news-actions">
              <button type="button" className={`icon-btn${a.saved ? ' on' : ''}`} onClick={() => patch(a.id, { saved: a.saved ? 0 : 1 })} aria-label={a.saved ? 'Unsave' : 'Save for later'} aria-pressed={!!a.saved}>
                {a.saved ? '★' : '☆'}
              </button>
              <button type="button" className="icon-btn" onClick={() => patch(a.id, { read: a.read ? 0 : 1 })} aria-label={a.read ? 'Mark unread' : 'Mark read'}>
                {a.read ? '○' : '●'}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
