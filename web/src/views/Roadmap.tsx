import { Link } from 'react-router-dom';
import { api, type Status } from '../api';
import { Loading, Md, ProgressBar, StatusButton, TagChip, useAsync } from '../lib';

export default function Roadmap() {
  const plan = useAsync(api.plan);
  const meta = useAsync(api.meta);
  const intro = useAsync(() => api.guide('00'));

  if (!plan.data || !meta.data) return <Loading error={plan.error ?? meta.error} />;
  const p = plan.data;

  const setWeek = (id: string, status: Status) => {
    void api.setProgress('week', id, { status });
    plan.setData({ ...p, weeks: p.weeks.map((w) => (w.id === id ? { ...w, status } : w)) });
  };
  const weeksDone = p.weeks.filter((w) => w.status === 'done').length;
  const sections = intro.data?.sections ?? [];
  const tips = sections.find((s) => /make reading stick/i.test(s.heading));
  const paper = sections.find((s) => /research paper/i.test(s.heading));

  return (
    <div className="page">
      <header className="page-head">
        <h1>Roadmap</h1>
        {intro.data && <Md md={intro.data.overview_md} className="md lead" />}
      </header>

      <section className="card">
        <div className="card-head">
          <h2>10-week plan</h2>
          <span className="muted small">Started {new Date(p.start + 'T00:00').toLocaleDateString()} · you're in week {p.currentWeek}</span>
        </div>
        <ProgressBar value={weeksDone} total={p.weeks.length} label="Plan progress" />
        <ol className="timeline">
          {p.weeks.map((w) => (
            <li key={w.id} className={`timeline-step${w.current ? ' current' : ''}${w.status === 'done' ? ' done' : ''}`}>
              <StatusButton status={w.status} binary onChange={(s) => setWeek(w.id, s)} />
              <div className="row-body">
                <Md md={w.md} inline />
                <div className="row-meta">
                  {w.current && <span className="pill pill-accent">Now</span>}
                  {w.guide_numbers.map((n) => (
                    <Link key={n} to={`/guide/${String(n).padStart(2, '0')}`} className="pill">
                      Guide {String(n).padStart(2, '0')}
                    </Link>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <h2 className="section-title">Guides</h2>
      <div className="guide-grid">
        {meta.data.guides
          .filter((g) => g.number > 0)
          .map((g) => (
            <Link key={g.id} to={`/guide/${g.id}`} className="card guide-card">
              <div className="guide-card-top">
                <span className="guide-num big">{String(g.number).padStart(2, '0')}</span>
                <TagChip tag={g.tag} />
              </div>
              <h3>{g.title}</h3>
              <div className="guide-card-stats">
                {g.items > 0 && (
                  <div>
                    <span className="muted small">Reading</span>
                    <ProgressBar value={g.items_done} total={g.items} />
                  </div>
                )}
                {g.concepts > 0 && (
                  <div>
                    <span className="muted small">Concepts</span>
                    <ProgressBar value={g.concepts_done} total={g.concepts} />
                  </div>
                )}
                {g.questions > 0 && (
                  <div>
                    <span className="muted small">Questions</span>
                    <ProgressBar value={g.questions_done} total={g.questions} />
                  </div>
                )}
              </div>
            </Link>
          ))}
      </div>

      <div className="grid-2">
        {tips && (
          <section className="card">
            <h2>{tips.heading}</h2>
            <Md md={tips.md} />
          </section>
        )}
        {paper && (
          <section className="card">
            <h2>{paper.heading}</h2>
            <Md md={paper.md} />
          </section>
        )}
      </div>
    </div>
  );
}
