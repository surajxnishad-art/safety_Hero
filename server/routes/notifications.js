import { Router } from 'express';
import { db, nowIso, getSetting, setSetting, audit } from '../db.js';
import { requireAuth, publicUser } from '../auth.js';
import { unreadFor, runAlertScan } from '../notify.js';

const router = Router();

const visible = (user) =>
  db
    .prepare(
      `SELECT * FROM notifications
       WHERE user_id = ? OR role_target = 'all'
         OR (role_target = 'hse_staff' AND ? IN ('super_admin','admin','hse_manager','safety_officer','safety_supervisor'))
       ORDER BY id DESC LIMIT 100`
    )
    .all(user.id, user.role);

router.get('/', requireAuth, (req, res) => {
  res.json({ rows: visible(req.user), unread: unreadFor(req.user), settings: { demo_data: getSetting('demo_data', '0') } });
});

router.post('/read-all', requireAuth, (req, res) => {
  db.prepare(
    `UPDATE notifications SET read_at = ? WHERE read_at IS NULL AND (user_id = ? OR role_target = 'all'
      OR (role_target = 'hse_staff' AND ? IN ('super_admin','admin','hse_manager','safety_officer','safety_supervisor')))`
  ).run(nowIso(), req.user.id, req.user.role);
  res.json({ ok: true, unread: 0 });
});

router.post('/:id/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read_at = ? WHERE id = ?').run(nowIso(), Number(req.params.id));
  res.json({ ok: true, unread: unreadFor(req.user) });
});

router.post('/', requireAuth, (req, res) => {
  if (!['super_admin', 'admin', 'hse_manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only administrators and HSE managers can broadcast notifications' });
  }
  const body = req.body || {};
  if (!body.title) return res.status(400).json({ error: 'Title is required' });
  const info = db
    .prepare(
      `INSERT INTO notifications (role_target, title, body, category, link, severity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      ['all', 'hse_staff'].includes(body.role_target) ? body.role_target : 'all',
      String(body.title).slice(0, 200),
      body.body ? String(body.body).slice(0, 2000) : null,
      'broadcast',
      body.link || null,
      ['info', 'warning', 'critical'].includes(body.severity) ? body.severity : 'info',
      nowIso()
    );
  audit(req.user, 'notification.broadcast', 'notifications', info.lastInsertRowid, body.title, req.ip);
  res.status(201).json({ ok: true });
});

router.post('/scan', requireAuth, (req, res) => {
  if (!['super_admin', 'admin', 'hse_manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only HSE management can run the alert scan' });
  }
  const result = runAlertScan();
  audit(req.user, 'alerts.scan', 'notifications', null, `Created ${result.created} alerts`, req.ip);
  res.json(result);
});

router.delete('/:id', requireAuth, (req, res) => {
  if (!['super_admin', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Not permitted' });
  db.prepare('DELETE FROM notifications WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

router.get('/settings/public', (req, res) => {
  res.json({
    org_name: getSetting('org_name', 'SURAJ SAFETY HERO'),
    org_tagline: getSetting('org_tagline', 'SMART SAFETY • ZERO HARM • SAFER FUTURE'),
    owner_phone: getSetting('owner_phone', '8933808934'),
    owner_email: getSetting('owner_email', 'its.surajsahani@gmail.com')
  });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user), unread: unreadFor(req.user) }));

export default router;
