/** Shared helpers: validation, CSV export, pagination. */
import { MODULES } from './registry.js';

export const clampInt = (value, min, max, fallback) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

export function pageParams(query = {}) {
  const page = clampInt(query.page, 1, 100000, 1);
  const pageSize = clampInt(query.pageSize, 1, 200, 25);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows, columns) {
  const head = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => csvEscape(row[c.name])).join(','))
    .join('\r\n');
  return `${head}\r\n${body}\r\n`;
}

export const csvHeaders = (filename) => ({
  'Content-Type': 'text/csv; charset=utf-8',
  'Content-Disposition': `attachment; filename="${filename}"`
});

/** Validate + coerce a payload against module field definitions. */
export function validateRow(mod, body, { partial = false } = {}) {
  const errors = [];
  const values = {};
  for (const field of mod.fields) {
    const has = Object.prototype.hasOwnProperty.call(body, field.name);
    if (!has) {
      if (!partial && field.required) errors.push(`${field.label} is required`);
      continue;
    }
    let value = body[field.name];
    if (value === '' || value === undefined) value = null;
    if (field.type === 'number' && value !== null) {
      const n = Number(value);
      if (Number.isNaN(n)) {
        errors.push(`${field.label} must be a number`);
        continue;
      }
      if (field.min !== undefined && n < field.min) errors.push(`${field.label} must be at least ${field.min}`);
      if (field.max !== undefined && n > field.max) errors.push(`${field.label} must be at most ${field.max}`);
      value = n;
    }
    if (field.type === 'select' && value !== null && field.options && !field.options.includes(value)) {
      errors.push(`${field.label} must be one of: ${field.options.join(', ')}`);
      continue;
    }
    if (typeof value === 'string' && value.length > 20000) {
      errors.push(`${field.label} is too long`);
      continue;
    }
    if (value === null && field.required && !partial) errors.push(`${field.label} is required`);
    values[field.name] = value;
  }
  return { values, errors };
}

export function canRead(mod, user) {
  if (!mod || !user) return false;
  if (['super_admin', 'admin'].includes(user.role)) return true;
  return mod.readRoles.includes(user.role);
}

export function canWrite(mod, user) {
  if (!mod || !user) return false;
  if (['super_admin', 'admin'].includes(user.role)) return true;
  return mod.writeRoles.includes(user.role);
}

export function canApprove(mod, user) {
  if (!mod || !user) return false;
  if (['super_admin', 'admin'].includes(user.role)) return true;
  return mod.approveRoles.includes(user.role);
}

/** Records a restricted user may see: their project, or what they created. */
export function scopeClause(mod, user, alias = 't') {
  if (!user) return { sql: '1=0', params: [] };
  if (['super_admin', 'admin', 'hse_manager'].includes(user.role)) return { sql: '1=1', params: [] };
  if (user.project_id) {
    return { sql: `(${alias}.project_id = ? OR ${alias}.project_id IS NULL OR ${alias}.created_by = ?)`, params: [user.project_id, user.id] };
  }
  if (['safety_officer', 'safety_supervisor', 'site_engineer'].includes(user.role)) return { sql: '1=1', params: [] };
  return { sql: `(${alias}.created_by = ? OR ${alias}.project_id IS NULL)`, params: [user.id] };
}

export const nextRefNo = (db, mod) => {
  const row = db.prepare(`SELECT ref_no FROM ${mod.table} WHERE ref_no LIKE ? ORDER BY id DESC LIMIT 1`).get(`${mod.prefix}-%`);
  const last = row && row.ref_no ? Number.parseInt(String(row.ref_no).split('-').pop(), 10) : 0;
  const next = Number.isNaN(last) ? 1 : last + 1;
  return `${mod.prefix}-${String(next).padStart(4, '0')}`;
};

export const moduleByKey = (key) => MODULES.find((m) => m.key === key) || null;

export const safeJson = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const publicModules = (user) =>
  MODULES.map((mod) => ({
    key: mod.key,
    table: mod.table,
    name: mod.name,
    short: mod.short,
    prefix: mod.prefix,
    group: mod.group,
    icon: mod.icon,
    description: mod.description,
    statuses: mod.statuses,
    fields: mod.fields,
    canRead: canRead(mod, user),
    canWrite: canWrite(mod, user),
    canApprove: canApprove(mod, user)
  }));
