import React, { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Empty, ErrorNote, Field, Loading, useToast } from '../components/ui.jsx';
import { download, get, post } from '../lib/api.js';
import { useApi } from '../lib/data.js';
import { useAuth } from '../lib/auth.jsx';

const LANGS = [
  { key: 'en', label: 'English' },
  { key: 'hi', label: 'हिन्दी' },
  { key: 'both', label: 'English + Hindi' }
];

const SUGGESTIONS = [
  'What should a confined space entry permit checklist contain?',
  'Draft a toolbox talk on working at height for scaffolders.',
  'Explain how LTIFR is calculated with an example.',
  'List control measures for hot work near flammable material.'
];

export default function AI() {
  const toast = useToast();
  const { ai } = useAuth();
  const status = useApi('/api/ai/status');
  const types = useApi('/api/ai/doc-types');
  const [tab, setTab] = useState('chat');
  const [lang, setLang] = useState('en');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'I am AI Safety Hero. I can explain HSE requirements, draft JSA, HIRA, toolbox talks and checklists, and translate between English and Hindi. Tell me the activity, site conditions and equipment involved — I will ask for anything missing instead of assuming it.'
    }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const listRef = useRef(null);

  const docTypes = types.data?.types || [];
  const [gen, setGen] = useState({ doc_type: '', activity: '', details: '', instructions: '' });
  const [result, setResult] = useState(null);
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    if (docTypes.length && !gen.doc_type) setGen((g) => ({ ...g, doc_type: docTypes[0].key || docTypes[0] }));
  }, [docTypes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, busy]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError(null);
    try {
      const res = await post('/api/ai/chat', {
        messages: next.map((m) => ({ role: m.role, content: m.content })),
        lang,
        conversation_id: conversationId,
        prompt: content
      });
      if (res.conversation_id) setConversationId(res.conversation_id);
      setMessages([...next, { role: 'assistant', content: res.reply || res.content || 'No answer was returned.' }]);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const generate = async (e) => {
    e.preventDefault();
    setGenBusy(true);
    setGenError(null);
    try {
      const res = await post('/api/ai/generate', {
        doc_type: gen.doc_type,
        lang,
        instructions: gen.instructions,
        inputs: { activity: gen.activity, details: gen.details, topic: gen.activity }
      });
      setResult(res);
      toast.push('Draft generated');
    } catch (err) {
      setGenError(err);
    } finally {
      setGenBusy(false);
    }
  };

  const saveText = () => {
    const body = result?.content || result?.reply || '';
    const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result?.doc_type || 'ai-draft'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const enabled = status.data?.enabled ?? ai?.enabled ?? false;
  const provider = status.data?.provider || ai?.provider;
  const model = status.data?.model || ai?.model;

  return (
    <div className="col gap-lg">
      <header className="page-head">
        <div>
          <h1>AI Safety Hero</h1>
          <p className="muted small">
            Ask industrial safety questions, draft JSA/HIRA/toolbox talks, or translate between English and Hindi.
          </p>
        </div>
        <div className="row gap-xs wrap">
          {LANGS.map((l) => (
            <button key={l.key} type="button" className={`chip ${lang === l.key ? 'on' : ''}`} onClick={() => setLang(l.key)}>{l.label}</button>
          ))}
        </div>
      </header>

      <div className={`notice ${enabled ? 'ok' : ''}`}>
        {enabled ? (
          <span><b>Live AI connected.</b> Provider {provider || 'configured'}{model ? ` · ${model}` : ''}. Responses are drafts for review by a competent person.</span>
        ) : (
          <span>
            <b>Guided template mode.</b> No AI provider key is configured, so answers come from the built-in HSE knowledge base and
            document templates. Add <code>OPENAI_API_KEY</code> (or another supported provider key) in Settings → Environment
            variables to enable live model answers.
          </span>
        )}
      </div>

      <div className="tabs-row">
        <button type="button" className={`tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>Assistant chat</button>
        <button type="button" className={`tab ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>Document generator</button>
      </div>

      {tab === 'chat' && (
        <Card className="ai-card">
          <div className="chat-log" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                <div className="bubble-role">{m.role === 'user' ? 'You' : 'AI Safety Hero'}</div>
                <div className="bubble-body">{m.content}</div>
              </div>
            ))}
            {busy && (
              <div className="bubble assistant">
                <div className="bubble-role">AI Safety Hero</div>
                <div className="bubble-body typing"><span></span><span></span><span></span></div>
              </div>
            )}
          </div>
          <ErrorNote error={error} />
          <div className="row gap-xs wrap mt-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => send(s)} disabled={busy}>{s}</button>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <textarea
              rows={2}
              placeholder="Describe the activity, equipment and site conditions…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <Button variant="primary" type="submit" disabled={busy || !input.trim()}>{busy ? 'Thinking…' : 'Send'}</Button>
          </form>
          <p className="tiny muted mt-1">
            AI output can be incomplete or wrong. Verify against your site conditions, applicable law and approved procedures
            before any work starts. A generated permit or clearance is never authorisation to begin work.
          </p>
        </Card>
      )}

      {tab === 'generate' && (
        <div className="grid cols-2" style={{ alignItems: 'start' }}>
          <Card title="Generate a draft" subtitle="Pick the document, describe the job, add any site specifics.">
            <form className="col gap-md" onSubmit={generate}>
              <ErrorNote error={genError} />
              <Field label="Document type">
                {types.loading && !docTypes.length ? (
                  <Loading label="Loading types…" />
                ) : (
                  <select value={gen.doc_type} onChange={(e) => setGen({ ...gen, doc_type: e.target.value })} required>
                    <option value="">Select a document type…</option>
                    {docTypes.map((t) => (
                      <option key={t.key || t} value={t.key || t}>{t.label || t.name || t.key || t}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Activity or subject">
                <input value={gen.activity} onChange={(e) => setGen({ ...gen, activity: e.target.value })} placeholder="e.g. Erection of structural steel at 12 m height" required />
              </Field>
              <Field label="Site details, hazards and constraints">
                <textarea rows={4} value={gen.details} onChange={(e) => setGen({ ...gen, details: e.target.value })} placeholder="Plant area, equipment, manpower, shift, permit type, known hazards…" />
              </Field>
              <Field label="Extra instructions (optional)">
                <textarea rows={2} value={gen.instructions} onChange={(e) => setGen({ ...gen, instructions: e.target.value })} placeholder="e.g. Keep it to one page, add a Hindi summary" />
              </Field>
              <Button variant="primary" type="submit" disabled={genBusy}>{genBusy ? 'Generating…' : 'Generate draft'}</Button>
              <p className="tiny muted">Missing information is flagged as an open question rather than invented.</p>
            </form>
          </Card>

          <Card
            title="Draft output"
            actions={result && <button className="btn btn-outline btn-xs" type="button" onClick={saveText}>Download .md</button>}
          >
            {!result ? (
              <Empty icon="✨" title="Nothing generated yet" text="Choose a document type and describe the activity to produce a draft." />
            ) : (
              <div className="col gap-sm">
                <div className="row gap-xs wrap">
                  <Badge status="approved">{result.doc_type || gen.doc_type}</Badge>
                  {result.fallback && <Badge plain>template mode</Badge>}
                  {result.provider && <span className="tiny muted">{result.provider}{result.model ? ` · ${result.model}` : ''}</span>}
                </div>
                <pre className="doc-body">{result.content || result.reply || JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
