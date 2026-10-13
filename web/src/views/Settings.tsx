import { useState } from 'react';
import { api } from '../api';
import { Loading, TagChip, timeAgo, useAsync } from '../lib';

export default function Settings() {
  const feeds = useAsync(api.feeds);
  const plan = useAsync(api.plan);
  const [msg, setMsg] = useState('');

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Settings</h1>
        {msg && <p className="muted" aria-live="polite">{msg}</p>}
      </header>

      <section className="card">
        <h2>Learning plan</h2>
        {plan.data ? (
          <label className="field">
            <span>Plan start date (Week 0)</span>
            <input
              type="date"
              defaultValue={plan.data.start}
              onChange={async (e) => {
                if (!e.target.value) return;
                await api.setPlanStart(e.target.value);
                await plan.reload();
                flash('Plan start updated.');
              }}
            />
            <span className="muted small">Currently week {plan.data.currentWeek}</span>
          </label>
        ) : (
          <Loading error={plan.error} />
        )}
      </section>

      <section className="card">
        <h2>Content</h2>
        <p className="muted small">
          Guides are read from <code>content/guides/*.md</code> and feeds from <code>content/feeds.json</code>. After editing those files, re-import. Your progress and notes are kept.
        </p>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const r = await api.reingest();
            flash(`Imported ${r.guides} guides, ${r.items} items, ${r.feeds} feeds.`);
            feeds.reload();
          }}
        >
          Re-import content
        </button>
      </section>

      <section className="card flush">
        <div className="card-head padded">
          <h2>Feeds</h2>
          <button
            type="button"
            className="btn small"
            onClick={async () => {
              flash('Refreshing…');
              const r = await api.refreshFeeds();
              flash(`${r.added} new articles.`);
              feeds.reload();
            }}
          >
            ↻ Refresh all
          </button>
        </div>
        {!feeds.data && <Loading error={feeds.error} />}
        {feeds.data?.map((f) => (
          <div key={f.id} className="row feed-row">
            <label className="switch">
              <input
                type="checkbox"
                checked={!!f.enabled}
                onChange={async (e) => {
                  await api.setFeed(f.id, e.target.checked);
                  feeds.setData(feeds.data!.map((x) => (x.id === f.id ? { ...x, enabled: Number(e.target.checked) } : x)));
                }}
                aria-label={`Enable ${f.title}`}
              />
            </label>
            <div className="row-body">
              <span className="item-title">{f.title}</span>
              <div className="row-meta">
                {f.tags.map((t) => <TagChip key={t} tag={t} />)}
                <span>{f.articles} articles · {f.unread} unread</span>
                <span>{f.last_fetched ? `fetched ${timeAgo(f.last_fetched)}` : 'never fetched'}</span>
              </div>
              {f.last_error && <div className="error small">Last error: {f.last_error}</div>}
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Install on your phone</h2>
        <ol className="md">
          <li>Run the server on this PC (<code>npm start</code>).</li>
          <li>
            Recommended: run <code>tailscale serve --bg 8787</code> on the PC, then open the <code>https://&lt;pc&gt;.&lt;tailnet&gt;.ts.net</code> address on your phone.
            HTTPS is required for offline mode and installing as an app.
          </li>
          <li>Plain Wi-Fi also works (<code>http://&lt;pc-ip&gt;:8787</code>, printed at startup), but browsers disable offline caching on non-HTTPS addresses.</li>
          <li>iOS Safari: Share → <em>Add to Home Screen</em>. Android Chrome: menu → <em>Install app</em>.</li>
        </ol>
        {!window.isSecureContext && <p className="error small">This page isn't on HTTPS, so offline mode is off on this device.</p>}
      </section>
    </div>
  );
}
