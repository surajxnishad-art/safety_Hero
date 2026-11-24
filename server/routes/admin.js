import { Router } from 'express';
import fs from 'node:fs';
import { db, nowIso, getSetting, setSetting, audit, dbPath } from '../db.js';
import { requireAdmin, hashPassword, publicUser } from '../auth.js';
import { ROLES, ROLE_LABELS, MODULES } from '../registry.js';
import { aiStatus } from '../ai.js';
import { runAlertScan } from '../notify.js';
import { pageParams } from '../util.js';

const router = Router();
router.use(requireAdmin);

const count = (sql, ...params) => db.prepare(sql).get(...params).c;

/* --------------------------------- overview --------------------------------- */

router.get('/overview', (req, res) => {
  const usersByRole = db.prepare('SELECT role, COUNT(*) c FROM users GROUP BY role').all();
  const modules = MODULES.map((m) => ({
    key: m.key,
    table: m.table,
    total: count(`SELECT COUNT(*) c FROM ${m.table}`),
    pending: count(`SELECT COUNT(*) c FROM ${m.table} WHERE status = 'pending_approval'`)
  }));
  res.json({
    users: { total: count('SELECT COUNT(*) c FROM users'), active: count('SELECT COUNT(*) c FROM users WHERE active = 1'), byRole: usersByRole },
    modules,
    jobs: {
      total: count('SELECT COUNT(*) c FROM jobs'),
      published: count('SELECT COUNT(*) c FROM jobs'),
      pending: count("SELECT COUNT(*) c FROM jobs WHERE status = 'pending'"),
      applications: count('SELECT COUNT(*) c FROM job_applications')
    },
    documents: {
      total: count('SELECT COUNT(*) c FROM documents'),
      approved: count("SELECT COUNT(*) c FROM documents WHERE status = 'approved'"),
      versions: count('SELECT COUNT(*) c FROM document_versions')
    },
    enquiries: {
      total: count('SELECT COUNT(*) c FROM contact_enquiries'),
      open: count("SELECT COUNT(*) c FROM contact_enquiries WHERE status IN ('new','in_progress')")
    },
    ai: { ...aiStatus(), conversations: count('SELECT COUNT(*) c FROM ai_conversations') },
    audit: db.prepare('SELECT a.*, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 12').all(),
    notifications: { total: count('SELECT COUNT(*) c FROM notifications'), unread: count('SELECT COUNT(*) c FROM notifications WHERE read_at IS NULL') },
    settings: {
      org_name: getSetting('org_name', 'SURAJ SAFETY HERO'),
      demo_data: getSetting('demo_data', '0'),
      ai_enabled: getSetting('ai_enabled', '1')
    },
    db: { path: dbPath, size_kb: Math.round(fs.statSync(dbPath).size / 1024) }
  });
});

/* ---------------------------------- users ----------------------------------- */

router.get('/users', (req, res) => {
  const { page, pageSize, offset } = pageParams(req.query);
  const where = [];
  const params = [];
  const q = String(req.query.q || '').trim();
  if (q) {
    where.push('(name LIKE ? OR email LIKE ? OR company LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (req.query.role) {
    where.push('role = ?');
    params.push(String(req.query.role));
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) c FROM users ${clause}`).get(...params).c;
  const rows = db.prepare(`SELECT * FROM users ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);
  res.json({ rows: rows.map(publicUser), total, page, pageSize, roles: ROLES, roleLabels: ROLE_LABELS });
});

router.post('/users', (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const role = ROLES.includes(body.role) ? body.role : 'employee';
  const password = String(body.password || '');
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Valid email required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'A user with this email already exists' });
  const now = nowIso();
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, company, designation, project_id, active, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`
    )
    .run(name, email, hashPassword(password), role, body.phone || null, body.company || null, body.designation || null, body.project_id || null, now, now);
  audit(req.user, 'user.create', 'users', info.lastInsertRowid, `Created ${email} as ${role}`, req.ip);
  res.status(201).json({ row: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)) });
});

router.patch('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const body = req.body || {};
  const fields = [];
  const values = [];
  if (body.name !== undefined) {
    fields.push('name = ?');
    values.push(String(body.name).slice(0, 120));
  }
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) return res.status(400).json({ error: 'Unknown role' });
    if (id === req.user.id && body.role !== target.role) return res.status(400).json({ error: 'You cannot change your own role' });
    if (target.role === 'super_admin' && body.role !== 'super_admin' && count("SELECT COUNT(*) c FROM users WHERE role = 'super_admin' AND active = 1") <= 1) {
      return res.status(400).json({ error: 'At least one active Super Admin must remain' });
    }
    fields.push('role = ?');
    values.push(body.role);
  }
  if (body.active !== undefined) {
    if (id === req.user.id && !body.active) return res.status(400).json({ error: 'You cannot deactivate your own account' });
    fields.push('active = ?');
    values.push(body.active ? 1 : 0);
  }
  ['phone', 'company', 'designation', 'project_id'].forEach((f) => {
    if (body[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(body[f] === '' ? null : body[f]);
    }
  });
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  db.prepare(`UPDATE users SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`).run(...values, nowIso(), id);
  audit(req.user, 'user.update', 'users', id, `Updated ${fields.join(', ')}`, req.ip);
  res.json({ row: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
});

router.post('/users/:id/reset-password', (req, res) => {
  const id = Number(req.params.id);
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const supplied = String((req.body || {}).password || '');
  const temp = supplied.length >= 8 ? supplied : `Ssh-${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`;
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1, failed_attempts = 0, updated_at = ? WHERE id = ?').run(
    hashPassword(temp),
    nowIso(),
    id
  );
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  audit(req.user, 'user.reset_password', 'users', id, `Password reset for ${target.email}`, req.ip);
  res.json({ ok: true, temporary_password: temp, must_change_password: true });
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'super_admin' && count("SELECT COUNT(*) c FROM users WHERE role = 'super_admin' AND active = 1") <= 1) {
    return res.status(400).json({ error: 'At least one active Super Admin must remain' });
  }
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  audit(req.user, 'user.delete', 'users', id, `Deleted ${target.email}`, req.ip);
  res.json({ ok: true });
});

/* -------------------------------- projects/sites ------------------------------ */

router.get('/projects', (req, res) => {
  res.json({
    rows: db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all(),
    sites: db.prepare('SELECT * FROM sites ORDER BY name').all()
  });
});

router.post('/projects', (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'Project name is required' });
  const info = db
    .prepare('INSERT INTO projects (name, code, client, location, start_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(String(body.name).slice(0, 160), body.code || null, body.client || null, body.location || null, body.start_date || null, body.status || 'active', nowIso());
  audit(req.user, 'project.create', 'projects', info.lastInsertRowid, body.name, req.ip);
  res.status(201).json({ row: db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid) });
});

router.patch('/projects/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });
  const body = req.body || {};
  const allowed = ['name', 'code', 'client', 'location', 'start_date', 'status'];
  const fields = allowed.filter((f) => body[f] !== undefined);
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  db.prepare(`UPDATE projects SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`).run(...fields.map((f) => body[f]), id);
  audit(req.user, 'project.update', 'projects', id, fields.join(', '), req.ip);
  res.json({ row: db.prepare('SELECT * FROM projects WHERE id = ?').get(id) });
});

router.post('/sites', (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'Site name is required' });
  const info = db
    .prepare('INSERT INTO sites (project_id, name, location, site_type, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(body.project_id || null, String(body.name).slice(0, 160), body.location || null, body.site_type || null, nowIso());
  audit(req.user, 'site.create', 'sites', info.lastInsertRowid, body.name, req.ip);
  res.status(201).json({ row: db.prepare('SELECT * FROM sites WHERE id = ?').get(info.lastInsertRowid) });
});

router.delete('/sites/:id', (req, res) => {
  db.prepare('DELETE FROM sites WHERE id = ?').run(Number(req.params.id));
  audit(req.user, 'site.delete', 'sites', req.params.id, 'Deleted site', req.ip);
  res.json({ ok: true });
});

/* -------------------------------- enquiries --------------------------------- */

router.get('/enquiries', (req, res) => {
  const rows = db.prepare('SELECT * FROM contact_enquiries ORDER BY created_at DESC LIMIT 300').all();
  res.json({ rows });
});

router.patch('/enquiries/:id', (req, res) => {
  const status = String((req.body || {}).status || '');
  if (!['new', 'in_progress', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE contact_enquiries SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  audit(req.user, 'enquiry.update', 'contact_enquiries', req.params.id, `Status ${status}`, req.ip);
  res.json({ ok: true });
});

/* --------------------------------- audit log -------------------------------- */

router.get('/audit', (req, res) => {
  const { page, pageSize, offset } = pageParams(req.query);
  const q = String(req.query.q || '').trim();
  const where = q ? 'WHERE a.action LIKE ? OR a.details LIKE ? OR u.email LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  const total = db.prepare(`SELECT COUNT(*) c FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${where}`).get(...params).c;
  const rows = db
    .prepare(
      `SELECT a.*, u.name AS user_name, u.email AS user_email FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${where}
       ORDER BY a.id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);
  res.json({ rows, total, page, pageSize });
});

/* --------------------------------- sessions --------------------------------- */

router.get('/sessions', (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.id, s.created_at, s.expires_at, s.ip, u.name, u.email, u.role FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.expires_at > ? ORDER BY s.created_at DESC LIMIT 100`
    )
    .all(nowIso());
  res.json({ rows });
});

router.delete('/sessions/:id', (req, res) => {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(String(req.params.id));
  audit(req.user, 'session.revoke', 'sessions', req.params.id, 'Session revoked', req.ip);
  res.json({ ok: true });
});

/* --------------------------------- settings --------------------------------- */

const SETTING_KEYS = [
  'org_name', 'org_tagline', 'owner_phone', 'owner_email', 'ai_enabled',
  'notification_email_enabled', 'whatsapp_enabled', 'legal_review_notice', 'demo_data'
];

router.get('/settings', (req, res) => {
  const settings = {};
  SETTING_KEYS.forEach((k) => (settings[k] = getSetting(k, '')));
  res.json({ settings, ai: aiStatus() });
});

router.put('/settings', (req, res) => {
  const body = req.body || {};
  const updated = [];
  SETTING_KEYS.forEach((k) => {
    if (body[k] !== undefined && k !== 'demo_data') {
      setSetting(k, String(body[k]).slice(0, 2000));
      updated.push(k);
    }
  });
  audit(req.user, 'settings.update', 'settings', null, `Updated ${updated.join(', ') || 'nothing'}`, req.ip);
  res.json({ ok: true, updated });
});

/* ---------------------------------- backup ---------------------------------- */

router.get('/backup', (req, res) => {
  const tables = [
    'users', 'projects', 'sites', 'documents', 'document_versions', 'jobs', 'job_applications',
    'notifications', 'audit_logs', 'contact_enquiries', ...MODULES.map((m) => m.table)
  ];
  const dump = { generated_at: nowIso(), version: '2.0.0', tables: {} };
  tables.forEach((t) => {
    try {
      dump.tables[t] = db.prepare(`SELECT * FROM ${t}`).all();
    } catch {
      dump.tables[t] = [];
    }
  });
  audit(req.user, 'backup.download', 'system', null, 'Database backup downloaded', req.ip);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="safety-hero-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(dump, null, 2));
});

router.post('/alerts/scan', (req, res) => {
  const result = runAlertScan();
  audit(req.user, 'alerts.scan', 'system', null, `Created ${result.created} alerts`, req.ip);
  res.json(result);
});

export default router;
