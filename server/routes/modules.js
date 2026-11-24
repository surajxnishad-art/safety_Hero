import { Router } from 'express';
import { db, nowIso, audit } from '../db.js';
import { riskBand } from '../registry.js';
import {
  moduleByKey,
  validateRow,
  canRead,
  canWrite,
  canApprove,
  scopeClause,
  nextRefNo,
  pageParams,
  toCsv,
  csvHeaders
} from '../util.js';

const router = Router();

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const round = (v, d = 2) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Derived HSE values are computed server-side, never trusted from the client. */
function derive(mod, values) {
  if (mod.key === 'hira') {
    const s = num(values.severity);
    const l = num(values.likelihood);
    if (s && l) {
      values.initial_risk = s * l;
      values.risk_band = riskBand(s * l);
    }
    const rs = num(values.residual_severity);
    const rl = num(values.residual_likelihood);
    if (rs && rl) {
      values.residual_risk = rs * rl;
      values.residual_band = riskBand(rs * rl);
    }
  }
  if (mod.key === 'lifting') {
    const w = num(values.load_weight);
    const c = num(values.crane_capacity);
    if (w && c) values.utilization_pct = round((w / c) * 100, 1);
  }
  if (mod.key === 'incidents') {
    const days = num(values.lost_days);
    if (days !== null && days > 0 && !values.investigation_status) values.investigation_status = 'open';
  }
  return values;
}

const textFields = (mod) => mod.fields.filter((f) => f.type === 'text' || f.type === 'textarea').slice(0, 8).map((f) => f.name);

function loadOwned(req, res) {
  const mod = moduleByKey(req.params.key);
  if (!mod) {
    res.status(404).json({ error: 'Unknown safety module' });
    return null;
  }
  if (!canRead(mod, req.user)) {
    res.status(403).json({ error: 'Your role does not have access to this module' });
    return null;
  }
  return mod;
}

router.get('/:key', (req, res) => {
  const mod = loadOwned(req, res);
  if (!mod) return;
  const { page, pageSize, offset } = pageParams(req.query);
  const where = [];
  const params = [];

  const scope = scopeClause(mod, req.user);
  where.push(scope.sql);
  params.push(...scope.params);

  if (req.query.status && req.query.status !== 'all') {
    where.push('t.status = ?');
    params.push(String(req.query.status));
  }
  if (req.query.project_id) {
    where.push('t.project_id = ?');
    params.push(Number(req.query.project_id));
  }
  const q = String(req.query.q || '').trim();
  if (q) {
    const cols = ['t.ref_no', 't.title', ...textFields(mod).map((c) => `t.${c}`)];
    where.push(`(${cols.map((c) => `${c} LIKE ?`).join(' OR ')})`);
    for (let i = 0; i < cols.length; i += 1) params.push(`%${q}%`);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortable = new Set(['created_at', 'updated_at', 'status', 'ref_no', 'id', ...mod.fields.map((f) => f.name)]);
  const sort = sortable.has(String(req.query.sort)) ? String(req.query.sort) : 'created_at';
  const dir = String(req.query.dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const total = db.prepare(`SELECT COUNT(*) AS c FROM ${mod.table} t ${clause}`).get(...params).c;
  const rows = db
    .prepare(`SELECT t.* FROM ${mod.table} t ${clause} ORDER BY t.${sort} ${dir}, t.id DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);

  res.json({
    rows,
    total,
    page,
    pageSize,
    module: {
      key: mod.key,
      name: mod.name,
      short: mod.short,
      prefix: mod.prefix,
      group: mod.group,
      icon: mod.icon,
      description: mod.description,
      statuses: mod.statuses,
      fields: mod.fields,
      canWrite: canWrite(mod, req.user),
      canApprove: canApprove(mod, req.user)
    }
  });
});

router.get('/:key/export', (req, res) => {
  const mod = loadOwned(req, res);
  if (!mod) return;
  const scope = scopeClause(mod, req.user);
  const rows = db.prepare(`SELECT t.* FROM ${mod.table} t WHERE ${scope.sql} ORDER BY t.id DESC LIMIT 5000`).all(...scope.params);
  const columns = [
    { name: 'ref_no', label: 'Reference' },
    { name: 'title', label: 'Title' },
    { name: 'status', label: 'Status' },
    ...mod.fields.map((f) => ({ name: f.name, label: f.label })),
    { name: 'created_at', label: 'Created' },
    { name: 'approved_at', label: 'Approved' }
  ];
  res.set(csvHeaders(`${mod.key}-register-${new Date().toISOString().slice(0, 10)}.csv`));
  res.send(toCsv(rows, columns));
});

router.get('/:key/stats', (req, res) => {
  const mod = loadOwned(req, res);
  if (!mod) return;
  const scope = scopeClause(mod, req.user);
  const byStatus = db.prepare(`SELECT status, COUNT(*) c FROM ${mod.table} t WHERE ${scope.sql} GROUP BY status`).all(...scope.params);
  let bands = [];
  if (mod.key === 'hira') {
    bands = db.prepare(`SELECT risk_band band, COUNT(*) c FROM ${mod.table} t WHERE ${scope.sql} GROUP BY risk_band`).all(...scope.params);
  }
  res.json({ by_status: byStatus, by_band: bands, total: byStatus.reduce((s, r) => s + r.c, 0) });
});

router.get('/:key/:id', (req, res) => {
  const mod = loadOwned(req, res);
  if (!mod) return;
  const scope = scopeClause(mod, req.user);
  const row = db.prepare(`SELECT t.* FROM ${mod.table} t WHERE t.id = ? AND ${scope.sql}`).get(Number(req.params.id), ...scope.params);
  if (!row) return res.status(404).json({ error: 'Record not found' });
  res.json({ row, module: { key: mod.key, name: mod.name, fields: mod.fields, statuses: mod.statuses, canWrite: canWrite(mod, req.user), canApprove: canApprove(mod, req.user) } });
});

router.post('/:key', (req, res) => {
  const mod = loadOwned(req, res);
  if (!mod) return;
  if (!canWrite(mod, req.user)) return res.status(403).json({ error: 'Your role cannot create records in this module' });
  const body = req.body || {};
  const { values, errors } = validateRow(mod, body);
  if (errors.length) return res.status(400).json({ error: errors[0], errors });
  derive(mod, values);

  const status = mod.statuses.includes(body.status) ? body.status : 'draft';
  const now = nowIso();
  const columns = ['ref_no', 'title', 'status', 'project_id', 'site_id', 'created_by', 'created_at', 'updated_at', ...Object.keys(values)];
  const row = {
    ref_no: nextRefNo(db, mod),
    title: String(body.title || values.topic || values.activity || values.work_description || values.equipment_name || values.incident_type || values.aspect || values.item_type || values.contractor_name || values.change_type || values.act_regulation || values.employee_name || values.month || mod.name).slice(0, 240),
    status,
    project_id: body.project_id ? Number(body.project_id) : req.user.project_id || null,
    site_id: body.site_id ? Number(body.site_id) : null,
    created_by: req.user.id,
    created_at: now,
    updated_at: now,
    ...values
  };
  const info = db
    .prepare(`INSERT INTO ${mod.table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
    .run(...columns.map((c) => (row[c] === undefined ? null : row[c])));
  const created = db.prepare(`SELECT * FROM ${mod.table} WHERE id = ?`).get(info.lastInsertRowid);
  audit(req.user, `${mod.key}.create`, mod.table, created.id, `${created.ref_no} created`, req.ip);
  res.status(201).json({ row: created });
});

router.patch('/:key/:id', (req, res) => {
  const mod = loadOwned(req, res);
  if (!mod) return;
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM ${mod.table} WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Record not found' });
  const isOwner = existing.created_by === req.user.id;
  if (!canWrite(mod, req.user) && !(isOwner && existing.status === 'draft')) {
    return res.status(403).json({ error: 'Your role cannot edit this record' });
  }
  if (['approved', 'closed'].includes(existing.status) && !canApprove(mod, req.user)) {
    return res.status(403).json({ error: 'Approved or closed records can only be revised by an approver' });
  }
  const body = req.body || {};
  const { values, errors } = validateRow(mod, body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors[0], errors });
  derive(mod, values);

  const fields = Object.keys(values);
  if (body.title) {
    fields.push('title');
    values.title = String(body.title).slice(0, 240);
  }
  if (body.project_id !== undefined) {
    fields.push('project_id');
    values.project_id = body.project_id ? Number(body.project_id) : null;
  }
  if (body.status && mod.statuses.includes(body.status) && (canApprove(mod, req.user) || ['draft', 'pending_approval'].includes(body.status))) {
    fields.push('status');
    values.status = body.status;
  }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  fields.push('updated_at');
  values.updated_at = nowIso();

  db.prepare(`UPDATE ${mod.table} SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`).run(
    ...fields.map((f) => (values[f] === undefined ? null : values[f])),
    id
  );
  const row = db.prepare(`SELECT * FROM ${mod.table} WHERE id = ?`).get(id);
  audit(req.user, `${mod.key}.update`, mod.table, id, `${row.ref_no} updated (${fields.filter((f) => f !== 'updated_at').join(', ')})`, req.ip);
  res.json({ row });
});

router.post('/:key/:id/approve', (req, res) => {
  const mod = loadOwned(req, res);
  if (!mod) return;
  if (!canApprove(mod, req.user)) return res.status(403).json({ error: 'Your role cannot approve records in this module' });
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM ${mod.table} WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Record not found' });
  const note = req.body && req.body.note ? String(req.body.note).slice(0, 2000) : null;
  const decision = req.body && req.body.decision === 'reject' ? 'rejected' : 'approved';
  db.prepare(`UPDATE ${mod.table} SET status = ?, approved_by = ?, approved_at = ?, approval_note = ?, updated_at = ? WHERE id = ?`).run(
    decision,
    req.user.id,
    nowIso(),
    note,
    nowIso(),
    id
  );
  if (existing.created_by) {
    db.prepare(
      `INSERT INTO notifications (user_id, title, body, category, link, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      existing.created_by,
      `${existing.ref_no} ${decision}`,
      `${mod.name}: ${existing.title || ''} was ${decision} by ${req.user.name}.`,
      'approval',
      `/app/${mod.key}`,
      decision === 'approved' ? 'info' : 'warning',
      nowIso()
    );
  }
  audit(req.user, `${mod.key}.${decision}`, mod.table, id, `${existing.ref_no} ${decision}${note ? `: ${note}` : ''}`, req.ip);
  res.json({ row: db.prepare(`SELECT * FROM ${mod.table} WHERE id = ?`).get(id) });
});

router.delete('/:key/:id', (req, res) => {
  const mod = loadOwned(req, res);
  if (!mod) return;
  if (!canApprove(mod, req.user)) return res.status(403).json({ error: 'Only approvers can delete records' });
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM ${mod.table} WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Record not found' });
  db.prepare(`DELETE FROM ${mod.table} WHERE id = ?`).run(id);
  audit(req.user, `${mod.key}.delete`, mod.table, id, `${existing.ref_no} deleted`, req.ip);
  res.json({ ok: true });
});

export default router;
