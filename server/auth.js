import crypto from 'node:crypto';
import { db, nowIso, audit } from './db.js';
import { isAdminRole } from './registry.js';

const SESSION_COOKIE = 'ssh_session';
const SESSION_DAYS = 7;

/* ---------------- password hashing (scrypt, salted, timing safe) ---------------- */

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, salt, hash] = String(stored || '').split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const candidate = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

export function passwordIssues(password) {
  const issues = [];
  const pw = String(password || '');
  if (pw.length < 10) issues.push('at least 10 characters');
  if (!/[A-Za-z]/.test(pw)) issues.push('at least one letter');
  if (!/[0-9]/.test(pw)) issues.push('at least one number');
  return issues;
}

/* ---------------- cookies ---------------- */

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

const isHttps = (req) =>
  req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';

function cookie(req, value, maxAgeSeconds) {
  const bits = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`
  ];
  if (isHttps(req)) bits.push('Secure');
  return bits.join('; ');
}

/* ---------------- sessions ---------------- */

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export function createSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    hashToken(token),
    userId,
    nowIso(),
    expires.toISOString(),
    req.ip || null,
    String(req.headers['user-agent'] || '').slice(0, 250)
  );
  res.setHeader('Set-Cookie', cookie(req, token, SESSION_DAYS * 24 * 60 * 60));
  return token;
}

export function destroySession(req, res) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  res.setHeader('Set-Cookie', cookie(req, '', 0));
}

export function currentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const session = db
    .prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .get(hashToken(token), nowIso());
  if (!session) return null;
  const user = db
    .prepare(
      'SELECT id, name, email, role, phone, company, designation, project_id, active, must_change_password, last_login_at, created_at FROM users WHERE id = ?'
    )
    .get(session.user_id);
  if (!user || !user.active) return null;
  return user;
}

export function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.user || currentUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'You do not have permission for this action' });
    req.user = user;
    next();
  };
}

export const requireAdmin = requireRole('super_admin', 'admin');

/* ---------------- rate limiting (in-memory, per instance) ---------------- */

const buckets = new Map();
let limiterSeq = 0;

export function rateLimit({ windowMs = 60_000, max = 120, key = (req) => req.ip, message = 'Too many requests. Please slow down.' } = {}) {
  const scope = `rl${++limiterSeq}`;
  return (req, res, next) => {
    const bucketKey = `${scope}:${key(req) || 'anon'}`;
    const now = Date.now();
    let entry = buckets.get(bucketKey);
    if (!entry || entry.reset < now) {
      entry = { count: 0, reset: now + windowMs };
      buckets.set(bucketKey, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: message });
    }
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    }
    next();
  };
}

/* ---------------- user helpers ---------------- */

export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  company: user.company,
  designation: user.designation,
  project_id: user.project_id,
  must_change_password: !!user.must_change_password,
  last_login_at: user.last_login_at
});

export function recordLogin(user, req) {
  db.prepare('UPDATE users SET last_login_at = ?, failed_attempts = 0, updated_at = ? WHERE id = ?').run(
    nowIso(),
    nowIso(),
    user.id
  );
  audit(user, 'auth.login', 'users', user.id, null, req.ip);
}

export function adminCount() {
  return db.prepare("SELECT COUNT(*) AS c FROM users WHERE role IN ('super_admin','admin') AND active = 1").get().c;
}

export function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(String(email || '').trim());
}

export function isAdmin(user) {
  return !!user && isAdminRole(user.role);
}
