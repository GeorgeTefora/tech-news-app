import { Link } from 'react-router-dom';
import { api, type Status } from '../api';
import { fmtMinutes, ItemLink, Loading, Md, ProgressBar, readerHref, StatusButton, TagChip, timeAgo, useAsync } from '../lib';

export default function Dashboard() {
  const { data, setData, error } = useAsync(api.dashboard);
  if (!data) return <Loading error={error} />;

  const setItemStatus = (id: string, status: Status) => {
    void api.setProgress('item', id, { status });
    setData({ ...data, nextItems: data.nextItems.map((i) => (i.id === id ? { ...i, status } : i)) });
  };
  const setWeekStatus = (id: string, status: Status) => {
    void api.setProgress('week', id, { status });
    setData({ ...data, plan: { ...data.plan, current: data.plan.current.map((w) => (w.id === id ? { ...w, status } : w)) } });
  };

  const totals = data.guides.reduce((a, g) => ({ done: a.done + g.items_done, all: a.all + g.items }), { done: 0, all: 0 });
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">
      <header className="page-head">
        <h1>{greeting}</h1>
        <p className="muted">
          Week {data.plan.currentWeek} of your 10-week plan · {data.counts.unread} unread articles · {data.counts.saved} saved
        </p>
      </header>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>This week</h2>
            <Link to="/roadmap" className="link-muted">Full plan →</Link>
          </div>
          {data.plan.current.length === 0 && <p className="muted">You've finished the planned weeks. Revisit the deep dives and keep the news habit going.</p>}
          {data.plan.current.map((w) => (
            <div key={w.id} className="row">
              <StatusButton status={w.status} binary onChange={(s) => setWeekStatus(w.id, s)} />
              <div className="row-body">
                <Md md={w.md} inline />
                <div className="row-meta">
                  {w.guide_numbers.map((n) => (
                    <Link key={n} to={`/guide/${String(n).padStart(2, '0')}`} className="pill">Guide {String(n).padStart(2, '0')}</Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div className="divider" />
          <ProgressBar value={totals.done} total={totals.all} label="Reading list progress" />
          <p className="muted small">Reading items completed across all guides</p>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Up next</h2>
            <Link to="/library?status=open" className="link-muted">Library →</Link>
          </div>
          {data.nextItems.length === 0 && <p className="muted">Nothing left. Impressive.</p>}
          {data.nextItems.map((i) => (
            <div key={i.id} className="row">
              <StatusButton status={i.status} onChange={(s) => setItemStatus(i.id, s)} />
              <div className="row-body">
                <ItemLink title={i.title} url={i.url} />
                <div className="row-meta">
                  <TagChip tag={i.tag} />
                  <span className={`tier tier-${i.tier}`}>{i.tier === 'start' ? 'Start here' : i.tier}</span>
                  {i.est_minutes ? <span>{fmtMinutes(i.est_minutes)}</span> : null}
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Latest news</h2>
          <Link to="/news" className="link-muted">All news →</Link>
        </div>
        {data.latest.length === 0 && <p className="muted">No unread articles. Feeds refresh every 30 minutes, or refresh now from News.</p>}
        <ul className="list">
          {data.latest.map((a) => (
            <li key={a.id}>
              <Link to={readerHref(a.url)} className="item-title">{a.title}</Link>
              <div className="row-meta">
                <span>{a.feed_title}</span>
                <span>{timeAgo(a.published_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Guides</h2>
          </div>
          {data.guides.filter((g) => g.number > 0).map((g) => (
            <Link key={g.id} to={`/guide/${g.id}`} className="guide-row">
              <span className="guide-num">{String(g.number).padStart(2, '0')}</span>
              <span className="guide-title">{g.title}</span>
              <ProgressBar value={g.items_done + g.concepts_done} total={g.items + g.concepts} />
            </Link>
          ))}
        </section>

        {data.randomTerm && (
          <section className="card">
            <div className="card-head">
              <h2>Term of the visit</h2>
              <Link to="/culture" className="link-muted">Glossary →</Link>
            </div>
            <p className="eyebrow">{data.randomTerm.section}</p>
            <Md md={data.randomTerm.md} />
          </section>
        )}
      </div>
    </div>
  );
}
