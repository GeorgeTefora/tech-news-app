import { useMemo, useState } from 'react';
import { api, type Status } from '../api';
import { Loading, Md, SearchInput, Segmented, StatusButton, useAsync, useDebounced, useFilters } from '../lib';

export default function Culture() {
  const guide = useAsync(() => api.guide('06'));
  const f = useFilters();
  const [q, setQ] = useState(f.get('q'));
  const dq = useDebounced(q, 120).trim().toLowerCase();
  const show = (f.get('show') || 'all') as 'all' | 'new' | 'known';

  const g = guide.data;
  const entries = g?.glossary ?? [];
  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (show === 'all' || (show === 'known' ? e.status === 'done' : e.status !== 'done')) &&
          (!dq || `${e.term} ${e.md}`.toLowerCase().includes(dq)),
      ),
    [entries, show, dq],
  );
  const sections = useMemo(() => [...new Set(entries.map((e) => e.section))], [entries]);

  if (!g) return <Loading error={guide.error} />;

  const setStatus = (id: string, status: Status) => {
    void api.setProgress('glossary', id, { status });
    guide.setData({ ...g, glossary: g.glossary.map((e) => (e.id === id ? { ...e, status } : e)) });
  };
  const known = entries.filter((e) => e.status === 'done').length;
  const extra = g.sections.filter((s) => /jokes come from|People you should/i.test(s.heading));

  return (
    <div className="page">
      <header className="page-head">
        <h1>Culture & inside jokes</h1>
        <Md md={g.overview_md} className="md lead" />
        <p className="muted small">You get {known} of {entries.length} references. Tick the ones that land for you.</p>
      </header>

      <div className="sticky-tools stack">
        <SearchInput value={q} onChange={(v) => { setQ(v); f.set('q', v); }} placeholder="Look up a joke, term or company…" />
        <Segmented label="Show" value={show} onChange={(v) => f.set('show', v === 'all' ? null : v)} options={[['all', 'All'], ['new', "Don't know yet"], ['known', 'Got it']]} />
      </div>

      {sections.map((sec) => {
        const list = filtered.filter((e) => e.section === sec);
        if (!list.length) return null;
        return (
          <section key={sec} className="card">
            <h2>{sec}</h2>
            {list.map((e) => (
              <div key={e.id} className={`row${e.status === 'done' ? ' row-done' : ''}`}>
                <StatusButton status={e.status} binary onChange={(s) => setStatus(e.id, s)} />
                <div className="row-body">
                  <Md md={e.md} inline />
                </div>
              </div>
            ))}
          </section>
        );
      })}
      {filtered.length === 0 && <div className="empty">No terms match.</div>}

      {!dq &&
        extra.map((s) => (
          <section key={s.ord} className="card">
            <h2>{s.heading}</h2>
            <Md md={s.md} />
          </section>
        ))}
    </div>
  );
}
