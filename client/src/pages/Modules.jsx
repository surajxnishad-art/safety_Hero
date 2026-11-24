import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge, Button, Card, DataTable, Empty, ErrorNote, Field, Loading, Modal, Pager, Stat, useToast
} from '../components/ui.jsx';
import { del, download, get, patch, post } from '../lib/api.js';
import { useApi, fmt, dateFmt } from '../lib/data.js';
import { useAuth } from '../lib/auth.jsx';

export function ModulesIndex() {
  const { data, loading, error } = useApi('/api/modules');
  const modules = data?.modules || [];

  const groups = useMemo(() => {
    const map = new Map();
    modules.forEach((m) => {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group).push(m);
    });
    return [...map.entries()];
  }, [modules]);

  if (loading && !data) return <Loading label="Loading HSE modules…" />;

  return (
    <div className="col gap-lg">
      <header className="page-head">
        <div>
          <h1>HSE Modules</h1>
          <p className="muted small">
            {modules.length} connected registers. Every entry is stored in the database with an audit trail, approval
            workflow and export.
          </p>
        </div>
      </header>
      {error && <div className="form-error">{error.message}</div>}

      {groups.map(([group, items]) => (
        <section key={group}>
          <h2 className="group-title">{group}</h2>
          <div className="grid cols-3">
            {items.map((m) => (
              <Link className="module-card" to={`/modules/${m.key}`} key={m.key}>
                <div className="module-icon" aria-hidden="true">{m.icon || '📋'}</div>
                <div>
                  <h3>{m.name}</h3>
                  <p className="tiny muted">{m.short || m.description}</p>
                </div>
                <span className="module-go" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RecordForm({ fields, initial, onSubmit, onCancel, busy, error }) {
  const [values, setValues] = useState(() => {
    const base = {};
    fields.forEach((f) => {
      base[f.name] = initial?.[f.name] ?? (f.type === 'checkbox' ? 0 : '');
    });
    return base;
  });

  const set = (name) => (e) => {
    const v = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value;
    setValues((s) => ({ ...s, [name]: v }));
  };

  return (
    <form
      className="col gap-md"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <ErrorNote error={error} />
      <div className="grid cols-2" style={{ gap: 12 }}>
        {fields.map((f) => (
          <Field key={f.name} label={`${f.label}${f.required ? ' *' : ''}`} hint={f.hint} className={f.type === 'textarea' ? 'span-2' : ''}>
            {f.type === 'textarea' ? (
              <textarea rows={4} value={values[f.name] ?? ''} onChange={set(f.name)} required={f.required} readOnly={f.readonly} />
            ) : f.type === 'select' ? (
              <select value={values[f.name] ?? ''} onChange={set(f.name)} required={f.required} disabled={f.readonly}>
                <option value="">Select…</option>
                {(f.options || []).map((o) => {
                  const val = typeof o === 'string' ? o : o.value;
                  const label = typeof o === 'string' ? o : o.label || o.value;
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            ) : f.type === 'checkbox' ? (
              <label className="check">
                <input type="checkbox" checked={!!values[f.name]} onChange={set(f.name)} />
                <span>{f.label}</span>
              </label>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={values[f.name] ?? ''}
                onChange={set(f.name)}
                required={f.required}
                readOnly={f.readonly}
                min={f.min}
                max={f.max}
                step={f.type === 'number' ? 'any' : undefined}
              />
            )}
          </Field>
        ))}
      </div>
      <div className="row gap-sm">
        <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save record'}</Button>
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
      </div>
      <p className="tiny muted">Saving creates an audit entry. Approval is a separate step with its own permission.</p>
    </form>
  );
}

export function ModulePage() {
  const { key } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const catalog = useApi('/api/modules');
  const modules = catalog.data?.modules || [];
  const mod = modules.find((m) => m.key === key);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const pageSize = 15;

  const load = () => {
    if (!mod) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status });
    if (q.trim()) params.set('q', q.trim());
    Promise.all([get(`/api/modules/${key}?${params}`), get(`/api/modules/${key}/stats`)])
      .then(([list, st]) => {
        setRows(list.rows || []);
        setTotal(list.total || 0);
        setStats(st);
        setError(null);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [key, status]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, status, mod?.key]);

  const canWrite = mod?.canWrite ?? mod?.writeRoles?.includes(user?.role) ?? false;
  const canApprove = mod?.canApprove ?? mod?.approveRoles?.includes(user?.role) ?? false;

  const columns = useMemo(() => {
    if (!mod) return [];
    const cols = [
      { key: 'ref_no', label: 'Ref', render: (r) => <span className="mono small">{r.ref_no || `#${r.id}`}</span> }
    ];
    mod.fields
      .filter((f) => f.type !== 'textarea')
      .slice(0, 4)
      .forEach((f) => cols.push({ key: f.name, label: f.label, render: (r) => (r[f.name] === null || r[f.name] === '' ? '—' : String(r[f.name])) }));
    cols.push({ key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> });
    cols.push({
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="row gap-xs">
          <button className="btn btn-ghost btn-xs" type="button" onClick={(e) => { e.stopPropagation(); setModal({ mode: 'edit', row: r }); }}>Open</button>
          {canApprove && r.status !== 'approved' && (
            <button className="btn btn-ghost btn-xs" type="button" onClick={(e) => { e.stopPropagation(); approve(r); }}>Approve</button>
          )}
        </div>
      )
    });
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod, canApprove]);

  const submit = async (values) => {
    setBusy(true);
    setFormError(null);
    try {
      if (modal.mode === 'edit') {
        await patch(`/api/modules/${key}/${modal.row.id}`, values);
        toast.push('Record updated');
      } else {
        await post(`/api/modules/${key}`, values);
        toast.push('Record created');
      }
      setModal(null);
      load();
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  const approve = async (row) => {
    try {
      await post(`/api/modules/${key}/${row.id}/approve`, { decision: 'approved', status: 'approved', note: 'Approved via console' });
      toast.push('Record approved');
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  const remove = async () => {
    if (!modal?.row) return;
    setBusy(true);
    try {
      await del(`/api/modules/${key}/${modal.row.id}`);
      toast.push('Record deleted');
      setModal(null);
      load();
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  if (catalog.loading && !catalog.data) return <Loading label="Loading module…" />;
  if (!mod) {
    return (
      <Empty
        icon="🔎"
        title="Module not found"
        text="This module does not exist or you do not have access to it."
        action={<Link className="btn btn-outline" to="/modules">Back to modules</Link>}
      />
    );
  }

  return (
    <div className="col gap-lg">
      <header className="page-head">
        <div>
          <div className="crumb"><Link to="/modules">HSE Modules</Link> / {mod.group}</div>
          <h1><span aria-hidden="true">{mod.icon} </span>{mod.name}</h1>
          <p className="muted small">{mod.description}</p>
        </div>
        <div className="row gap-sm wrap">
          <button className="btn btn-outline btn-sm" type="button" onClick={() => download(`/api/modules/${key}/export`, `${key}-register.csv`)}>
            Export CSV
          </button>
          {canWrite && <Button variant="primary" onClick={() => { setFormError(null); setModal({ mode: 'create' }); }}>New record</Button>}
        </div>
      </header>

      {error && <div className="form-error">{error.message}</div>}

      {stats && (
        <div className="stat-grid">
          <Stat label="Total records" value={fmt(stats.total)} icon="📋" tone="info" />
          {(stats.by_status || []).slice(0, 5).map((s) => (
            <Stat key={s.status} label={String(s.status || 'unset')} value={fmt(s.c)} icon="•" />
          ))}
        </div>
      )}

      <Card
        title="Register"
        subtitle={loading ? 'Refreshing…' : `${fmt(total)} record${total === 1 ? '' : 's'}`}
        actions={
          <div className="row gap-xs wrap">
            <input
              className="input-sm"
              placeholder="Search records…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }}
            />
            <select className="input-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {(mod.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn btn-outline btn-sm" type="button" onClick={() => { setPage(1); load(); }}>Apply</button>
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={(r) => { setFormError(null); setModal({ mode: 'edit', row: r }); }}
          empty={<Empty icon="🗂" title="No records yet" text={canWrite ? 'Create the first record to start this register.' : 'No records are visible for your role.'} />}
        />
        {total > pageSize && <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />}
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? `${mod.name} · ${modal.row.ref_no || modal.row.id}` : `New ${mod.name} record`}
        size="lg"
        footer={
          modal?.mode === 'edit' && canWrite ? (
            <button className="btn btn-danger btn-sm" type="button" onClick={remove} disabled={busy}>Delete record</button>
          ) : null
        }
      >
        {modal && (
          <RecordForm
            fields={mod.fields}
            initial={modal.row}
            onSubmit={submit}
            onCancel={() => setModal(null)}
            busy={busy}
            error={formError}
          />
        )}
      </Modal>
    </div>
  );
}
