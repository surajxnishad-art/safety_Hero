import { Router } from 'express';
import { db, nowIso, audit } from '../db.js';
import {
  hashPassword,
  verifyPassword,
  passwordIssues,
  createSession,
  destroySession,
  requireAuth,
  rateLimit,
  publicUser,
  recordLogin,
  adminCount,
  findUserByEmail
} from '../auth.js';
import { ROLES, ROLE_LABELS } from '../registry.js';
import { aiStatus } from '../ai.js';
import { unreadFor } from '../notify.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 12,
  key: (req) => `login:${req.ip}`,
  message: 'Too many login attempts. Please wait 15 minutes and try again.'
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  max: 8,
  key: (req) => `register:${req.ip}`,
  message: 'Too many registration attempts. Please try again later.'
});

const emailOk = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || ''));

export function bootstrapOwnerAdmin() {
  const email = process.env.OWNER_ADMIN_EMAIL;
  const password = process.env.OWNER_ADMIN_PASSWORD;
  if (!email || !password) return { created: false, reason: 'not_configured' };
  if (adminCount() > 0) return { created: false, reason: 'admin_exists' };
  const issues = passwordIssues(password);
  if (issues.length) return { created: false, reason: `weak_password: ${issues.join('; ')}` };
  const now = nowIso();
  db.prepare(
    `INSERT INTO users (name, email, password_hash, role, designation, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, 'super_admin', 'Platform Owner', 1, ?, ?)`
  ).run(process.env.OWNER_ADMIN_NAME || 'Suraj Safety Hero Admin', String(email).toLowerCase(), hashPassword(password), now, now);
  audit(null, 'admin.bootstrap', 'user', null, 'Initial owner admin created from server-side environment provisioning', null);
  return { created: true };
}

router.get('/setup-status', (req, res) => {
  res.json({ needs_setup: adminCount() === 0, roles: ROLES, role_labels: ROLE_LABELS });
});

router.post('/setup', registerLimiter, (req, res) => {
  if (adminCount() > 0) return res.status(409).json({ error: 'An administrator already exists. Sign in instead.' });
  const { name, email, password } = req.body || {};
  if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'Full name is required' });
  if (!emailOk(email)) return res.status(400).json({ error: 'A valid email is required' });
  const issues = passwordIssues(password);
  if (issues.length) return res.status(400).json({ error: issues.join('. ') });
  const now = nowIso();
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, designation, created_at, updated_at)
       VALUES (?, ?, ?, 'super_admin', 'Platform Owner', ?, ?)`
    )
    .run(String(name).trim(), String(email).toLowerCase(), hashPassword(password), now, now);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  createSession(req, res, user.id);
  audit(user, 'admin.setup', 'user', user.id, 'Initial super admin created', req.ip);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/register', registerLimiter, (req, res) => {
  const { name, email, password, phone, company, designation } = req.body || {};
  if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'Full name is required' });
  if (!emailOk(email)) return res.status(400).json({ error: 'A valid email is required' });
  const issues = passwordIssues(password);
  if (issues.length) return res.status(400).json({ error: issues.join('. ') });
  if (findUserByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists' });
  const now = nowIso();
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, company, designation, created_at, updated_at)
       VALUES (?, ?, ?, 'employee', ?, ?, ?, ?, ?)`
    )
    .run(
      String(name).trim(),
      String(email).toLowerCase(),
      hashPassword(password),
      phone || null,
      company || null,
      designation || null,
      now,
      now
    );
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  createSession(req, res, user.id);
  audit(user, 'auth.register', 'user', user.id, 'Self-registration as employee', req.ip);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = findUserByEmail(email);
  const generic = 'Invalid email or password';
  if (!user) {
    audit(null, 'auth.login_failed', 'user', null, `Unknown email ${String(email).slice(0, 80)}`, req.ip);
    return res.status(401).json({ error: generic });
  }
  if (!user.active) return res.status(403).json({ error: 'This account is deactivated. Contact your administrator.' });
  if (Number(user.failed_attempts) >= 10) {
    return res.status(423).json({ error: 'Account locked after repeated failed sign-ins. Ask an administrator to reset the password.' });
  }
  if (!verifyPassword(password, user.password_hash)) {
    db.prepare('UPDATE users SET failed_attempts = failed_attempts + 1, updated_at = ? WHERE id = ?').run(nowIso(), user.id);
    audit(user, 'auth.login_failed', 'user', user.id, 'Wrong password', req.ip);
    return res.status(401).json({ error: generic });
  }
  db.prepare('UPDATE users SET failed_attempts = 0, updated_at = ? WHERE id = ?').run(nowIso(), user.id);
  recordLogin(user, req);
  createSession(req, res, user.id);
  audit(user, 'auth.login', 'user', user.id, 'Signed in', req.ip);
  res.json({ user: publicUser(user), must_change_password: !!user.must_change_password });
});

router.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: publicUser(req.user),
    role_label: ROLE_LABELS[req.user.role] || req.user.role,
    must_change_password: !!req.user.must_change_password,
    unread: unreadFor(req.user),
    ai: aiStatus()
  });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!verifyPassword(current_password || '', req.user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  const issues = passwordIssues(new_password);
  if (issues.length) return res.status(400).json({ error: issues.join('. ') });
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, failed_attempts = 0, updated_at = ? WHERE id = ?').run(
    hashPassword(new_password),
    nowIso(),
    req.user.id
  );
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
  createSession(req, res, req.user.id);
  audit(req.user, 'auth.password_changed', 'user', req.user.id, 'Password changed by user', req.ip);
  res.json({ ok: true });
});

router.post('/forgot-password', rateLimit({ windowMs: 15 * 60_000, max: 5, message: 'Too many recovery requests. Please wait.' }), (req, res) => {
  const { email } = req.body || {};
  audit(null, 'auth.recovery_requested', 'user', null, `Recovery requested for ${String(email || '').slice(0, 90)}`, req.ip);
  res.json({
    ok: true,
    message:
      'If the account exists, an administrator can reset the password from Admin → User Management. Email delivery is not configured on this deployment, so recovery is handled by an administrator.'
  });
});

export default router;
