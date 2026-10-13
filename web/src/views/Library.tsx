import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Status } from '../api';
import { fmtMinutes, ItemLink, Loading, Md, SearchInput, Segmented, StatusButton, TagChip, TagFilter, useAsync, useDebounced, useFilters } from '../lib';

type TierF = 'all' | 'start' | 'core' | 'deep' | 'other';
type StatusF = 'all' | 'open' | 'reading' | 'done';

export default function Library() {
  const items = useAsync(api.items);
  const meta = useAsync(api.meta);
  const f = useFilters();
  const [q, setQ] = useState(f.get('q'));
  const dq = useDebounced(q, 120).trim().toLowerCase();
  const tier = (f.get('tier') || 'all') as TierF;
  const status = (f.get('status') || 'all') as StatusF;

  const all = items.data ?? [];
  const filtered = useMemo(
    () =>
      all.filter(
        (i) =>
          (!f.tags.size || f.tags.has(i.tag)) &&
          (tier === 'all' || i.tier === tier) &&
          (status === 'all' || (status === 'open' ? i.status !== 'done' : i.status === status)) &&
          (!dq || `${i.title} ${i.note} ${i.section}`.toLowerCase().includes(dq)),
      ),
    [all, f.tags, tier, status, dq],
  );
  const counts = useMemo(() => all.reduce<Record<string, number>>((m, i) => ((m[i.tag] = (m[i.tag] ?? 0) + 1), m), {}), [all]);

  if (!items.data || !meta.data) return <Loading error={items.error ?? meta.error} />;

  const setStatus = (id: string, s: Status) => {
    void api.setProgress('item', id, { status: s });
    items.setData(all.map((i) => (i.id === id ? { ...i, status: s } : i)));
  };
  const totalMin = filtered.filter((i) => i.status !== 'done').reduce((m, i) => m + (i.est_minutes ?? 0), 0);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Library</h1>
        <p className="muted">Every reading item from every guide. Filter by topic, tier and status.</p>
      </header>

      <div className="sticky-tools stack">
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            f.set('q', v);
          }}
          placeholder="Filter by title or note…"
        />
        <TagFilter tags={meta.data.tags} counts={counts} />
        <div className="tool-row">
          <Segmented label="Tier" value={tier} onChange={(v) => f.set('tier', v === 'all' ? null : v)} options={[['all', 'All tiers'], ['start', 'Start here'], ['core', 'Core'], ['deep', 'Deep dive'], ['other', 'Other']]} />
          <Segmented label="Status" value={status} onChange={(v) => f.set('status', v === 'all' ? null : v)} options={[['all', 'Any'], ['open', 'Not done'], ['reading', 'Reading'], ['done', 'Done']]} />
        </div>
      </div>

      <p className="muted small" aria-live="polite">
        {filtered.length} of {all.length} items{totalMin ? ` · about ${fmtMinutes(totalMin)} of timed reading left` : ''}
      </p>

      <section className="card flush">
        {filtered.length === 0 && <div className="empty">No items match these filters.</div>}
        {filtered.map((i) => (
          <div key={i.id} className={`row${i.status === 'done' ? ' row-done' : ''}`}>
            <StatusButton status={i.status} onChange={(s) => setStatus(i.id, s)} />
            <div className="row-body">
              <ItemLink title={i.title} url={i.url} />
              {i.note && <Md md={i.note} inline className="row-note" />}
              <div className="row-meta">
                <TagChip tag={i.tag} />
                <Link to={`/guide/${i.guide_id}`} className="pill">Guide {String(i.guide_number).padStart(2, '0')}</Link>
                <span className={`tier tier-${i.tier}`}>{i.tier === 'other' ? i.section : i.tier === 'start' ? 'Start here' : i.tier}</span>
                {i.est_minutes ? <span>{fmtMinutes(i.est_minutes)}</span> : null}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
