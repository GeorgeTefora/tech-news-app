import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, authEvents } from './api';
import Dashboard from './views/Dashboard';
import Roadmap from './views/Roadmap';
import GuideView from './views/Guide';
import Library from './views/Library';
import News from './views/News';
import Culture from './views/Culture';
import Reader from './views/Reader';
import Search from './views/Search';
import Settings from './views/Settings';

const NAV: [string, string, string][] = [
  ['/', 'Today', '◎'],
  ['/roadmap', 'Roadmap', '◇'],
  ['/library', 'Library', '▤'],
  ['/news', 'News', '◉'],
  ['/culture', 'Culture', '☺'],
];

function Login() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.login(token);
      location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };
  return (
    <div className="login">
      <form onSubmit={submit} className="card">
        <h1>Tech News</h1>
        <p className="muted">This device needs the access token set in <code>APP_TOKEN</code>.</p>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Access token" autoFocus aria-label="Access token" />
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit">Unlock</button>
      </form>
    </div>
  );
}

export default function App() {
  const [needAuth, setNeedAuth] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();
  const reading = location.pathname === '/read';

  useEffect(() => {
    const onAuth = () => setNeedAuth(true);
    const onNet = () => setOnline(navigator.onLine);
    authEvents.addEventListener('required', onAuth);
    window.addEventListener('online', onNet);
    window.addEventListener('offline', onNet);
    return () => {
      authEvents.removeEventListener('required', onAuth);
      window.removeEventListener('online', onNet);
      window.removeEventListener('offline', onNet);
    };
  }, []);

  // "/" focuses search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        navigate('/search');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  useEffect(() => window.scrollTo(0, 0), [location.pathname]);

  if (needAuth) return <Login />;

  return (
    <div className={`shell${reading ? ' shell-reading' : ''}`}>
      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <img src="/icon.svg" alt="" width={28} height={28} />
          <span>Tech News</span>
        </div>
        {NAV.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'} className="nav-link">
            <span className="nav-icon" aria-hidden>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
        <NavLink to="/search" className="nav-link">
          <span className="nav-icon" aria-hidden>⌕</span>
          <span>Search</span>
        </NavLink>
        <div className="sidebar-spacer" />
        <NavLink to="/settings" className="nav-link">
          <span className="nav-icon" aria-hidden>⚙</span>
          <span>Settings</span>
        </NavLink>
      </nav>

      <header className="topbar">
        <div className="brand">
          <img src="/icon.svg" alt="" width={24} height={24} />
          <span>Tech News</span>
        </div>
        <div className="topbar-actions">
          <NavLink to="/search" className="icon-btn" aria-label="Search">⌕</NavLink>
          <NavLink to="/settings" className="icon-btn" aria-label="Settings">⚙</NavLink>
        </div>
      </header>

      {!online && <div className="offline-banner">Offline: showing saved content. Changes will sync when you reconnect.</div>}

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/guide/:id" element={<GuideView />} />
          <Route path="/library" element={<Library />} />
          <Route path="/news" element={<News />} />
          <Route path="/culture" element={<Culture />} />
          <Route path="/read" element={<Reader />} />
          <Route path="/search" element={<Search />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<div className="empty">Page not found.</div>} />
        </Routes>
      </main>

      <nav className="tabbar" aria-label="Main">
        {NAV.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'} className="tab">
            <span className="nav-icon" aria-hidden>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
