import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, DataTable, Empty, ErrorNote, Field, Loading, Modal, Stat, Tabs, useToast } from '../components/ui.jsx';
import { download, get, patch, post } from '../lib/api.js';
import { useApi, fmt, dateFmt, dateTimeFmt } from '../lib/data.js';
import { ADMIN_ROLES, ROLE_LABELS, useAuth } from '../lib/auth.jsx';

const ROLES = Object.keys(ROLE_LABELS);

export default function Admin() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('overview');

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <Empty
        icon="🔒"
        title="Administrator access required"
        text="This control centre is limited to administrators. Ask the platform owner if you need access."
      />
    );
  }

  return (
    <div className="col gap-lg">
      <header className="page-head">
        <div>
          <h1>Admin Control Center</h1>
          <p className="muted small">Users, projects, enquiries, configuration, audit trail and backups — in one place.</p>
        </div>
        <div className="row gap-xs wrap">
          <button className="btn btn-outline btn-sm" type="button" onClick={() => download('/api/admin/backup', `safety-hero-backup-${new Date().toISOString().slice(0, 10)}.json`)}>
            Download backup
          </button>
        </div>
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'users', label: 'Users & roles' },
          { key: 'projects', label: 'Projects & sites' },
          { key: 'enquiries', label: 'Enquiries' },
          { key: 'settings', label: 'Settings' },
          { key: 'audit', label: 'Activity log' }
        ]}
      />

      {tab === 'overview' && <Overview />}
      {tab === 'users' && <Users onToast={toast} />}
      {tab === 'projects' && <Projects onToast={toast} />}
      {tab === 'enquiries' && <Enquiries />}
      {tab === 'settings' && <Settings onToast={toast} />}
      {tab === 'audit' && <Audit />}
    </div>
  );
}

function Overview() {
  const { data, loading, error } = useApi('/api/admin/overview');
  if (loading && !data) return <Loading label="Loading platform metrics…" />;
  if (error) return <div className="form-error">{error.message}</div>;

  const counts = data?.counts || {};
  const numeric = Object.entries(data || {}).filter(([k, v]) => typeof v === 'number' && k !== 'id');
  const entries = Object.keys(counts).length ? Object.entries(counts).filter(([, v]) => typeof v === 'number') : numeric;
  const labels = {
    users: 'Users', projects: 'Projects', sites: 'Sites', documents: 'Documents', incidents: 'Incidents',
    permits: 'Permits', inspections: 'Inspections', jobs: 'Job listings', applications: 'Applications',
    enquiries: 'Enquiries', notifications: 'Notifications', capa: 'CAPA records', training: 'Training records',
    ppe: 'PPE records', contractors: 'Contractors', employees: 'Employees', equipment: 'Equipment'
  };

  return (
    <div className="col gap-lg">
      <div className="stat-grid">
        {entries.map(([k, v]) => (
          <Stat key={k} label={labels[k] || k.replace(/_/g, ' ')} value={fmt(v)} icon="▦" />
        ))}
      </div>
      {data?.ai && (
        <Card title="AI configuration">
          <div className="row gap-xs wrap">
            <Badge status={data.ai.enabled ? 'approved' : 'draft'}>{data.ai.enabled ? 'live provider' : 'template mode'}</Badge>
            {data.ai.provider && <span className="pill">{data.ai.provider}</span>}
            {data.ai.model && <span className="pill">{data.ai.model}</span>}
          </div>
          <p className="tiny muted mt-1">Provider keys are read from server environment variables only and are never exposed to the browser.</p>
        </Card>
      )}
      {data?.recent_audit && (
        <Card title="Latest activity">
          <div className="col gap-xs">
            {(data.recent_audit || []).slice(0, 8).map((a, i) => (
              <div className="row between small" key={a.id || i}>
                <span><b>{a.action}</b> · {a.actor || a.user_email || 'system'} {a.entity ? `· ${a.entity}` : ''}</span>
                <span className="tiny muted">{a.created_at ? new Date(a.created_at).toLocaleString('en-GB') : ''}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Users({ onToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [temp, setTemp] = useState(null);
  const { user: me } = useAuth();

  const load = () => {
    setLoading(true);
    get('/api/admin/users')
      .then((d) => { setRows(d.rows || d.users || []); setError(null); })
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async (values) => {
    setBusy(true);
    setFormError(null);
    try {
      const res = await post('/api/admin/users', values);
      onToast.push('User created');
      setOpen(false);
      if (res.temp_password) setTemp({ email: values.email, password: res.temp_password });
      load();
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (row, role) => {
    try {
      await patch(`/api/admin/users/${row.id}`, { role });
      onToast.push(`${row.name} is now ${ROLE_LABELS[role] || role}`);
      load();
    } catch (err) {
      onToast.push(err.message, 'error');
    }
  };

  const toggle = async (row) => {
    try {
      await patch(`/api/admin/users/${row.id}`, { active: row.active ? 0 : 1 });
      onToast.push(row.active ? 'User deactivated' : 'User reactivated');
      load();
    } catch (err) {
      onToast.push(err.message, 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (r) => (<div><b>{r.name}</b><div className="tiny muted">{r.email}</div></div>) },
    {
      key: 'role',
      label: 'Role',
      render: (r) => (
        <select
          className="input-xs"
          value={r.role}
          disabled={r.id === me?.id}
          onChange={(e) => changeRole(r, e.target.value)}
        >
          {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
        </select>
      )
    },
    { key: 'project_name', label: 'Project', render: (r) => r.project_name || '—' },
    { key: 'active', label: 'Status', render: (r) => <Badge status={r.active ? 'approved' : 'rejected'}>{r.active ? 'active' : 'disabled'}</Badge> },
    { key: 'last_login_at', label: 'Last login', render: (r) => <span className="tiny">{r.last_login_at ? new Date(r.last_login_at).toLocaleString('en-GB') : 'never'}</span> },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <button className="btn btn-ghost btn-xs" type="button" disabled={r.id === me?.id} onClick={() => toggle(r)}>
          {r.active ? 'Disable' : 'Enable'}
        </button>
      )
    }
  ];

  return (
    <div className="col gap-md">
      <Card
        title="Users"
        subtitle="Roles control module permissions. You cannot change your own role or disable your own account."
        actions={<Button variant="primary" size="sm" onClick={() => { setFormError(null); setOpen(true); }}>Add user</Button>}
      >
        {error && <div className="form-error">{error.message}</div>}
        {loading && !rows.length ? <Loading label="Loading users…" /> : (
          <DataTable columns={columns} rows={rows} empty={<Empty icon="👥" title="No users yet" text="Add the first team member." />} />
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add user">
        <UserForm onSubmit={create} onCancel={() => setOpen(false)} busy={busy} error={formError} />
      </Modal>

      <Modal open={!!temp} onClose={() => setTemp(null)} title="Temporary password">
        {temp && (
          <div className="col gap-sm">
            <p className="small">Share this temporary password with <b>{temp.email}</b> through a secure channel. They must change it after signing in.</p>
            <code className="temp-pass">{temp.password}</code>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(temp.password); onToast.push('Copied'); }}>Copy</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function UserForm({ onSubmit, onCancel, busy, error }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'general_employee', phone: '', designation: '', password: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form className="col gap-md" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <ErrorNote error={error} />
      <div className="grid cols-2" style={{ gap: 12 }}>
        <Field label="Full name"><input value={form.name} onChange={set('name')} required /></Field>
        <Field label="Email"><input type="email" value={form.email} onChange={set('email')} required /></Field>
        <Field label="Role">
          <select value={form.role} onChange={set('role')}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </Field>
        <Field label="Phone"><input value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Designation"><input value={form.designation} onChange={set('designation')} /></Field>
        <Field label="Initial password" hint="Leave blank to auto-generate a temporary password."><input type="text" value={form.password} onChange={set('password')} /></Field>
      </div>
      <div className="row gap-sm">
        <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create user'}</Button>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function Projects({ onToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = () => {
    setLoading(true);
    get('/api/admin/projects')
      .then((d) => { setRows(d.rows || d.projects || []); setError(null); })
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async (values) => {
    setBusy(true);
    setFormError(null);
    try {
      await post('/api/admin/projects', values);
      onToast.push('Project created');
      setOpen(false);
      load();
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'code', label: 'Code', render: (r) => <span className="mono small">{r.code}</span> },
    { key: 'name', label: 'Project', render: (r) => <b>{r.name}</b> },
    { key: 'location', label: 'Location', render: (r) => r.location || '—' },
    { key: 'state', label: 'State', render: (r) => r.state || '—' },
    { key: 'employees', label: 'Employees', render: (r) => fmt(r.employees || 0) },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status === 'active' ? 'approved' : 'draft'}>{r.status || 'active'}</Badge> }
  ];

  return (
    <div className="col gap-md">
      <Card
        title="Projects & sites"
        subtitle="Records are scoped by project so one contractor cannot read another project's confidential data."
        actions={<Button variant="primary" size="sm" onClick={() => { setFormError(null); setOpen(true); }}>Add project</Button>}
      >
        {error && <div className="form-error">{error.message}</div>}
        {loading && !rows.length ? <Loading label="Loading projects…" /> : (
          <DataTable columns={columns} rows={rows} empty={<Empty icon="🏗" title="No projects yet" text="Create a project to scope records." />} />
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add project">
        <form className="col gap-md" onSubmit={(e) => { e.preventDefault(); create(Object.fromEntries(new FormData(e.target))); }}>
          <ErrorNote error={formError} />
          <div className="grid cols-2" style={{ gap: 12 }}>
            <Field label="Project name"><input name="name" required /></Field>
            <Field label="Code"><input name="code" placeholder="e.g. PRJ-004" /></Field>
            <Field label="Location"><input name="location" /></Field>
            <Field label="State"><input name="state" /></Field>
            <Field label="Employees"><input name="employees" type="number" min="0" defaultValue="0" /></Field>
            <Field label="Client"><input name="client" /></Field>
          </div>
          <div className="row gap-sm">
            <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create project'}</Button>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Enquiries() {
  const { data, loading, error } = useApi('/api/admin/enquiries');
  if (loading && !data) return <Loading label="Loading enquiries…" />;
  if (error) return <div className="form-error">{error.message}</div>;
  const rows = data?.rows || data?.enquiries || [];
  const columns = [
    { key: 'name', label: 'From', render: (r) => (<div><b>{r.name}</b><div className="tiny muted">{r.email}{r.phone ? ` · ${r.phone}` : ''}</div></div>) },
    { key: 'subject', label: 'Subject', render: (r) => r.subject || r.topic || '—' },
    { key: 'message', label: 'Message', render: (r) => <span className="small clamp-2">{r.message}</span> },
    { key: 'kind', label: 'Type', render: (r) => <Badge plain>{r.kind || r.type || 'contact'}</Badge> },
    { key: 'created_at', label: 'Received', render: (r) => <span className="tiny">{r.created_at ? new Date(r.created_at).toLocaleString('en-GB') : ''}</span> }
  ];
  return (
    <Card title="Contact & career enquiries" subtitle="Messages submitted through the public contact form.">
      <DataTable columns={columns} rows={rows} empty={<Empty icon="✉" title="No enquiries yet" text="Messages from the contact form will appear here." />} />
    </Card>
  );
}

function Settings({ onToast }) {
  const { data, loading, error, reload } = useApi('/api/admin/settings');
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  const keys = useMemo(() => {
    const settings = data?.settings || {};
    return Object.keys(settings).length
      ? Object.keys(settings)
      : ['org_name', 'org_tagline', 'owner_phone', 'owner_email', 'support_hours', 'default_currency'];
  }, [data]);

  if (loading && !data) return <Loading label="Loading settings…" />;
  if (error) return <div className="form-error">{error.message}</div>;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    try {
      await post('/api/admin/settings', { settings: form, ...form });
      onToast.push('Settings saved');
      reload?.();
    } catch (err) {
      setSaveError(err);
    } finally {
      setBusy(false);
    }
  };

  const pretty = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Card title="Website & system settings" subtitle="These values feed the public site and generated documents.">
      <form className="col gap-md" onSubmit={save}>
        <ErrorNote error={saveError} />
        <div className="grid cols-2" style={{ gap: 12 }}>
          {keys.map((k) => (
            <Field key={k} label={pretty(k)}>
              <input value={form[k] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </Field>
          ))}
        </div>
        <div className="row gap-sm">
          <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
        </div>
      </form>
    </Card>
  );
}

function Audit() {
  const { data, loading, error } = useApi('/api/admin/audit');
  if (loading && !data) return <Loading label="Loading activity log…" />;
  if (error) return <div className="form-error">{error.message}</div>;
  const rows = data?.rows || data?.logs || [];
  const columns = [
    { key: 'created_at', label: 'When', render: (r) => <span className="tiny">{r.created_at ? new Date(r.created_at).toLocaleString('en-GB') : ''}</span> },
    { key: 'actor', label: 'Actor', render: (r) => <span className="small">{r.actor || r.user_email || r.user_id || 'system'}</span> },
    { key: 'action', label: 'Action', render: (r) => <Badge plain>{r.action}</Badge> },
    { key: 'entity', label: 'Entity', render: (r) => <span className="small">{r.entity || '—'}{r.entity_id ? ` #${r.entity_id}` : ''}</span> },
    { key: 'ip', label: 'IP', render: (r) => <span className="tiny mono">{r.ip || '—'}</span> }
  ];
  return (
    <Card title="Activity log" subtitle="Every create, update, approval and login is recorded.">
      <DataTable columns={columns} rows={rows} empty={<Empty icon="🧾" title="No activity yet" text="Audit entries appear as soon as records change." />} />
    </Card>
  );
}
