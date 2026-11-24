import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useTheme, ADMIN_ROLES, ROLE_LABELS } from '../lib/auth.jsx';
import { useCatalog } from '../lib/data.js';
import { get } from '../lib/api.js';

const CONTACT = {
  phone: '8933808934',
  email: 'its.surajsahani@gmail.com',
  tagline: 'Smart Safety • Zero Harm • Safer Future'
};

function Logo({ compact }) {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="34" height="34" role="img" aria-label="Suraj Safety Hero logo">
          <defs>
            <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2589D8" />
              <stop offset="55%" stopColor="#1769AA" />
              <stop offset="100%" stopColor="#10243A" />
            </linearGradient>
          </defs>
          <path d="M20 2.5 36 8v12.2C36 28.4 29.2 35 20 37.5 10.8 35 4 28.4 4 20.2V8L20 2.5Z" fill="url(#shieldGrad)" />
          <path d="M20 9.5 13 15v4.6h3.6V28h6.8v-8.4H27V15l-7-5.5Z" fill="#FF7900" />
          <circle cx="20" cy="30.6" r="1.9" fill="#F5B942" />
        </svg>
      </span>
      {!compact && (
        <span className="brand-text">
          <b>SURAJ</b>
          <em>SAFETY HERO</em>
        </span>
      )}
    </span>
  );
}

export { CONTACT, Logo };

const PUBLIC_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/jobs', label: 'Safety Jobs' },
  { to: '/help', label: 'Help Center' },
  { to: '/contact', label: 'Contact' }
];

export function PublicLayout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div className="public-shell">
      <header className="pnav">
        <div className="container pnav-inner">
          <Link to="/" className="pnav-brand" aria-label="Suraj Safety Hero home">
            <Logo />
          </Link>
          <nav className={`pnav-links${open ? ' open' : ''}`}>
            {PUBLIC_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                {l.label}
              </NavLink>
            ))}
            <div className="pnav-actions">
              <button type="button" className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle colour theme">
                {theme === 'dark' ? '☀' : '☾'}
              </button>
              {user ? (
                <Link className="btn btn-primary" to="/dashboard">Open Dashboard</Link>
              ) : (
                <>
                  <Link className="btn btn-outline" to="/login">Login</Link>
                  <Link className="btn btn-primary" to="/register">Get Started</Link>
                </>
              )}
            </div>
          </nav>
          <button type="button" className="hamburger" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation" aria-expanded={open}>
            <span /><span /><span />
          </button>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Logo />
            <p className="small muted mt-2">
              Industrial Safety Knowledge &amp; Career Platform. {CONTACT.tagline}.
            </p>
            <div className="row gap-sm mt-2 wrap">
              <a className="btn btn-sm btn-outline" href={`tel:${CONTACT.phone}`}>Call Now</a>
              <a className="btn btn-sm btn-outline" href={`https://wa.me/91${CONTACT.phone}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="btn btn-sm btn-outline" href={`mailto:${CONTACT.email}`}>Email</a>
            </div>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/jobs">Safety Job Portal</Link></li>
              <li><Link to="/login">Sign in</Link></li>
              <li><Link to="/register">Create account</Link></li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li><Link to="/help">Help Center</Link></li>
              <li><Link to="/contact">Contact &amp; Enquiries</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms &amp; Conditions</Link></li>
            </ul>
          </div>
          <div>
            <h4>Owner</h4>
            <ul>
              <li className="small">Suraj Safety Hero</li>
              <li className="small">{CONTACT.phone}</li>
              <li className="small">{CONTACT.email}</li>
            </ul>
          </div>
        </div>
        <div className="container footer-bottom small muted">
          <span>© {new Date().getFullYear()} Suraj Safety Hero. All rights reserved.</span>
          <span>Safety content supports competent-person review; it is not a substitute for site-specific approval.</span>
        </div>
      </footer>
    </div>
  );
}

const ACCOUNT_LINKS = [
  { to: '/dashboard', label: 'HSE Dashboard', icon: '📊' },
  { to: '/ai', label: 'AI Safety Hero', icon: '🤖' },
  { to: '/documents', label: 'Document Library', icon: '📚' },
  { to: '/jobs', label: 'Safety Jobs', icon: '💼' },
  { to: '/account', label: 'My Account', icon: '👤' }
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { modules } = useCatalog();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const loc = useLocation();

  useEffect(() => {
    setOpen(false);
    if (user) {
      get('/api/notifications?pageSize=1')
        .then((d) => setUnread(d.unread ?? 0))
        .catch(() => {});
    }
  }, [loc.pathname, user]);

  const groups = modules.reduce((acc, m) => {
    const g = m.group || 'HSE Modules';
    (acc[g] = acc[g] || []).push(m);
    return acc;
  }, {});

  const isAdmin = user && ADMIN_ROLES.includes(user.role);

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-head">
          <Link to="/dashboard"><Logo /></Link>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-group">
            <div className="nav-label">Workspace</div>
            {ACCOUNT_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <span className="nav-icon" aria-hidden="true">{l.icon}</span>
                <span>{l.label}</span>
                {l.to === '/account' && unread > 0 && <span className="nav-count">{unread}</span>}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <span className="nav-icon" aria-hidden="true">🛡</span>
                <span>Admin Control Center</span>
              </NavLink>
            )}
          </div>
          {Object.entries(groups).map(([group, list]) => (
            <div className="nav-group" key={group}>
              <div className="nav-label">{group}</div>
              {list.map((m) => (
                <NavLink key={m.key} to={`/modules/${m.key}`} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                  <span className="nav-icon" aria-hidden="true">{m.icon}</span>
                  <span className="ellipsis">{m.name}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar">{initials(user?.name)}</span>
            <span className="col" style={{ gap: 0, minWidth: 0 }}>
              <b className="ellipsis small">{user?.name}</b>
              <span className="tiny muted">{ROLE_LABELS[user?.role] || user?.role}</span>
            </span>
          </div>
          <div className="row gap-sm mt-2">
            <button type="button" className="btn btn-ghost btn-sm grow" onClick={toggleTheme}>
              {theme === 'dark' ? '☀ Light' : '☾ Dark'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={logout}>Sign out</button>
          </div>
        </div>
      </aside>

      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}

      <div className="app-main">
        <header className="topbar">
          <button type="button" className="hamburger dark" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
          <div className="topbar-title">
            <b>{pageTitle(loc.pathname, modules)}</b>
            <span className="tiny muted">{CONTACT.tagline}</span>
          </div>
          <div className="row gap-sm">
            <Link to="/account" className="btn btn-ghost btn-icon" aria-label="Notifications">
              🔔{unread > 0 && <span className="dot" />}
            </Link>
            <Link to="/ai" className="btn btn-primary btn-sm">Ask AI Safety Hero</Link>
          </div>
        </header>
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'SH';
}

function pageTitle(path, modules) {
  if (path.startsWith('/modules/')) {
    const key = path.split('/')[2];
    return modules.find((m) => m.key === key)?.name || 'HSE Module';
  }
  if (path.startsWith('/documents')) return 'Safety Document Library';
  if (path.startsWith('/ai')) return 'AI Safety Hero';
  if (path.startsWith('/admin')) return 'Admin Control Center';
  if (path.startsWith('/jobs')) return 'Safety Job Portal';
  if (path.startsWith('/account')) return 'My Account';
  return 'HSE Dashboard';
}
