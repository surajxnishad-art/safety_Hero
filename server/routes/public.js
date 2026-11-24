import { Router } from 'express';
import { db, nowIso, getSetting, audit } from '../db.js';
import { rateLimit } from '../auth.js';
import { MODULES } from '../registry.js';
import { TEMPLATES } from '../templates.js';
import { aiStatus } from '../ai.js';

const router = Router();

router.get('/health', (req, res) => {
  const row = db.prepare('SELECT 1 AS ok').get();
  res.json({ ok: !!row.ok, time: nowIso(), ai: aiStatus().enabled, version: '2.0.0' });
});

router.get('/summary', (req, res) => {
  const one = (sql, ...p) => db.prepare(sql).get(...p).c;
  res.json({
    org: {
      name: getSetting('org_name', 'SURAJ SAFETY HERO'),
      tagline: getSetting('org_tagline', 'SMART SAFETY • ZERO HARM • SAFER FUTURE'),
      phone: getSetting('owner_phone', '8933808934'),
      email: getSetting('owner_email', 'its.surajsahani@gmail.com')
    },
    stats: {
      modules: MODULES.length,
      templates: TEMPLATES.length,
      documents: one('SELECT COUNT(*) c FROM documents'),
      published_jobs: one("SELECT COUNT(*) c FROM jobs WHERE status = 'published'"),
      projects: one('SELECT COUNT(*) c FROM projects'),
      records: MODULES.reduce((sum, m) => sum + one(`SELECT COUNT(*) c FROM ${m.table}`), 0)
    },
    demo_data: getSetting('demo_data', '0') === '1',
    ai: aiStatus(),
    notice:
      'AI outputs and template documents are drafts for review by a qualified competent person. They never authorise work or certify legal compliance.'
  });
});

router.post('/contact', rateLimit({ windowMs: 60 * 60_000, max: 8, message: 'Too many enquiries from this network. Please try again later.' }), (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const message = String(body.message || '').trim();
  const type = ['general', 'career', 'job', 'resume', 'support'].includes(body.type) ? body.type : 'general';
  if (name.length < 2) return res.status(400).json({ error: 'Please share your name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Please share a valid email address' });
  if (message.length < 10) return res.status(400).json({ error: 'Please describe your enquiry (at least 10 characters)' });
  const info = db
    .prepare(
      `INSERT INTO contact_enquiries (name, email, phone, subject, enquiry_type, message, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'new', ?)`
    )
    .run(name, email, body.phone ? String(body.phone).slice(0, 30) : null, body.subject ? String(body.subject).slice(0, 200) : null, type, message.slice(0, 5000), nowIso());
  db.prepare(
    `INSERT INTO notifications (role_target, title, body, category, link, severity, created_at)
     VALUES ('hse_staff', ?, ?, 'enquiry', '/admin/enquiries', 'info', ?)`
  ).run(`New ${type} enquiry`, `${name} (${email}) sent a message.`, nowIso());
  audit(null, 'contact.submit', 'contact_enquiries', info.lastInsertRowid, `${type} enquiry from ${email}`, req.ip);
  res.status(201).json({ ok: true, message: 'Thank you. Your enquiry has been recorded and will be reviewed by the Suraj Safety Hero team.' });
});

router.get('/modules', (req, res) => {
  res.json({
    modules: MODULES.map((m) => ({
      key: m.key,
      title: m.title,
      short: m.short || m.title,
      group: m.group,
      icon: m.icon,
      description: m.description,
      prefix: m.prefix,
      fields: m.fields,
      statuses: m.statuses || [],
      approvable: !!m.approvable,
      riskModule: !!m.riskModule,
      roles: m.writeRoles
    }))
  });
});

router.get('/templates', (req, res) => {
  res.json({
    templates: TEMPLATES.map((t) => ({ key: t.key, title: t.title, category: t.category, code: t.code, sections: t.sections.map((s) => s[0]) }))
  });
});

export default router;
