import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/* --------------------------------- toasts --------------------------------- */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((list) => [...list, { id, message, type }]);
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 4600);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`toast ${i.type}`}>
            <span>{i.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext) || { push: () => {} };

/* --------------------------------- atoms ---------------------------------- */

export function Button({ children, variant = 'default', size, className = '', type = 'button', ...rest }) {
  const cls = ['btn', variant !== 'default' ? `btn-${variant}` : '', size ? `btn-${size}` : '', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Badge({ status, children, plain }) {
  const key = String(status || children || '').toLowerCase().replace(/\s+/g, '_');
  return (
    <span className={`badge${plain ? ' plain' : ''}`} data-status={key}>
      {children ?? String(status || '').replace(/_/g, ' ')}
    </span>
  );
}

export function Card({ title, subtitle, actions, children, className = '', bodyClass = 'card-body', pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <div className="small muted">{subtitle}</div>}
          </div>
          {actions && <div className="row gap-sm wrap">{actions}</div>}
        </div>
      )}
      {pad ? <div className={bodyClass}>{children}</div> : children}
    </section>
  );
}

export function Stat({ label, value, sub, tone = '', icon }) {
  return (
    <div className={`stat ${tone}`}>
      {icon && <span className="stat-icon" aria-hidden="true">{icon}</span>}
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Spinner({ large }) {
  return <span className={`spinner${large ? ' lg' : ''}`} role="progressbar" aria-label="Loading" />;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading-screen">
      <Spinner large />
      <span className="small muted">{label}</span>
    </div>
  );
}

export function Empty({ icon = '📋', title = 'Nothing here yet', text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {text && <p className="small">{text}</p>}
      {action}
    </div>
  );
}

export function Progress({ value, tone = '', label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div>
      {label && (
        <div className="between small muted mb-1">
          <span>{label}</span>
          <span className="strong">{pct}%</span>
        </div>
      )}
      <div className={`progress ${tone}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={value === t.key} className={`tab${value === t.key ? ' active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count !== undefined ? ` (${t.count})` : ''}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true" aria-label={title || 'Dialog'}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function DataTable({ columns, rows, onRowClick, empty }) {
  if (!rows || rows.length === 0) return empty || <Empty />;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'num' : ''}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'right' ? 'num' : ''}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pager">
      <span className="small muted">
        Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="row gap-sm">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</Button>
        <span className="small muted">Page {page} / {pages}</span>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <div className="form-error">{error.message || String(error)}</div>;
}
