import { Router } from 'express';
import { db, nowIso, audit, getSetting } from '../db.js';
import { requireAuth, requireAdmin, currentUser } from '../auth.js';
import { TEMPLATES, TEMPLATE_MAP, TEMPLATE_CATEGORIES, renderTemplate } from '../templates.js';
import { pageParams } from '../util.js';

const router = Router();
const EDITOR_ROLES = ['super_admin', 'admin', 'hse_manager', 'safety_officer', 'safety_supervisor'];

const canEdit = (user, doc) => !!user && (EDITOR_ROLES.includes(user.role) || doc.created_by === user.id);
const canApprove = (user) => !!user && ['super_admin', 'admin', 'hse_manager'].includes(user.role);

const nextDocNo = (code) => {
  const year = new Date().getFullYear();
  const prefix = `${code}-${year}-`;
  const row = db.prepare('SELECT COUNT(*) c FROM documents WHERE doc_no LIKE ?').get(`${prefix}%`);
  return `${prefix}${String(row.c + 1).padStart(3, '0')}`;
};

const nextRevision = (rev) => {
  const r = String(rev || 'A');
  const chars = r.split('');
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] !== 'Z') {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      return chars.join('');
    }
    chars[i] = 'A';
    i -= 1;
  }
  return `A${chars.join('')}`;
};

router.use(requireAuth);

/* --------------------------------- catalogue -------------------------------- */

router.get('/templates', (req, res) => {
  res.json({
    templates: TEMPLATES.map((t) => ({
      key: t.key,
      title: t.title,
      category: t.category,
      code: t.code,
      sections: t.sections.map((s) => s[0]),
      preview: renderTemplate(t, { docNo: `${t.code}-PREVIEW`, revision: 'A', company: getSetting('org_name', 'SURAJ SAFETY HERO') })
    })),
    categories: TEMPLATE_CATEGORIES
  });
});

router.get('/categories', (req, res) => {
  const dbCats = db.prepare('SELECT category, COUNT(*) c FROM documents GROUP BY category ORDER BY category').all();
  res.json({ templateCategories: TEMPLATE_CATEGORIES, documentCategories: dbCats });
});

/* ---------------------------------- listing --------------------------------- */

router.get('/', (req, res) => {
  const { page, pageSize, offset } = pageParams(req.query);
  const where = [];
  const params = [];
  const q = String(req.query.q || '').trim();
  if (q) {
    where.push('(title LIKE ? OR doc_no LIKE ? OR content LIKE ? OR prepared_by LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (req.query.category) {
    where.push('category = ?');
    params.push(String(req.query.category));
  }
  if (req.query.status) {
    where.push('status = ?');
    params.push(String(req.query.status));
  }
  if (req.query.is_sample !== undefined) {
    where.push('is_sample = ?');
    params.push(req.query.is_sample === '1' ? 1 : 0);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) c FROM documents ${clause}`).get(...params).c;
  const rows = db
    .prepare(
      `SELECT id, doc_no, title, category, doc_type, template_key, revision, status, company, project_name,
              prepared_by, checked_by, approved_by, issue_date, review_date, is_sample, created_at, updated_at
       FROM documents ${clause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);
  res.json({ rows, total, page, pageSize, categories: TEMPLATE_CATEGORIES });
});

/* ----------------------------------- create --------------------------------- */

router.post('/', (req, res) => {
  const body = req.body || {};
  if (!EDITOR_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Your role cannot create controlled documents' });
  }
  const tpl = body.template_key ? TEMPLATE_MAP.get(String(body.template_key)) : null;
  if (body.template_key && !tpl) return res.status(400).json({ error: 'Unknown template' });
  const title = String(body.title || tpl?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Document title is required' });
  const category = String(body.category || tpl?.category || 'General').slice(0, 80);
  const docNo = body.doc_no ? String(body.doc_no).slice(0, 60) : nextDocNo(tpl?.code || 'DOC');
  const revision = String(body.revision || 'A').slice(0, 6);
  const company = String(body.company || getSetting('org_name', 'SURAJ SAFETY HERO'));
  const projectName = body.project_name ? String(body.project_name).slice(0, 160) : null;
  const issueDate = body.issue_date || new Date().toISOString().slice(0, 10);
  const reviewDate = body.review_date || null;

  const content =
    body.content && String(body.content).trim().length > 0
      ? String(body.content)
      : tpl
        ? renderTemplate(tpl, {
            docNo,
            revision,
            issueDate,
            reviewDate: reviewDate || '',
            company,
            project: projectName || '[Project / Site]',
            preparedBy: body.prepared_by || req.user.name,
            checkedBy: body.checked_by || '[Checked By]',
            approvedBy: body.approved_by || '[Approved By]'
          })
        : `# ${title}\n\n_Document body — edit this content._\n`;

  const now = nowIso();
  const info = db
    .prepare(
      `INSERT INTO documents (doc_no, title, category, doc_type, template_key, revision, status, content, company, project_id,
        project_name, prepared_by, checked_by, approved_by, issue_date, review_date, is_sample, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      docNo,
      title,
      category,
      tpl ? 'template' : 'free',
      tpl?.key || null,
      revision,
      content,
      company,
      body.project_id || null,
      projectName,
      body.prepared_by || req.user.name,
      body.checked_by || null,
      body.approved_by || null,
      issueDate,
      reviewDate,
      body.is_sample ? 1 : 0,
      req.user.id,
      now,
      now
    );
  db.prepare(
    'INSERT INTO document_versions (document_id, revision, content, status, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(info.lastInsertRowid, revision, content, 'draft', req.user.id, 'Initial creation', now);
  audit(req.user, 'document.create', 'documents', info.lastInsertRowid, `${docNo} ${title}`, req.ip);
  res.status(201).json({ row: db.prepare('SELECT * FROM documents WHERE id = ?').get(info.lastInsertRowid) });
});

/* ------------------------------------ read ---------------------------------- */

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Document not found' });
  const versions = db
    .prepare(
      `SELECT v.id, v.revision, v.status, v.change_note, v.created_at, u.name AS changed_by_name
       FROM document_versions v LEFT JOIN users u ON u.id = v.changed_by WHERE v.document_id = ? ORDER BY v.id DESC`
    )
    .all(row.id);
  res.json({ row, versions, canEdit: canEdit(req.user, row), canApprove: canApprove(req.user) });
});

/* ----------------------------------- update --------------------------------- */

router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (!canEdit(req.user, doc)) return res.status(403).json({ error: 'You cannot edit this document' });
  if (doc.status === 'approved' && !canApprove(req.user)) {
    return res.status(403).json({ error: 'Approved documents can only be revised by HSE management' });
  }
  const body = req.body || {};
  const fields = [];
  const values = [];
  ['title', 'category', 'company', 'project_name', 'prepared_by', 'checked_by', 'approved_by', 'issue_date', 'review_date', 'content'].forEach((f) => {
    if (body[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(body[f] === '' ? null : String(body[f]).slice(0, 40000));
    }
  });
  if (body.status !== undefined) {
    const allowed = ['draft', 'pending_approval', 'approved', 'obsolete'];
    if (!allowed.includes(body.status)) return res.status(400).json({ error: 'Invalid status' });
    if (body.status === 'approved' && !canApprove(req.user)) return res.status(403).json({ error: 'Only HSE management can approve documents' });
    fields.push('status = ?');
    values.push(body.status);
  }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  db.prepare(`UPDATE documents SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`).run(...values, nowIso(), id);
  if (body.content !== undefined) {
    db.prepare('INSERT INTO document_versions (document_id, revision, content, status, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id,
      doc.revision,
      String(body.content),
      body.status || doc.status,
      req.user.id,
      body.change_note ? String(body.change_note).slice(0, 300) : 'Content updated',
      nowIso()
    );
  }
  audit(req.user, 'document.update', 'documents', id, `${doc.doc_no} updated`, req.ip);
  res.json({ row: db.prepare('SELECT * FROM documents WHERE id = ?').get(id) });
});

router.post('/:id/revise', (req, res) => {
  const id = Number(req.params.id);
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (!canEdit(req.user, doc)) return res.status(403).json({ error: 'You cannot revise this document' });
  const body = req.body || {};
  const revision = nextRevision(doc.revision);
  const content = body.content !== undefined ? String(body.content) : doc.content;
  const now = nowIso();
  db.prepare("UPDATE documents SET revision = ?, content = ?, status = 'draft', updated_at = ?, issue_date = ? WHERE id = ?").run(
    revision,
    content,
    now,
    body.issue_date || new Date().toISOString().slice(0, 10),
    id
  );
  db.prepare('INSERT INTO document_versions (document_id, revision, content, status, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id,
    revision,
    content,
    'draft',
    req.user.id,
    body.change_note ? String(body.change_note).slice(0, 300) : 'Revision issued',
    now
  );
  audit(req.user, 'document.revise', 'documents', id, `${doc.doc_no} revised to ${revision}`, req.ip);
  res.json({ row: db.prepare('SELECT * FROM documents WHERE id = ?').get(id) });
});

router.post('/:id/approve', (req, res) => {
  const id = Number(req.params.id);
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (!canApprove(req.user)) return res.status(403).json({ error: 'Only HSE management can approve documents' });
  const now = nowIso();
  db.prepare("UPDATE documents SET status = 'approved', approved_by = ?, updated_at = ? WHERE id = ?").run(req.user.name, now, id);
  db.prepare('INSERT INTO document_versions (document_id, revision, content, status, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id,
    doc.revision,
    doc.content,
    'approved',
    req.user.id,
    (req.body || {}).note ? String(req.body.note).slice(0, 300) : 'Approved',
    now
  );
  audit(req.user, 'document.approve', 'documents', id, `${doc.doc_no} approved`, req.ip);
  res.json({ row: db.prepare('SELECT * FROM documents WHERE id = ?').get(id) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  audit(req.user, 'document.delete', 'documents', id, `${doc.doc_no} deleted`, req.ip);
  res.json({ ok: true });
});

/* ----------------------------------- export --------------------------------- */

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function markdownToHtml(md) {
  const lines = String(md).split('\n');
  const out = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const listItem = /^\s*[-*]\s+(.*)$/.exec(line);
    if (listItem) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${escapeHtml(listItem[1]).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`);
      continue;
    }
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
    if (!line.trim()) {
      out.push('');
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${escapeHtml(h[2])}</h${level}>`);
      continue;
    }
    if (/^\|/.test(line)) {
      out.push(`<div class="tbl">${escapeHtml(line)}</div>`);
      continue;
    }
    out.push(`<p>${escapeHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

router.get('/:id/export', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(Number(req.params.id));
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const format = String(req.query.format || 'md');
  audit(req.user, 'document.export', 'documents', doc.id, `Exported ${doc.doc_no} as ${format}`, req.ip);
  const safeName = `${doc.doc_no}-Rev${doc.revision}`.replace(/[^A-Za-z0-9._-]/g, '_');
  if (format === 'html' || format === 'pdf') {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;max-width:820px;margin:32px auto;padding:0 24px;color:#10243A;line-height:1.55}
h1{font-size:24px;border-bottom:3px solid #FF7900;padding-bottom:8px}
h2{font-size:17px;color:#1769AA;margin-top:26px}
table,div.tbl{font-family:ui-monospace,monospace;font-size:12px}
.badge{display:inline-block;background:#F3F6FA;border:1px solid #d8e2ee;border-radius:6px;padding:4px 10px;font-size:12px;font-family:Arial,sans-serif}
@media print{body{margin:0}}
</style></head><body>
<div class="badge">${escapeHtml(doc.company || 'SURAJ SAFETY HERO')} · ${escapeHtml(doc.status.toUpperCase())} · Rev ${escapeHtml(doc.revision)}</div>
${markdownToHtml(doc.content || '')}
</body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `${format === 'pdf' ? 'inline' : 'attachment'}; filename="${safeName}.html"`);
    return res.send(html);
  }
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.md"`);
  res.send(doc.content || '');
});

export default router;
