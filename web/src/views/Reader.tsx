import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type ReaderResult } from '../api';
import { readerHref, Segmented } from '../lib';

type Theme = 'auto' | 'light' | 'sepia' | 'dark';
const PREFS = 'tna-reader-prefs';

function loadPrefs(): { size: number; theme: Theme; serif: boolean } {
  try {
    return { size: 19, theme: 'auto', serif: true, ...JSON.parse(localStorage.getItem(PREFS) ?? '{}') };
  } catch {
    return { size: 19, theme: 'auto', serif: true };
  }
}

export default function Reader() {
  const [params] = useSearchParams();
  const url = params.get('url') ?? '';
  const navigate = useNavigate();
  const [data, setData] = useState<ReaderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [view, setView] = useState<'clean' | 'original'>('clean');
  const [progress, setProgress] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  const load = (refresh = false) => {
    setData(null);
    setError(null);
    api.read(url, refresh).then(setData).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };
  useEffect(() => {
    if (url) load();
    setView('clean');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Links inside an article keep you in the reader.
  const onBodyClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a || e.ctrlKey || e.metaKey) return;
    const href = a.href;
    if (!/^https?:/.test(href)) return;
    e.preventDefault();
    const target = new URL(href);
    const current = data ? new URL(data.finalUrl) : null;
    if (current && target.origin === current.origin && target.pathname === current.pathname && target.hash) {
      document.getElementById(decodeURIComponent(target.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    navigate(readerHref(href));
  };

  if (!url) return <div className="empty">No article selected.</div>;

  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  })();
  const canOriginal = data?.mode === 'article' && !!data.embedUrl;

  return (
    <div className={`reader theme-${prefs.theme}${prefs.serif ? ' serif' : ''}`} style={{ ['--reader-size' as string]: `${prefs.size}px` }}>
      <div className="reader-progress" style={{ width: `${progress}%` }} />
      <div className="reader-bar">
        <button type="button" className="icon-btn" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="Back">←</button>
        <span className="reader-host">{data?.siteName ?? host}</span>
        <div className="reader-tools">
          {canOriginal && <Segmented label="View" value={view} onChange={setView} options={[['clean', 'Clean'], ['original', 'Original']]} />}
          <button type="button" className="icon-btn" onClick={() => setPrefs({ ...prefs, size: Math.max(14, prefs.size - 1) })} aria-label="Smaller text">A−</button>
          <button type="button" className="icon-btn" onClick={() => setPrefs({ ...prefs, size: Math.min(28, prefs.size + 1) })} aria-label="Larger text">A+</button>
          <button type="button" className="icon-btn" onClick={() => setPrefs({ ...prefs, serif: !prefs.serif })} aria-label="Toggle serif font">{prefs.serif ? 'Sans' : 'Serif'}</button>
          <select className="select" value={prefs.theme} onChange={(e) => setPrefs({ ...prefs, theme: e.target.value as Theme })} aria-label="Reader theme">
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="sepia">Sepia</option>
            <option value="dark">Dark</option>
          </select>
          <a className="icon-btn" href={url} target="_blank" rel="noreferrer noopener" aria-label="Open original in new tab" title="Open original">↗</a>
        </div>
      </div>

      {error && (
        <div className="reader-msg">
          <p>Couldn't load this page: {error}</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => load(true)}>Try again</button>
            <a className="btn" href={url} target="_blank" rel="noreferrer noopener">Open original ↗</a>
          </div>
        </div>
      )}
      {!data && !error && <div className="reader-msg muted">Fetching and cleaning up {host}…</div>}

      {data && (
        <>
          {(data.mode === 'article' || data.mode === 'external') && view === 'clean' && (
            <article className="reader-article">
              <header>
                <h1>{data.title}</h1>
                <p className="reader-byline">
                  {[...new Set([data.byline, data.siteName, data.minutes ? `${data.minutes} min read` : null].filter(Boolean))].join(' · ')}
                </p>
                {data.extraLinks.length > 0 && (
                  <div className="btn-row">
                    {data.extraLinks.map((l) => (
                      <button key={l.url} type="button" className="btn small" onClick={() => navigate(readerHref(l.url))}>{l.label}</button>
                    ))}
                  </div>
                )}
              </header>
              {data.mode === 'article' && data.html ? (
                <div ref={bodyRef} className="reader-body" onClick={onBodyClick} dangerouslySetInnerHTML={{ __html: data.html }} />
              ) : (
                <div className="reader-msg">
                  <p>This page can't be shown inside the app. It's an interactive site or it blocks embedding.</p>
                  <a className="btn primary" href={data.finalUrl} target="_blank" rel="noreferrer noopener">Open {host} ↗</a>
                </div>
              )}
              <footer className="reader-foot">
                <span className="muted small">Saved for offline {new Date(data.fetchedAt).toLocaleDateString()}</span>
                <button type="button" className="link-btn" onClick={() => load(true)}>Re-fetch</button>
              </footer>
            </article>
          )}
          {(data.mode === 'iframe' || (view === 'original' && data.embedUrl)) && (
            <iframe className="reader-frame" src={data.embedUrl!} title={data.title} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" referrerPolicy="no-referrer" />
          )}
          {data.mode === 'embed' && (
            <div className="reader-video">
              <iframe src={data.embedUrl!} title={data.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          )}
          {data.mode === 'pdf' && (
            <>
              {data.extraLinks.length > 0 && (
                <div className="btn-row reader-pdf-links">
                  {data.extraLinks.filter((l) => l.label !== 'PDF').map((l) => (
                    <button key={l.url} type="button" className="btn small" onClick={() => navigate(readerHref(l.url))}>{l.label}</button>
                  ))}
                </div>
              )}
              <iframe className="reader-frame" src={data.embedUrl!} title={data.title} />
            </>
          )}
        </>
      )}
    </div>
  );
}
