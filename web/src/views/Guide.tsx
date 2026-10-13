import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Guide, type Kind, type Status } from '../api';
import { fmtMinutes, ItemLink, Loading, Md, Notes, ProgressBar, Segmented, StatusButton, TagChip, useAsync, useFilters } from '../lib';

type Tab = 'reading' | 'concepts' | 'practice' | 'more';
const TIER_LABEL: Record<string, string> = { start: 'Start here', core: 'Core', deep: 'Deep dive' };

export default function GuideView() {
  const { id = '' } = useParams();
  const { data: g, setData, error } = useAsync(() => api.guide(id), [id]);
  const f = useFilters();
  const [openNotes, setOpenNotes] = useState<string | null>(null);

  const extraSections = useMemo(() => {
    if (!g) return [];
    const extracted = [...g.items.map((i) => i.md), ...g.concepts.map((c) => c.md), ...g.questions.map((q) => q.md), ...g.glossary.map((e) => e.md)];
    return g.sections.filter((s) => !/^(Overview|What this folder is for)$/i.test(s.heading) && s.md && !extracted.some((m) => s.md.includes(m)));
  }, [g]);

  if (!g) return <Loading error={error} />;
  if (g.number === 0) {
    return (
      <div className="page">
        <p>The roadmap overview lives on the <Link to="/roadmap">Roadmap</Link> page.</p>
      </div>
    );
  }

  const tabs: [Tab, string][] = [];
  if (g.items.length) tabs.push(['reading', `Reading (${g.items.length})`]);
  if (g.concepts.length) tabs.push(['concepts', `Concepts (${g.concepts.length})`]);
  if (g.questions.length) tabs.push(['practice', `Practice (${g.questions.length})`]);
  if (extraSections.length) tabs.push(['more', 'Cheat sheets']);
  const tab = (tabs.find(([t]) => t === f.get('tab'))?.[0] ?? tabs[0]?.[0] ?? 'more') as Tab;

  const update = (kind: Kind, refId: string, patch: { status?: Status; notes?: string }) => {
    void api.setProgress(kind, refId, patch);
    const key = ({ item: 'items', concept: 'concepts', question: 'questions', glossary: 'glossary' } as const)[kind as 'item'];
    if (!key) return;
    const stamp = new Date().toISOString();
    setData({
      ...g,
      [key]: (g[key] as { id: string }[]).map((x) => (x.id === refId ? { ...x, ...patch, updated_at: stamp } : x)),
    } as Guide);
  };

  const groups: { section: string; tier: string; items: Guide['items'] }[] = [];
  for (const i of g.items) {
    const last = groups[groups.length - 1];
    if (last && last.section === i.section) last.items.push(i);
    else groups.push({ section: i.section, tier: i.tier, items: [i] });
  }
  const done = (xs: { status: Status }[]) => xs.filter((x) => x.status === 'done').length;

  return (
    <div className="page">
      <header className="page-head">
        <Link to="/roadmap" className="link-muted small">← Roadmap</Link>
        <div className="title-row">
          <span className="guide-num big">{String(g.number).padStart(2, '0')}</span>
          <h1>{g.title}</h1>
        </div>
        <div className="row-meta">
          <TagChip tag={g.tag} />
          {g.subtitle && <span className="muted">{g.subtitle}</span>}
        </div>
        {g.overview_md && <Md md={g.overview_md} className="md lead" />}
      </header>

      <div className="sticky-tools">
        <Segmented label="Guide section" value={tab} options={tabs} onChange={(t) => f.set('tab', t)} />
      </div>

      {tab === 'reading' && (
        <>
          <ProgressBar value={done(g.items)} total={g.items.length} label="Reading progress" />
          {groups.map((grp) => (
            <section key={grp.section} className="card">
              <h2>
                {TIER_LABEL[grp.tier] ?? grp.section}
                {grp.tier !== 'other' && <span className={`tier tier-${grp.tier}`} />}
              </h2>
              {grp.items.map((i) => (
                <div key={i.id} className={`row${i.status === 'done' ? ' row-done' : ''}`}>
                  <StatusButton status={i.status} onChange={(s) => update('item', i.id, { status: s })} />
                  <div className="row-body">
                    <ItemLink title={i.title} url={i.url} />
                    {i.est_minutes ? <span className="muted small"> · {fmtMinutes(i.est_minutes)}</span> : null}
                    {i.note && <Md md={i.note} inline className="row-note" />}
                    <div className="row-meta">
                      <button type="button" className="link-btn" onClick={() => setOpenNotes(openNotes === i.id ? null : i.id)}>
                        {i.notes ? '✎ Notes' : '+ Note'}
                      </button>
                    </div>
                    {openNotes === i.id && <Notes value={i.notes} onSave={(v) => update('item', i.id, { notes: v })} placeholder="Takeaways, your 60-second explanation…" />}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </>
      )}

      {tab === 'concepts' && (
        <section className="card">
          <div className="card-head">
            <h2>Concepts you should be able to explain</h2>
          </div>
          <ProgressBar value={done(g.concepts)} total={g.concepts.length} label="Concepts progress" />
          <p className="muted small">Tick a concept when you can explain it out loud in 60 seconds. Revisit weekly.</p>
          {g.concepts.map((c) => (
            <div key={c.id} className={`row${c.status === 'done' ? ' row-done' : ''}`}>
              <StatusButton status={c.status} binary onChange={(s) => update('concept', c.id, { status: s })} />
              <div className="row-body">
                <Md md={c.md} inline />
                <div className="row-meta">
                  <button type="button" className="link-btn" onClick={() => setOpenNotes(openNotes === c.id ? null : c.id)}>
                    {c.notes ? '✎ My explanation' : '+ Write my explanation'}
                  </button>
                  {c.updated_at && c.status === 'done' && <span className="muted small">checked {new Date(c.updated_at).toLocaleDateString()}</span>}
                </div>
                {openNotes === c.id && <Notes value={c.notes} onSave={(v) => update('concept', c.id, { notes: v })} placeholder="Explain it as if to a friend…" />}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'practice' && (
        <section className="card">
          <div className="card-head">
            <h2>Practice questions</h2>
          </div>
          <p className="muted small">Answer out loud first, then jot down your answer. Mark it reviewed when you're happy with it.</p>
          {g.questions.map((q, n) => (
            <div key={q.id} className="question">
              <div className="row">
                <StatusButton status={q.status} binary onChange={(s) => update('question', q.id, { status: s })} />
                <div className="row-body">
                  <span className="q-num">Q{n + 1}</span> <Md md={q.md} inline />
                  {q.updated_at && q.status === 'done' && <div className="muted small">Reviewed {new Date(q.updated_at).toLocaleDateString()}</div>}
                </div>
              </div>
              <Notes value={q.notes} onSave={(v) => update('question', q.id, { notes: v })} placeholder="Your answer…" />
            </div>
          ))}
        </section>
      )}

      {tab === 'more' &&
        extraSections.map((s) => (
          <section key={s.ord} className="card">
            <h2>{s.heading}</h2>
            <Md md={s.md} />
          </section>
        ))}

      {g.glossary.length > 0 && (
        <p className="muted">
          This guide's {g.glossary.length} jokes and terms are in the <Link to="/culture">Culture glossary</Link>.
        </p>
      )}
    </div>
  );
}
