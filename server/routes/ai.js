import { Router } from 'express';
import { db, nowIso } from '../db.js';
import { currentUser, requireAuth, rateLimit } from '../auth.js';
import { aiStatus, chat, generate, DOC_TYPES } from '../ai.js';
import { safeJson } from '../util.js';

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 40,
  key: (req) => `ai:${req.ip}`,
  message: 'AI request limit reached for a few minutes. Please wait and try again.'
});

router.get('/status', (req, res) => res.json(aiStatus()));

router.get('/doc-types', (req, res) => res.json({ types: DOC_TYPES }));

router.post('/chat', aiLimiter, async (req, res) => {
  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lang = ['en', 'hi', 'both'].includes(body.lang) ? body.lang : 'en';
  if (!messages.length && !body.prompt) return res.status(400).json({ error: 'Send a message to the assistant' });
  if (messages.length > 20) return res.status(400).json({ error: 'Conversation is too long. Start a new chat.' });

  const result = await chat({ messages, lang, docType: body.doc_type, inputs: body.inputs || {}, prompt: body.prompt });

  const viewer = currentUser(req);
  let conversationId = null;
  if (viewer) {
    const history = [...messages.slice(-12), { role: 'assistant', content: result.content }];
    if (body.conversation_id) {
      const existing = db.prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?').get(Number(body.conversation_id), viewer.id);
      if (existing) {
        db.prepare('UPDATE ai_conversations SET messages = ?, mode = ?, provider = ?, updated_at = ? WHERE id = ?').run(
          JSON.stringify(history),
          result.mode,
          result.provider,
          nowIso(),
          existing.id
        );
        conversationId = existing.id;
      }
    }
    if (!conversationId) {
      const first = messages.find((m) => m.role === 'user');
      const title = String(first?.content || body.prompt || 'Safety question').slice(0, 90);
      const info = db
        .prepare('INSERT INTO ai_conversations (user_id, title, mode, provider, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(viewer.id, title, result.mode, result.provider, JSON.stringify(history), nowIso(), nowIso());
      conversationId = info.lastInsertRowid;
    }
  }

  res.json({
    content: result.content,
    provider: result.provider,
    model: result.model,
    mode: result.mode,
    fallback: !!result.fallback,
    conversation_id: conversationId,
    warning: result.error || null
  });
});

router.post('/generate', aiLimiter, async (req, res) => {
  const body = req.body || {};
  const result = await generate({
    docType: body.doc_type || 'jsa',
    inputs: body.inputs || {},
    lang: ['en', 'hi', 'both'].includes(body.lang) ? body.lang : 'en',
    instructions: body.instructions ? String(body.instructions).slice(0, 2000) : ''
  });
  res.json({ ...result, generated_at: nowIso() });
});

router.get('/conversations', requireAuth, (req, res) => {
  const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
  const rows = db
    .prepare(
      `SELECT id, title, mode, provider, created_at, updated_at FROM ai_conversations ${isAdmin ? '' : 'WHERE user_id = ?'} ORDER BY updated_at DESC LIMIT 60`
    )
    .all(...(isAdmin ? [] : [req.user.id]));
  res.json({ rows });
});

router.get('/conversations/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Conversation not found' });
  const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
  if (row.user_id !== req.user.id && !isAdmin) return res.status(403).json({ error: 'Not your conversation' });
  res.json({ row: { ...row, messages: safeJson(row.messages, []) } });
});

router.delete('/conversations/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Conversation not found' });
  const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
  if (row.user_id !== req.user.id && !isAdmin) return res.status(403).json({ error: 'Not your conversation' });
  db.prepare('DELETE FROM ai_conversations WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

export default router;
