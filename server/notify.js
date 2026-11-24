/** Automated HSE alert generation: expiries, overdue actions, permit validity. */
import { db, nowIso } from './db.js';

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

function push({ userId = null, roleTarget = null, title, body, category, link, severity = 'warning', dedupeKey }) {
  const existing = dedupeKey
    ? db.prepare('SELECT id FROM notifications WHERE dedupe_key = ?').get(dedupeKey)
    : null;
  if (existing) return 0;
  db.prepare(
    `INSERT INTO notifications (user_id, role_target, title, body, category, link, severity, dedupe_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, roleTarget, title, body, category, link, severity, dedupeKey, nowIso());
  return 1;
}

export function runAlertScan() {
  const now = today();
  const soon = addDays(14);
  let created = 0;

  const permitRows = db
    .prepare("SELECT id, ref_no, title, valid_to FROM permits WHERE status = 'active' AND valid_to IS NOT NULL AND valid_to <= ?")
    .all(soon);
  for (const row of permitRows) {
    created += push({
      roleTarget: 'hse_staff',
      title: `Permit ${row.ref_no} expires ${row.valid_to}`,
      body: `${row.title || 'Permit to work'} reaches its validity limit on ${row.valid_to}. Verify closure, extension or suspension with the permit issuer.`,
      category: 'permit',
      link: '/app/permits',
      severity: row.valid_to <= now ? 'critical' : 'warning',
      dedupeKey: `permit-expiry-${row.id}-${row.valid_to}`
    });
  }

  const trainingRows = db
    .prepare("SELECT id, ref_no, title, expiry_date FROM training_records WHERE expiry_date IS NOT NULL AND expiry_date <= ?")
    .all(soon);
  for (const row of trainingRows) {
    created += push({
      roleTarget: 'hse_staff',
      title: `Training expires ${row.expiry_date}`,
      body: `${row.title || 'Training'} competency expires on ${row.expiry_date}. Schedule refresher training.`,
      category: 'training',
      link: '/app/training',
      severity: row.expiry_date <= now ? 'critical' : 'warning',
      dedupeKey: `training-expiry-${row.id}-${row.expiry_date}`
    });
  }

  const ppeRows = db
    .prepare("SELECT id, ref_no, title, expiry_date FROM ppe_records WHERE expiry_date IS NOT NULL AND expiry_date <= ?")
    .all(soon);
  for (const row of ppeRows) {
    created += push({
      roleTarget: 'hse_staff',
      title: `PPE replacement due ${row.expiry_date}`,
      body: `PPE record ${row.ref_no} reaches its replacement date on ${row.expiry_date}. Inspect and replace if required.`,
      category: 'ppe',
      link: '/app/ppe',
      severity: row.expiry_date <= now ? 'critical' : 'warning',
      dedupeKey: `ppe-expiry-${row.id}-${row.expiry_date}`
    });
  }

  const equipmentRows = db
    .prepare("SELECT id, ref_no, title, next_due FROM equipment_records WHERE next_due IS NOT NULL AND next_due <= ?")
    .all(soon);
  for (const row of equipmentRows) {
    created += push({
      roleTarget: 'hse_staff',
      title: `Equipment inspection due ${row.next_due}`,
      body: `${row.title || 'Equipment'} inspection is due on ${row.next_due}. Take the item out of service if the certificate lapses.`,
      category: 'equipment',
      link: '/app/equipment',
      severity: row.next_due <= now ? 'critical' : 'warning',
      dedupeKey: `equip-due-${row.id}-${row.next_due}`
    });
  }

  const fireRows = db
    .prepare("SELECT id, ref_no, title, next_due FROM fire_equipment WHERE next_due IS NOT NULL AND next_due <= ?")
    .all(soon);
  for (const row of fireRows) {
    created += push({
      roleTarget: 'hse_staff',
      title: `Fire equipment service due ${row.next_due}`,
      body: `${row.title || 'Fire equipment'} ${row.ref_no} is due for inspection/service on ${row.next_due}.`,
      category: 'fire',
      link: '/app/fire',
      severity: row.next_due <= now ? 'critical' : 'warning',
      dedupeKey: `fire-due-${row.id}-${row.next_due}`
    });
  }

  const capaRows = db
    .prepare("SELECT id, ref_no, title, due_date FROM capa_records WHERE status NOT IN ('closed','rejected') AND due_date IS NOT NULL AND due_date <= ?")
    .all(addDays(3));
  for (const row of capaRows) {
    created += push({
      roleTarget: 'hse_staff',
      title: `CAPA ${row.ref_no} due ${row.due_date}`,
      body: `${row.title || 'Corrective action'} is due on ${row.due_date}. Update the action or escalate.`,
      category: 'capa',
      link: '/app/capa',
      severity: row.due_date <= now ? 'critical' : 'warning',
      dedupeKey: `capa-due-${row.id}-${row.due_date}`
    });
  }

  const inspectionRows = db
    .prepare("SELECT id, ref_no, title, next_due FROM inspections WHERE next_due IS NOT NULL AND next_due <= ?")
    .all(soon);
  for (const row of inspectionRows) {
    created += push({
      roleTarget: 'hse_staff',
      title: `Inspection due ${row.next_due}`,
      body: `${row.title || 'Inspection'} ${row.ref_no} is scheduled for ${row.next_due}.`,
      category: 'inspection',
      link: '/app/inspections',
      severity: 'info',
      dedupeKey: `insp-due-${row.id}-${row.next_due}`
    });
  }

  const jobRows = db
    .prepare("SELECT id, title, company, expiry_date FROM jobs WHERE status = 'published' AND expiry_date IS NOT NULL AND expiry_date <= ?")
    .all(addDays(7));
  for (const row of jobRows) {
    created += push({
      roleTarget: 'all',
      title: `Job listing closing ${row.expiry_date}`,
      body: `${row.title} closes on ${row.expiry_date}.`,
      category: 'job',
      link: '/jobs',
      severity: 'info',
      dedupeKey: `job-expiry-${row.id}-${row.expiry_date}`
    });
  }

  return { created, scanned_at: nowIso() };
}

export function unreadFor(user) {
  if (!user) return 0;
  return db
    .prepare(
      `SELECT COUNT(*) AS c FROM notifications
       WHERE read_at IS NULL AND (user_id = ? OR role_target = 'all' OR (role_target = 'hse_staff' AND ? IN ('super_admin','admin','hse_manager','safety_officer','safety_supervisor')))`
    )
    .get(user.id, user.role).c;
}
