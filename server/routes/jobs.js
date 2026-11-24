import { Router } from 'express';
import { db, nowIso, audit } from '../db.js';
import { currentUser, requireAuth, requireAdmin, rateLimit } from '../auth.js';
import { pageParams } from '../util.js';

const router = Router();
const today = () => new Date().toISOString().slice(0, 10);

const baseSelect = `SELECT j.*,
  (SELECT COUNT(*) FROM job_applications a WHERE a.job_id = j.id) applications,
  (SELECT COUNT(*) FROM saved_jobs s WHERE s.job_id = j.id) saves
  FROM jobs j`;

const publicClause = "(j.status = 'published' AND (j.expiry_date IS NULL OR j.expiry_date >= ?))";

/* ------------------------------- public listings ------------------------------- */

router.get('/', (req, res) => {
  const { page, pageSize, offset } = pageParams(req.query);
  const where = [publicClause];
  const params = [today()];
  const q = String(req.query.q || '').trim();
  if (q) {
    where.push('(j.title LIKE ? OR j.company LIKE ? OR j.city LIKE ? OR j.state LIKE ? OR j.category LIKE ?)');
    params.push(...Array(5).fill(`%${q}%`));
  }
  if (req.query.state) {
    where.push('j.state = ?');
    params.push(String(req.query.state));
  }
  if (req.query.city) {
    where.push('j.city LIKE ?');
    params.push(`%${String(req.query.city)}%`);
  }
  if (req.query.category) {
    where.push('j.category = ?');
    params.push(String(req.query.category));
  }
  if (req.query.job_type) {
    where.push('j.job_type = ?');
    params.push(String(req.query.job_type));
  }
  if (req.query.experience) {
    const exp = Number(req.query.experience);
    if (!Number.isNaN(exp)) {
      where.push('(j.experience_min IS NULL OR j.experience_min <= ?) AND (j.experience_max IS NULL OR j.experience_max >= ?)');
      params.push(exp, exp);
    }
  }
  if (req.query.fresher === '1') {
    where.push('(j.experience_min IS NULL OR j.experience_min = 0)');
  }
  if (req.query.salary_min) {
    where.push('(j.salary_max IS NULL OR j.salary_max >= ?)');
    params.push(Number(req.query.salary_min));
  }
  if (req.query.qualification) {
    where.push('j.qualification LIKE ?');
    params.push(`%${String(req.query.qualification)}%`);
  }
  if (req.query.featured === '1') where.push('j.featured = 1');

  const clause = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) c FROM jobs j ${clause}`).get(...params).c;
  const rows = db
    .prepare(`${baseSelect} ${clause} ORDER BY j.featured DESC, j.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);

  res.json({ rows, total, page, pageSize });
});

router.get('/facets', (req, res) => {
  const states = db.prepare("SELECT state, COUNT(*) c FROM jobs WHERE status='published' AND state IS NOT NULL GROUP BY state ORDER BY c DESC").all();
  const categories = db.prepare("SELECT category, COUNT(*) c FROM jobs WHERE status='published' GROUP BY category ORDER BY c DESC").all();
  const cities = db.prepare("SELECT city, COUNT(*) c FROM jobs WHERE status='published' AND city IS NOT NULL GROUP BY city ORDER BY c DESC LIMIT 40").all();
  res.json({ states, categories, cities });
});

router.get('/saved/list', requireAuth, (req, res) => {
  const rows = db
    .prepare(`${baseSelect} JOIN saved_jobs s2 ON s2.job_id = j.id WHERE s2.user_id = ? ORDER BY s2.created_at DESC`)
    .all(req.user.id);
  res.json({ rows });
});

router.get('/applications/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT a.*, j.title, j.company FROM job_applications a JOIN jobs j ON j.id = a.job_id WHERE a.user_id = ? ORDER BY a.created_at DESC')
    .all(req.user.id);
  res.json({ rows });
});

router.get('/applications/all', requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, j.title AS job_title, j.company FROM job_applications a JOIN jobs j ON j.id = a.job_id ORDER BY a.created_at DESC LIMIT 500`
    )
    .all();
  res.json({ rows });
});

router.patch('/applications/:id', requireAdmin, (req, res) => {
  const statuses = ['received', 'shortlisted', 'rejected', 'hired'];
  const status = String((req.body || {}).status || '');
  if (!statuses.includes(status)) return res.status(400).json({ error: `Status must be one of ${statuses.join(', ')}` });
  db.prepare('UPDATE job_applications SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  audit(req.user, 'job.application_status', 'job_applications', req.params.id, `Status set to ${status}`, req.ip);
  res.json({ ok: true });
});

router.get('/admin/all', requireAdmin, (req, res) => {
  const rows = db.prepare(`${baseSelect} ORDER BY j.created_at DESC`).all();
  res.json({ rows });
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`${baseSelect} WHERE j.id = ?`).get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Job not found' });
  const viewer = currentUser(req);
  const isAdmin = viewer && ['super_admin', 'admin'].includes(viewer.role);
  if (row.status !== 'published' && !isAdmin) return res.status(404).json({ error: 'Job not found' });
  const saved = viewer ? !!db.prepare('SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?').get(viewer.id, row.id) : false;
  const applied = viewer
    ? !!db.prepare('SELECT id FROM job_applications WHERE user_id = ? AND job_id = ?').get(viewer.id, row.id)
    : false;
  res.json({ row, saved, applied });
});

/* --------------------------------- applications -------------------------------- */

router.post('/:id/apply', rateLimit({ windowMs: 60 * 60_000, max: 10, message: 'Too many applications from this network. Try again later.' }), (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(Number(req.params.id));
  if (!job || job.status !== 'published') return res.status(404).json({ error: 'This vacancy is not open' });
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Full name is required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'A valid email is required' });
  const viewer = currentUser(req);
  const info = db
    .prepare(
      `INSERT INTO job_applications (job_id, user_id, name, email, phone, experience_years, qualification, resume_text, cover_note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      job.id,
      viewer ? viewer.id : null,
      name,
      email.toLowerCase(),
      body.phone ? String(body.phone).slice(0, 30) : null,
      body.experience_years !== undefined && body.experience_years !== '' ? Number(body.experience_years) : null,
      body.qualification ? String(body.qualification).slice(0, 200) : null,
      body.resume_text ? String(body.resume_text).slice(0, 20000) : null,
      body.cover_note ? String(body.cover_note).slice(0, 4000) : null,
      nowIso()
    );
  db.prepare(
    `INSERT INTO notifications (role_target, title, body, category, link, severity, created_at) VALUES ('hse_staff', ?, ?, 'job', '/admin/jobs', 'info', ?)`
  ).run('New job application', `${name} applied for ${job.title} at ${job.company}.`, nowIso());
  audit(viewer, 'job.apply', 'job_applications', info.lastInsertRowid, `Applied for job ${job.id}`, req.ip);
  res.status(201).json({ ok: true, message: 'Application submitted. The employer or administrator will review it.' });
});

router.post('/:id/save', requireAuth, (req, res) => {
  const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(Number(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });
  db.prepare('INSERT OR IGNORE INTO saved_jobs (user_id, job_id, created_at) VALUES (?, ?, ?)').run(req.user.id, job.id, nowIso());
  res.json({ ok: true, saved: true });
});

router.delete('/:id/save', requireAuth, (req, res) => {
  db.prepare('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?').run(req.user.id, Number(req.params.id));
  res.json({ ok: true, saved: false });
});

/* ---------------------------------- admin CRUD --------------------------------- */

const JOB_FIELDS = [
  'title', 'company', 'category', 'state', 'city', 'salary_min', 'salary_max',
  'experience_min', 'experience_max', 'qualification', 'job_type', 'description',
  'apply_url', 'contact_email', 'source', 'source_verified', 'featured', 'status', 'expiry_date'
];

router.post('/', requireAdmin, (req, res) => {
  const body = req.body || {};
  if (!body.title || !body.company || !body.category) {
    return res.status(400).json({ error: 'Title, company and category are required' });
  }
  const now = nowIso();
  const info = db
    .prepare(
      `INSERT INTO jobs (title, company, category, state, city, salary_min, salary_max, experience_min, experience_max,
        qualification, job_type, description, apply_url, contact_email, source, source_verified, featured, status, expiry_date,
        created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(body.title).slice(0, 200),
      String(body.company).slice(0, 200),
      String(body.category).slice(0, 100),
      body.state || null,
      body.city || null,
      body.salary_min ? Number(body.salary_min) : null,
      body.salary_max ? Number(body.salary_max) : null,
      body.experience_min !== undefined && body.experience_min !== '' ? Number(body.experience_min) : null,
      body.experience_max !== undefined && body.experience_max !== '' ? Number(body.experience_max) : null,
      body.qualification || null,
      ['private', 'government', 'contract', 'fresher'].includes(body.job_type) ? body.job_type : 'private',
      body.description || null,
      body.apply_url || null,
      body.contact_email || null,
      body.source || null,
      body.source_verified ? 1 : 0,
      body.featured ? 1 : 0,
      ['pending', 'published', 'closed', 'draft'].includes(body.status) ? body.status : 'pending',
      body.expiry_date || null,
      req.user.id,
      now,
      now
    );
  audit(req.user, 'job.create', 'jobs', info.lastInsertRowid, `Created job ${body.title}`, req.ip);
  res.status(201).json({ row: db.prepare('SELECT * FROM jobs WHERE id = ?').get(info.lastInsertRowid) });
});

router.patch('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });
  const body = req.body || {};
  const fields = JOB_FIELDS.filter((f) => body[f] !== undefined);
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  const values = fields.map((f) => {
    if (['salary_min', 'salary_max', 'experience_min', 'experience_max'].includes(f)) {
      return body[f] === '' || body[f] === null ? null : Number(body[f]);
    }
    if (['source_verified', 'featured'].includes(f)) return body[f] ? 1 : 0;
    return body[f] === '' ? null : body[f];
  });
  db.prepare(`UPDATE jobs SET ${fields.map((f) => `${f} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(...values, nowIso(), id);
  audit(req.user, 'job.update', 'jobs', id, `Updated ${fields.join(', ')}`, req.ip);
  res.json({ row: db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });
  db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  audit(req.user, 'job.delete', 'jobs', id, `Deleted ${existing.title}`, req.ip);
  res.json({ ok: true });
});

export default router;
