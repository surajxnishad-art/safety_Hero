import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, DataTable, Empty, ErrorNote, Field, Loading, Modal, Pager, Tabs, useToast } from '../components/ui.jsx';
import { download, get, openPrint, patch, post } from '../lib/api.js';
import { useApi, fmt, dateFmt } from '../lib/data.js';

export default function Documents() {
  const toast = useToast();
  const [tab, setTab] = useState('documents');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [createFor, setCreateFor] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const pageSize = 15;

  const loadDocs = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (q.trim()) params.set('q', q.trim());
    if (category) params.set('category', category);
    get(`/api/documents?${params}`)
      .then((d) => {
        setRows(d.rows || []);
        setTotal(d.total || 0);
        if (d.categories) setCategories(d.categories);
        setError(null);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDocs(); /* eslint-disable-next-line */ }, [page, category]);

  useEffect(() => {
    get('/api/documents/templates')
      .then((d) => setTemplates(d.templates || d.rows || []))
      .catch(() => setTemplates([]));
  }, []);

  const tplGroups = useMemo(() => {
    const map = new Map();
    templates.forEach((t) => {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category).push(t);
    });
    return [...map.entries()];
  }, [templates]);

  const create = async (values) => {
    setBusy(true);
    setFormError(null);
    try {
      const res = await post('/api/documents', values);
      toast.push('Document created from template');
      setCreateFor(null);
      setDetail(res.row || null);
      loadDocs();
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  const openDoc = async (id) => {
    setFormError(null);
    try {
      const d = await get(`/api/documents/${id}`);
      setDetail(d);
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  const approve = async () => {
    if (!detail?.row) return;
    setBusy(true);
    try {
      await post(`/api/documents/${detail.row.id}/approve`, {});
      toast.push('Document approved');
      openDoc(detail.row.id);
      loadDocs();
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  const revise = async (content) => {
    if (!detail?.row) return;
    setBusy(true);
    setFormError(null);
    try {
      await post(`/api/documents/${detail.row.id}/revise`, { content, summary: 'Revised via document library' });
      toast.push('New revision saved');
      openDoc(detail.row.id);
      loadDocs();
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  const docColumns = [
    { key: 'doc_no', label: 'Document no.', render: (r) => <span className="mono small">{r.doc_no}</span> },
    { key: 'title', label: 'Title', render: (r) => (<div><b>{r.title}</b><div className="tiny muted">{r.category}</div></div>) },
    { key: 'revision', label: 'Rev', render: (r) => <Badge plain>{r.revision}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'issue_date', label: 'Issued', render: (r) => <span className="small">{dateFmt(r.issue_date)}</span> },
    { key: 'review_date', label: 'Review due', render: (r) => <span className="small">{dateFmt(r.review_date)}</span> },
    { key: 'actions', label: '', render: (r) => (<button className="btn btn-ghost btn-xs" type="button" onClick={(e) => { e.stopPropagation(); openDoc(r.id); }}>Open</button>) }
  ];

  return (
    <div className="col gap-lg">
      <header className="page-head">
        <div>
          <h1>Safety Document Library</h1>
          <p className="muted small">
            Controlled documents with automatic numbering, revision history and sign-offs. Blank templates are clearly
            marked; sample content is not an approved company procedure.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" type="button" onClick={() => download('/api/documents/export', 'document-register.csv')}>
          Export register
        </button>
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'documents', label: `Documents (${fmt(total)})` },
          { key: 'templates', label: `Templates (${templates.length})` }
        ]}
      />

      {error && <div className="form-error">{error.message}</div>}

      {tab === 'documents' && (
        <Card
          title="Controlled documents"
          actions={
            <div className="row gap-xs wrap">
              <input className="input-sm" placeholder="Search title, number, content…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); loadDocs(); } }} />
              <select className="input-sm" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn btn-outline btn-sm" type="button" onClick={() => { setPage(1); loadDocs(); }}>Search</button>
            </div>
          }
        >
          {loading && !rows.length ? (
            <Loading label="Loading documents…" />
          ) : (
            <>
              <DataTable columns={docColumns} rows={rows} onRowClick={(r) => openDoc(r.id)} empty={<Empty icon="📚" title="No documents yet" text="Create one from a template to get started." />} />
              {total > pageSize && <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />}
            </>
          )}
        </Card>
      )}

      {tab === 'templates' && (
        <div className="col gap-lg">
          {tplGroups.length === 0 && <Empty icon="📄" title="Templates unavailable" text="The template catalogue could not be loaded." />}
          {tplGroups.map(([cat, items]) => (
            <section key={cat}>
              <h2 className="group-title">{cat}</h2>
              <div className="grid cols-3">
                {items.map((t) => (
                  <div className="module-card" key={t.key}>
                    <div className="module-icon" aria-hidden="true">📄</div>
                    <div>
                      <h3>{t.title}</h3>
                      <p className="tiny muted">{t.code} · {t.sample ? 'Sample template' : 'Blank template'}</p>
                    </div>
                    <button className="btn btn-ghost btn-xs" type="button" onClick={() => { setFormError(null); setCreateFor(t); }}>Use</button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal open={!!createFor} onClose={() => setCreateFor(null)} title={createFor ? `Create from “${createFor.title}”` : ''}>
        {createFor && (
          <CreateForm template={createFor} onSubmit={create} onCancel={() => setCreateFor(null)} busy={busy} error={formError} />
        )}
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.row ? `${detail.row.doc_no} · ${detail.row.title}` : ''} size="lg">
        {detail?.row && (
          <DocDetail detail={detail} onApprove={approve} onRevise={revise} busy={busy} error={formError} />
        )}
      </Modal>
    </div>
  );
}

function CreateForm({ template, onSubmit, onCancel, busy, error }) {
  const [form, setForm] = useState({
    template_key: template.key,
    title: template.title,
    company: '',
    project_name: '',
    prepared_by: '',
    review_date: ''
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form className="col gap-md" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <ErrorNote error={error} />
      <div className="notice">
        The template body is inserted as a starting draft. Document number, revision and issue date are assigned by the server.
      </div>
      <Field label="Document title">
        <input value={form.title} onChange={set('title')} required />
      </Field>
      <div className="grid cols-2" style={{ gap: 12 }}>
        <Field label="Company">
          <input value={form.company} onChange={set('company')} placeholder="Organisation name" />
        </Field>
        <Field label="Project / site">
          <input value={form.project_name} onChange={set('project_name')} placeholder="Project or site" />
        </Field>
        <Field label="Prepared by">
          <input value={form.prepared_by} onChange={set('prepared_by')} placeholder="Name" />
        </Field>
        <Field label="Review date">
          <input type="date" value={form.review_date} onChange={set('review_date')} />
        </Field>
      </div>
      <div className="row gap-sm">
        <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create document'}</Button>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function DocDetail({ detail, onApprove, onRevise, busy, error }) {
  const { row, versions = [], canEdit, canApprove } = detail;
  const [content, setContent] = useState(row.content || '');
  const [editing, setEditing] = useState(false);

  return (
    <div className="col gap-md">
      <ErrorNote error={error} />
      <div className="row between wrap gap-sm">
        <div className="row gap-xs wrap">
          <Badge status={row.status}>{row.status}</Badge>
          <Badge plain>Rev {row.revision}</Badge>
          <span className="tiny muted">Issued {dateFmt(row.issue_date)} · Review {dateFmt(row.review_date)}</span>
        </div>
        <div className="row gap-xs wrap">
          <button className="btn btn-outline btn-xs" type="button" onClick={() => openPrint(`/api/documents/${row.id}/export?format=html`)}>Print / PDF</button>
          <button className="btn btn-outline btn-xs" type="button" onClick={() => download(`/api/documents/${row.id}/export?format=doc`, `${row.doc_no}.doc`)}>Word</button>
          {canApprove && row.status !== 'approved' && <Button variant="primary" size="xs" onClick={onApprove} disabled={busy}>Approve</Button>}
          {canEdit && <button className="btn btn-outline btn-xs" type="button" onClick={() => setEditing(!editing)}>{editing ? 'Preview' : 'Revise'}</button>}
        </div>
      </div>

      <div className="doc-meta grid cols-3">
        <div><span className="tiny muted">Prepared by</span><div className="small">{row.prepared_by || '—'}</div></div>
        <div><span className="tiny muted">Checked by</span><div className="small">{row.checked_by || '—'}</div></div>
        <div><span className="tiny muted">Approved by</span><div className="small">{row.approved_by || '—'}</div></div>
      </div>

      {editing ? (
        <div className="col gap-sm">
          <textarea rows={18} className="mono" value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="row gap-sm">
            <Button variant="primary" size="sm" onClick={() => { onRevise(content); setEditing(false); }} disabled={busy}>Save new revision</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
          <p className="tiny muted">Saving creates a new revision and keeps the previous version in history.</p>
        </div>
      ) : (
        <pre className="doc-body">{row.content}</pre>
      )}

      <div>
        <h4 className="small">Revision history</h4>
        <div className="col gap-xs mt-1">
          {versions.length === 0 && <p className="tiny muted">No revisions recorded.</p>}
          {versions.map((v) => (
            <div className="row between small" key={v.id}>
              <span><b>Rev {v.revision}</b> · {v.summary || 'Revision'}</span>
              <span className="tiny muted">{v.created_at ? new Date(v.created_at).toLocaleString('en-GB') : ''} {v.created_by ? `· ${v.created_by}` : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
