import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type SearchHit } from '../api';
import { readerHref, TagChip, useDebounced, useFilters } from '../lib';

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  item: 'Reading',
  concept: 'Concept',
  question: 'Practice',
  glossary: 'Culture',
  week: 'Plan',
  article: 'News',
};

export default function Search() {
  const f = useFilters();
  const [q, setQ] = useState(f.get('q'));
  const dq = useDebounced(q, 150);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    f.set('q', dq || null);
    if (dq.trim().length < 2) return setHits([]);
    let live = true;
    api.search(dq).then((h) => live && setHits(h)).catch(() => live && setHits([]));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  // Resolve links for reading items and articles once.
  useEffect(() => {
    Promise.all([api.items(), api.articles()])
      .then(([items, articles]) => {
        const m: Record<string, string> = {};
        for (const i of items) m[i.id] = i.url ? readerHref(i.url) : `/guide/${i.guide_id}`;
        for (const a of articles) m[a.id] = readerHref(a.url);
        setUrls(m);
      })
      .catch(() => {});
  }, []);

  const linkFor = (h: SearchHit) => {
    if (h.kind === 'item' || h.kind === 'article') return urls[h.ref_id] ?? '/library';
    if (h.kind === 'glossary') return `/culture?q=${encodeURIComponent(h.title.replace(/["“”]/g, '').slice(0, 40))}`;
    const num = { 'AI Engineering': '01', Cybersecurity: '02', Systems: '03', 'Frontend & Tooling': '04', 'Stack Critique': '05', Culture: '06', News: '07' }[h.tag];
    return num ? `/guide/${num}?tab=${h.kind === 'concept' ? 'concepts' : 'practice'}` : '/roadmap';
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Search</h1>
      </header>
      <div className="search big">
        <input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guides, concepts, jokes and news…" aria-label="Search everything" />
      </div>
      {dq.trim().length >= 2 && <p className="muted small" aria-live="polite">{hits.length} results</p>}
      <section className="card flush">
        {hits.map((h) => (
          <Link key={`${h.kind}-${h.ref_id}`} to={linkFor(h)} className="search-hit">
            <div className="row-meta">
              <span className="pill">{KIND_LABEL[h.kind]}</span>
              {h.tag && h.kind !== 'article' && <TagChip tag={h.tag} />}
            </div>
            <div className="item-title">{h.title}</div>
            {h.snippet && <div className="row-note" dangerouslySetInnerHTML={{ __html: h.snippet }} />}
          </Link>
        ))}
        {dq.trim().length >= 2 && hits.length === 0 && <div className="empty">Nothing found for “{dq}”.</div>}
      </section>
    </div>
  );
}
