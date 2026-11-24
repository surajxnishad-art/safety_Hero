import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Card, Empty, ErrorNote, Field, Loading, Modal, Pager, useToast } from '../components/ui.jsx';
import { get, post } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

const money = (v) => (v === null || v === undefined || v === '' ? 'Not disclosed' : String(v));

export function Jobs() {
  const [q, setQ] = useState('');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pageSize = 10;

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (q.trim()) params.set('q', q.trim());
    if (state) params.set('state', state);
    if (category) params.set('category', category);
    if (city.trim()) params.set('city', city.trim());
    get(`/api/jobs?${params}`)
      .then((d) => { setData(d); setError(null); })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, state, category]);

  const filters = data?.filters || {};
  const rows = data?.rows || [];

  return (
    <div className="col gap-lg">
      <header className="page-head">
        <div>
          <h1>Safety Job Portal</h1>
          <p className="muted small">
            Industrial safety vacancies across India. Listings marked verified were checked against the employer or an official
            source; unverified listings are labelled as such and are never presented as confirmed.
          </p>
        </div>
      </header>

      <Card>
        <div className="row gap-sm wrap">
          <input className="input" placeholder="Role, company or keyword" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }} />
          <select className="input" value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>
            <option value="">All states</option>
            {(filters.states || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {(filters.categories || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }} />
          <Button variant="primary" onClick={() => { setPage(1); load(); }}>Search</Button>
        </div>
      </Card>

      {error && <div className="form-error">{error.message}</div>}
      {loading && !data && <Loading label="Loading vacancies…" />}

      {data && rows.length === 0 && (
        <Empty icon="💼" title="No vacancies match your search" text="Try a different state, city or keyword. New openings appear here as soon as they are published." />
      )}

      <div className="col gap-md">
        {rows.map((j) => (
          <Link className="job-card" key={j.id} to={`/jobs/${j.id}`}>
            <div className="job-main">
              <div className="row gap-xs wrap">
                <h3>{j.title}</h3>
                {j.verified ? <Badge status="approved">verified</Badge> : <Badge status="draft">unverified</Badge>}
                {j.featured ? <Badge status="featured">featured</Badge> : null}
              </div>
              <p className="small muted">{j.company} · {j.location}{j.state ? `, ${j.state}` : ''}</p>
              <div className="row gap-xs wrap mt-1">
                {j.category && <span className="pill">{j.category}</span>}
                {j.experience && <span className="pill">{j.experience}</span>}
                {j.qualification && <span className="pill">{j.qualification}</span>}
                {j.job_type && <span className="pill">{j.job_type}</span>}
              </div>
            </div>
            <div className="job-side">
              <div className="salary">{money(j.salary)}</div>
              <div className="tiny muted">Posted {j.posted_at ? new Date(j.posted_at).toLocaleDateString('en-GB') : '—'}</div>
              {j.expires_at && <div className="tiny muted">Closes {new Date(j.expires_at).toLocaleDateString('en-GB')}</div>}
            </div>
          </Link>
        ))}
      </div>

      {data && data.total > pageSize && <Pager page={page} pageSize={pageSize} total={data.total} onPage={setPage} />}

      <p className="tiny muted">
        Suraj Safety Hero does not charge candidates. Never pay a fee for a job offer or interview. Always confirm the employer and
        role before sharing personal documents.
      </p>
    </div>
  );
}

export function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = () => {
    setLoading(true);
    get(`/api/jobs/${id}`)
      .then((d) => { setData(d); setError(null); })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const save = async () => {
    if (!user) {
      toast.push('Sign in to save this job', 'error');
      return;
    }
    try {
      const res = await post(`/api/jobs/${id}/save`, {});
      setData((d) => ({ ...d, saved: res.saved }));
      toast.push(res.saved ? 'Job saved' : 'Removed from saved jobs');
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  const apply = async (values) => {
    setBusy(true);
    setFormError(null);
    try {
      await post(`/api/jobs/${id}/apply`, values);
      toast.push('Application submitted');
      setApplyOpen(false);
      load();
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Loading label="Loading vacancy…" />;
  if (error) return <div className="form-error">{error.message}</div>;
  const job = data?.row;
  if (!job) return <Empty icon="💼" title="Vacancy not found" text="This vacancy may have expired or been removed." action={<Link className="btn btn-outline" to="/jobs">Back to jobs</Link>} />;

  return (
    <div className="col gap-lg">
      <div className="crumb"><Link to="/jobs">Safety jobs</Link> / {job.title}</div>
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <Card>
          <div className="row gap-xs wrap">
            <Badge status={job.verified ? 'approved' : 'draft'}>{job.verified ? 'verified source' : 'unverified listing'}</Badge>
            {job.category && <span className="pill">{job.category}</span>}
            {job.job_type && <span className="pill">{job.job_type}</span>}
          </div>
          <h1 className="mt-1">{job.title}</h1>
          <p className="muted">{job.company} · {job.location}{job.state ? `, ${job.state}` : ''}</p>

          <div className="spec-grid mt-2">
            <div><span className="tiny muted">Salary</span><div>{money(job.salary)}</div></div>
            <div><span className="tiny muted">Experience</span><div>{job.experience || '—'}</div></div>
            <div><span className="tiny muted">Qualification</span><div>{job.qualification || '—'}</div></div>
            <div><span className="tiny muted">Openings</span><div>{job.openings || 1}</div></div>
            <div><span className="tiny muted">Posted</span><div>{job.posted_at ? new Date(job.posted_at).toLocaleDateString('en-GB') : '—'}</div></div>
            <div><span className="tiny muted">Closes</span><div>{job.expires_at ? new Date(job.expires_at).toLocaleDateString('en-GB') : '—'}</div></div>
          </div>

          <h3 className="mt-2">Role description</h3>
          <pre className="doc-body">{job.description || 'No description provided.'}</pre>
          {job.requirements && (<><h3 className="mt-2">Requirements</h3><pre className="doc-body">{job.requirements}</pre></>)}
          {job.source_note && <p className="tiny muted mt-1">Source: {job.source_note}</p>}
        </Card>

        <Card title="Apply">
          {data.applied ? (
            <div className="notice ok">Your application for this role has been submitted. Track it under My applications.</div>
          ) : (
            <>
              <p className="small muted">Submit your application with resume text. Attachments are stored against your application only.</p>
              <div className="row gap-sm mt-1">
                <Button variant="primary" onClick={() => { if (!user) { toast.push('Sign in to apply', 'error'); return; } setFormError(null); setApplyOpen(true); }}>Apply now</Button>
                <Button variant="outline" onClick={save}>{data.saved ? 'Saved ✓' : 'Save job'}</Button>
              </div>
            </>
          )}
          {job.apply_url && (
            <p className="small mt-2">
              Employer link: <a href={job.apply_url} target="_blank" rel="noreferrer noopener">{job.apply_url}</a>
            </p>
          )}
          <div className="notice mt-2">
            Suraj Safety Hero never asks for payment. Verify the employer independently before sharing documents or paying any fee.
          </div>
        </Card>
      </div>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title={`Apply · ${job.title}`} size="md">
        <ApplyForm onSubmit={apply} onCancel={() => setApplyOpen(false)} busy={busy} error={formError} user={user} />
      </Modal>
    </div>
  );
}

function ApplyForm({ onSubmit, onCancel, busy, error, user }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    experience_years: '',
    qualification: '',
    resume_text: '',
    cover_note: ''
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form className="col gap-md" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <ErrorNote error={error} />
      <div className="grid cols-2" style={{ gap: 12 }}>
        <Field label="Full name"><input value={form.name} onChange={set('name')} required /></Field>
        <Field label="Email"><input type="email" value={form.email} onChange={set('email')} required /></Field>
        <Field label="Phone"><input value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" /></Field>
        <Field label="Experience (years)"><input type="number" min="0" step="0.5" value={form.experience_years} onChange={set('experience_years')} /></Field>
      </div>
      <Field label="Qualification"><input value={form.qualification} onChange={set('qualification')} placeholder="e.g. B.E. Mechanical, ADIS, NEBOSH IGC" /></Field>
      <Field label="Resume summary" hint="Paste your resume text — this is stored with your application.">
        <textarea rows={6} value={form.resume_text} onChange={set('resume_text')} required />
      </Field>
      <Field label="Cover note (optional)"><textarea rows={3} value={form.cover_note} onChange={set('cover_note')} /></Field>
      <div className="row gap-sm">
        <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</Button>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
