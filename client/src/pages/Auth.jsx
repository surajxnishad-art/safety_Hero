import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { get } from '../lib/api.js';
import { Button, ErrorNote, Field } from '../components/ui.jsx';
import { Logo, CONTACT } from '../components/Layout.jsx';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-wrap">
      <div className="auth-art">
        <Link to="/" className="auth-brand"><Logo /></Link>
        <h2>Zero harm starts with records you can trust.</h2>
        <p className="small">
          Permits, risk assessments, inspections, incidents and training — connected, approved and auditable.
        </p>
        <ul className="auth-points">
          <li>24 HSE modules in one database</li>
          <li>Role-based approvals and audit trail</li>
          <li>AI drafting with competent-person review</li>
        </ul>
        <div className="auth-foot small">
          {CONTACT.phone} · {CONTACT.email}
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted small">{subtitle}</p>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}

const passwordHint = 'At least 10 characters, including letters and numbers.';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [setup, setSetup] = useState({ needed: false, checked: false });

  useEffect(() => {
    get('/api/auth/setup-status')
      .then((d) => setSetup({ needed: !!d.needs_setup, checked: true }))
      .catch(() => setSetup({ needed: false, checked: true }));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(loc.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (setup.needed) return <OwnerSetup />;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your HSE workspace, permits, inspections and reports."
      footer={
        <p className="small muted mt-2">
          New here? <Link to="/register">Create an account</Link> · <Link to="/help">Need help?</Link>
        </p>
      }
    >
      <form onSubmit={submit} className="col gap-md mt-2">
        <ErrorNote error={error} />
        <Field label="Work email">
          <input type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <Field label="Password">
          <input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </Field>
        <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        <div className="tiny muted">
          Accounts lock after repeated failed attempts. Contact an administrator for a password reset.
        </div>
      </form>
    </AuthShell>
  );
}

function OwnerSetup() {
  const { setup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError(new Error('Passwords do not match'));
      return;
    }
    setBusy(true);
    try {
      await setup({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create the owner account"
      subtitle="No administrator exists yet. This one-time step creates the super administrator for this installation."
    >
      <div className="notice mt-2">
        Credentials are stored as salted hashes on the server and are never written to source code or the browser bundle.
        Change the password after first sign-in from My Account.
      </div>
      <form onSubmit={submit} className="col gap-md mt-2">
        <ErrorNote error={error} />
        <Field label="Full name">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
        </Field>
        <Field label="Email">
          <input type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <Field label="Password" hint={passwordHint}>
          <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </Field>
        <Field label="Confirm password">
          <input type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
        </Field>
        <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create super admin'}</Button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', company: '', designation: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone || undefined,
        company: form.company || undefined,
        designation: form.designation || undefined
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Self-registration creates a general employee account. An administrator can upgrade your role."
      footer={
        <p className="small muted mt-2">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={submit} className="col gap-md mt-2">
        <ErrorNote error={error} />
        <Field label="Full name">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
        </Field>
        <Field label="Work email">
          <input type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Designation">
            <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Safety Officer" />
          </Field>
        </div>
        <Field label="Company / organisation">
          <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </Field>
        <Field label="Password" hint={passwordHint}>
          <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </Field>
        <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Button>
        <p className="tiny muted">
          By creating an account you accept the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
          AI output and templates are drafts requiring competent-person review.
        </p>
      </form>
    </AuthShell>
  );
}
