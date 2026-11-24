import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Empty, ErrorNote, Field, Loading, Stat, useToast } from '../components/ui.jsx';
import { get, post } from '../lib/api.js';
import { useAuth, ROLE_LABELS } from '../lib/auth.jsx';

export default function Account() {
  const { user, demoData, refresh } = useAuth();
  const toast = useToast();
  const [notifs, setNotifs] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifs = () => {
    get('/api/notifications')
      .then((d) => setNotifs(d))
      .catch(() => setNotifs({ rows: [], unread: 0 }));
  };

  useEffect(() => {
    loadNotifs();
    get('/api/jobs/saved')
      .then((d) => setSaved(d.rows || []))
      .catch(() => setSaved([]));
  }, []);

  const changePassword = async (values) => {
    setBusy(true);
    setError(null);
    try {
      await post('/api/auth/change-password', values);
      toast.push('Password updated');
      refresh?.();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const markRead = async (id) => {
    try {
      await post(`/api/notifications/${id}/read`, {});
      loadNotifs();
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  if (!user) return <Loading label="Loading your account…" />;

  return (
    <div className="col gap-lg">
      <header className="page-head">
        <div>
          <h1>My Account</h1>
          <p className="muted small">Profile, security and the alerts addressed to you.</p>
        </div>
        <Badge status="approved">{ROLE_LABELS[user.role] || user.role}</Badge>
      </header>

      <div className="stat-grid">
        <Stat label="Unread alerts" value={notifs ? notifs.unread : '—'} icon="🔔" tone="warning" />
        <Stat label="Saved jobs" value={saved ? saved.length : '—'} icon="💾" />
        <Stat label="Account status" value={user.active === 0 ? 'Disabled' : 'Active'} icon="✅" tone="good" />
        <Stat label="Data mode" value={demoData ? 'Demo data' : 'Live records'} icon="🗄" tone={demoData ? 'warning' : 'good'} />
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <Card title="Profile">
          <div className="spec-grid">
            <div><span className="tiny muted">Name</span><div>{user.name}</div></div>
            <div><span className="tiny muted">Email</span><div>{user.email}</div></div>
            <div><span className="tiny muted">Role</span><div>{ROLE_LABELS[user.role] || user.role}</div></div>
            <div><span className="tiny muted">Phone</span><div>{user.phone || '—'}</div></div>
            <div><span className="tiny muted">Designation</span><div>{user.designation || '—'}</div></div>
            <div><span className="tiny muted">Project</span><div>{user.project_name || 'All projects'}</div></div>
          </div>
          <p className="tiny muted mt-2">
            Role changes are made by an administrator. Medical and occupational-health records are restricted to authorised roles.
          </p>
        </Card>

        <Card title="Change password">
          <form className="col gap-md" onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); changePassword(f); e.target.reset(); }}>
            <ErrorNote error={error} />
            <Field label="Current password"><input name="current_password" type="password" required autoComplete="current-password" /></Field>
            <Field label="New password" hint="At least 8 characters. Do not reuse your old password."><input name="new_password" type="password" minLength={8} required autoComplete="new-password" /></Field>
            <Field label="Confirm new password"><input name="confirm_password" type="password" minLength={8} required autoComplete="new-password" /></Field>
            <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</Button>
          </form>
        </Card>
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <Card title="My notifications" subtitle={notifs ? `${notifs.unread} unread` : ''}>
          {!notifs ? <Loading label="Loading alerts…" /> : notifs.rows.length === 0 ? (
            <Empty icon="🔔" title="No alerts" text="Permit, training and CAPA reminders will appear here." />
          ) : (
            <div className="col gap-xs">
              {notifs.rows.slice(0, 12).map((n) => (
                <div className={`notif ${n.read_at ? '' : 'unread'}`} key={n.id}>
                  <div>
                    <div className="small"><b>{n.title}</b></div>
                    <div className="tiny muted">{n.body}</div>
                    <div className="tiny muted">{n.created_at ? new Date(n.created_at).toLocaleString('en-GB') : ''}</div>
                  </div>
                  {!n.read_at && <button className="btn btn-ghost btn-xs" type="button" onClick={() => markRead(n.id)}>Mark read</button>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Saved jobs" actions={<Link className="btn btn-outline btn-xs" to="/jobs">Browse jobs</Link>}>
          {!saved ? <Loading label="Loading saved jobs…" /> : saved.length === 0 ? (
            <Empty icon="💾" title="No saved jobs" text="Save vacancies from the job portal to revisit them here." />
          ) : (
            <div className="col gap-xs">
              {saved.map((j) => (
                <Link className="row between small saved-row" to={`/jobs/${j.id}`} key={j.id}>
                  <span><b>{j.title}</b> <span className="muted">· {j.company}</span></span>
                  <span className="tiny muted">{j.location}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
