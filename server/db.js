import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { MODULES } from './registry.js';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'safety-hero.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const nowIso = () => new Date().toISOString();

const CORE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  phone TEXT,
  company TEXT,
  designation TEXT,
  project_id INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT,
  client TEXT,
  location TEXT,
  state TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  site_type TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_no TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'template',
  template_key TEXT,
  revision TEXT NOT NULL DEFAULT 'A',
  status TEXT NOT NULL DEFAULT 'draft',
  content TEXT,
  company TEXT,
  project_id INTEGER,
  project_name TEXT,
  prepared_by TEXT,
  checked_by TEXT,
  approved_by TEXT,
  issue_date TEXT,
  review_date TEXT,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  content TEXT,
  status TEXT,
  changed_by INTEGER,
  change_note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  category TEXT NOT NULL,
  state TEXT,
  city TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  experience_min INTEGER,
  experience_max INTEGER,
  qualification TEXT,
  job_type TEXT NOT NULL DEFAULT 'private',
  description TEXT,
  apply_url TEXT,
  contact_email TEXT,
  source TEXT,
  source_verified INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  expiry_date TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id INTEGER,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  experience_years INTEGER,
  qualification TEXT,
  resume_text TEXT,
  cover_note TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  role_target TEXT,
  title TEXT NOT NULL,
  body TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  link TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  dedupe_key TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_email TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  details TEXT,
  ip TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT,
  mode TEXT,
  provider TEXT,
  messages TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  enquiry_type TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT NOT NULL,
  owner_id INTEGER,
  filename TEXT NOT NULL,
  mime TEXT,
  size INTEGER,
  content TEXT,
  uploaded_by INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
`;

const STANDARD_COLUMNS = [
  ['id', 'INTEGER PRIMARY KEY AUTOINCREMENT'],
  ['ref_no', 'TEXT'],
  ['title', 'TEXT'],
  ['status', "TEXT DEFAULT 'draft'"],
  ['project_id', 'INTEGER'],
  ['site_id', 'INTEGER'],
  ['created_by', 'INTEGER'],
  ['created_at', 'TEXT'],
  ['updated_at', 'TEXT'],
  ['approved_by', 'INTEGER'],
  ['approved_at', 'TEXT'],
  ['approval_note', 'TEXT']
];

const columnType = (field) => (field.type === 'number' ? 'REAL' : 'TEXT');

export function initSchema() {
  db.exec(CORE_SCHEMA);

  for (const mod of MODULES) {
    const cols = [
      ...STANDARD_COLUMNS,
      ...mod.fields.map((field) => [field.name, columnType(field)])
    ];
    db.exec(`CREATE TABLE IF NOT EXISTS ${mod.table} (${cols.map(([n, t]) => `${n} ${t}`).join(', ')})`);

    const existing = new Set(db.prepare(`PRAGMA table_info(${mod.table})`).all().map((c) => c.name));
    for (const field of mod.fields) {
      if (!existing.has(field.name)) {
        db.exec(`ALTER TABLE ${mod.table} ADD COLUMN ${field.name} ${columnType(field)}`);
      }
    }
    db.exec(`CREATE INDEX IF NOT EXISTS idx_${mod.table}_status ON ${mod.table}(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_${mod.table}_project ON ${mod.table}(project_id)`);
  }
}

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).run(key, value == null ? null : String(value), nowIso());
}

export function audit(user, action, entity, entityId, details, ip) {
  try {
    db.prepare(
      'INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      user ? user.id : null,
      user ? user.email : null,
      action,
      entity || null,
      entityId == null ? null : String(entityId),
      details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
      ip || null,
      nowIso()
    );
  } catch {
    /* auditing must never break the request */
  }
}

export const dbPath = DB_PATH;
