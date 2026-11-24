/**
 * SURAJ SAFETY HERO - AI Safety Hero engine.
 *
 * Uses a real provider when a server-side key is configured (OPENAI_API_KEY,
 * GROQ_API_KEY, ANTHROPIC_API_KEY or GOOGLE_API_KEY / GEMINI_API_KEY).
 * Without a key it returns clearly-labelled structured templates instead of
 * pretending to be an AI answer. It never authorizes work.
 */

const PROVIDERS = [
  {
    id: 'openai',
    env: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o-mini',
    url: 'https://api.openai.com/v1/chat/completions',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
    body: (model, messages) => ({ model, messages, temperature: 0.3, max_tokens: 2000 }),
    parse: (json) => json?.choices?.[0]?.message?.content
  },
  {
    id: 'groq',
    env: 'GROQ_API_KEY',
    modelEnv: 'GROQ_MODEL',
    defaultModel: 'llama-3.3-70b-versatile',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
    body: (model, messages) => ({ model, messages, temperature: 0.3, max_tokens: 2000 }),
    parse: (json) => json?.choices?.[0]?.message?.content
  },
  {
    id: 'anthropic',
    env: 'ANTHROPIC_API_KEY',
    modelEnv: 'ANTHROPIC_MODEL',
    defaultModel: 'claude-3-5-haiku-latest',
    url: 'https://api.anthropic.com/v1/messages',
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    body: (model, messages) => ({
      model,
      max_tokens: 2000,
      system: messages.find((m) => m.role === 'system')?.content,
      messages: messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
    }),
    parse: (json) => json?.content?.map((part) => part.text || '').join('\n')
  },
  {
    id: 'gemini',
    env: 'GOOGLE_API_KEY',
    altEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    defaultModel: 'gemini-2.0-flash',
    url: (model, key) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    headers: () => ({ 'Content-Type': 'application/json' }),
    body: (model, messages) => ({
      systemInstruction: { parts: [{ text: messages.find((m) => m.role === 'system')?.content || '' }] },
      contents: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
    }),
    parse: (json) => json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n')
  }
];

export function activeProvider() {
  for (const provider of PROVIDERS) {
    const key = process.env[provider.env] || (provider.altEnv ? process.env[provider.altEnv] : null);
    if (key && String(key).trim()) {
      return { ...provider, key: String(key).trim() };
    }
  }
  return null;
}

export function aiStatus() {
  const provider = activeProvider();
  return {
    enabled: !!provider,
    provider: provider ? provider.id : null,
    model: provider ? process.env[provider.modelEnv] || provider.defaultModel : null,
    mode: provider ? 'provider' : 'template',
    note: provider
      ? `Connected to the ${provider.id} API using a server-side key.`
      : 'No AI provider key is configured. The assistant answers with structured HSE templates and questions instead of live AI output. Add a provider key in Settings → Environment variables to enable live answers.'
  };
}

const SAFETY_RULES = `Non-negotiable rules:
- You are an industrial HSE assistant for Indian industry (Factories Act, state factory rules, OSHWC Code where notified, BIS, ISO 45001/14001, ILO guidance). Never invent clause numbers or legal citations; say "verify the current text" when unsure.
- Never state that a permit, isolation, JSA, or work activity is authorised or safe to start. Only authorised site personnel can approve work.
- When site-specific facts are missing, ask short numbered questions instead of inventing conditions, measurements or approvals.
- Every deliverable must state that a qualified competent person must review it before implementation.
- Use markdown with clear headings and tables. Be concise and practical.`;

const LANG_RULE = (lang) =>
  lang === 'hi'
    ? 'Reply in clear Hindi (Devanagari). Keep technical terms in English where standard, e.g. "Permit to Work".'
    : lang === 'both'
      ? 'Reply bilingually: English first, then a Hindi (Devanagari) summary of the key points.'
      : 'Reply in clear professional English.';

export function systemPrompt(lang = 'en') {
  return `You are "AI Safety Hero", the industrial safety and HSE expert inside the SURAJ SAFETY HERO platform.

${SAFETY_RULES}
${LANG_RULE(lang)}`;
}

async function callProvider(provider, messages) {
  const model = process.env[provider.modelEnv] || provider.defaultModel;
  const url = typeof provider.url === 'function' ? provider.url(model, provider.key) : provider.url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...provider.headers(provider.key) },
      body: JSON.stringify(provider.body(model, messages)),
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Provider responded ${response.status}: ${detail.slice(0, 300)}`);
    }
    const json = await response.json();
    const content = provider.parse(json);
    if (!content || !String(content).trim()) throw new Error('Provider returned an empty answer');
    return { content: String(content).trim(), model };
  } finally {
    clearTimeout(timer);
  }
}

/* --------------------------- template-mode answers --------------------------- */

const QUESTIONS = [
  'What is the exact activity, location and site/project?',
  'How many workers are involved and what trades/competency do they hold?',
  'What equipment, plant and energy sources are involved?',
  'Which permits, isolations and gas tests are required for this work?',
  'What are the site-specific hazards, adjacent activities and emergency arrangements?'
];

const DOC_BLUEPRINTS = {
  jsa: {
    title: 'Job Safety Analysis (JSA)',
    columns: '| # | Job Step | Hazards | Potential Consequence | Risk (S x L) | Control Measures | Required PPE | Responsible |',
    steps: ['Pre-task briefing and permit verification', 'Area preparation and isolation', 'Execution of the main task', 'Inspection and testing', 'Housekeeping and handover']
  },
  hira: {
    title: 'Hazard Identification & Risk Assessment (HIRA)',
    columns: '| # | Activity | Hazard | Consequence | Severity (1-5) | Likelihood (1-5) | Risk | Control Measures | Residual Risk |',
    steps: ['Site/area walkthrough', 'Activity breakdown', 'Hazard identification', 'Risk scoring', 'Control selection', 'Residual risk and review']
  },
  risk: {
    title: 'Risk Assessment',
    columns: '| Hazard | Consequence | S | L | Score | Band | Controls (hierarchy) | Residual Score | Owner |',
    steps: ['Define activity scope', 'Identify hazards', 'Score severity and likelihood', 'Apply hierarchy of controls', 'Record residual risk']
  },
  method: {
    title: 'Method Statement',
    columns: '| Step | Activity | Resources | Controls | Hold Point |',
    steps: ['Scope and sequence', 'Resources and competency', 'HSE controls and permits', 'Emergency arrangements', 'Records']
  },
  sop: {
    title: 'Standard Operating Procedure (SOP)',
    columns: '| Step | Action | Responsibility | Record |',
    steps: ['Purpose and scope', 'Prerequisites', 'Step-by-step procedure', 'Abnormal and emergency actions', 'Records and review']
  },
  toolbox: {
    title: 'Toolbox Talk',
    columns: '| Point | Key Message | Site Example |',
    steps: ['Topic and objective', 'Key hazards today', 'Controls to apply', 'Worker questions', 'Attendance and sign-off']
  },
  training: {
    title: 'Safety Training Session Plan',
    columns: '| Module | Content | Duration | Method | Assessment |',
    steps: ['Objective and audience', 'Content outline', 'Delivery method', 'Evaluation', 'Records and refresher cycle']
  },
  checklist: {
    title: 'Inspection Checklist',
    columns: '| # | Check Point | Requirement | C/NC/NA | Observation | Action |',
    steps: ['Scope and frequency', 'Check points', 'Acceptance criteria', 'Findings and actions', 'Closure verification']
  },
  incident: {
    title: 'Incident Investigation Report',
    columns: '| Time | Event | Evidence | Person |',
    steps: ['Incident summary', 'Timeline of events', 'Evidence and witness statements', 'Immediate and root causes', 'Corrective and preventive actions']
  },
  rca: {
    title: 'Root Cause Analysis',
    columns: '| Why | Finding | Evidence |',
    steps: ['Problem statement', '5 Why analysis', 'Fishbone (man/machine/material/method/measurement/environment)', 'Root causes', 'Actions and verification']
  },
  capa: {
    title: 'Corrective & Preventive Action Plan',
    columns: '| # | Action | Type | Owner | Target Date | Verification |',
    steps: ['Finding and source', 'Root cause', 'Corrective action', 'Preventive action', 'Effectiveness verification']
  },
  erp: {
    title: 'Emergency Response Plan',
    columns: '| Scenario | Detection | Response | Team | Resource |',
    steps: ['Site and emergency contacts', 'Credible scenarios', 'Response organisation', 'Evacuation and assembly', 'Drills and review']
  },
  audit: {
    title: 'Safety Audit Report',
    columns: '| # | Clause/Area | Finding | Category | Evidence | Action |',
    steps: ['Scope and criteria', 'Method and sampling', 'Findings (major/minor/observation)', 'Conclusion', 'CAPA and follow-up']
  },
  monthly_report: {
    title: 'Monthly HSE Report',
    columns: '| KPI | Formula | Target | Actual | Status |',
    steps: ['Executive summary', 'Man-hours and exposure', 'Incident statistics', 'Performance indices', 'Compliance and initiatives']
  },
  email: {
    title: 'Professional HSE Email',
    columns: '| Section | Content |',
    steps: ['Subject line', 'Purpose and context', 'Key facts and figures', 'Requested action and date', 'Sign-off']
  }
};

const REVIEW_NOTE = '\n\n---\n**Review required:** this output is a starting point prepared without site-specific facts. A qualified competent person must verify and approve it before any implementation. It is not authorisation to start work.\n';

export function templateAnswer({ docType = 'general', prompt = '', lang = 'en', inputs = {} } = {}) {
  const blueprint = DOC_BLUEPRINTS[docType];
  const lines = [];
  lines.push(`## ${blueprint ? blueprint.title : 'HSE Assistant (template mode)'}`);
  lines.push('');
  lines.push('**AI provider not configured.** This is a structured HSE template generated from the platform knowledge base, not a live AI answer. Add an AI provider key to enable conversational answers.');
  lines.push('');

  if (prompt) {
    lines.push(`**Your request:** ${String(prompt).slice(0, 600)}`);
    lines.push('');
  }
  if (Object.keys(inputs).length) {
    lines.push('**Information supplied:**');
    for (const [key, value] of Object.entries(inputs)) {
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        lines.push(`- ${key.replace(/_/g, ' ')}: ${value}`);
      }
    }
    lines.push('');
  }

  if (blueprint) {
    lines.push(`### Working structure`);
    lines.push('');
    lines.push(blueprint.columns);
    lines.push('');
    const rows = blueprint.steps.length;
    lines.push(blueprint.columns.replace(/[^|]/g, ' ').split('|').filter(Boolean).map(() => '---').join('|').replace(/^/, '| ').replace(/$/, ' |'));
    for (let i = 0; i < rows; i += 1) {
      const cells = blueprint.columns.split('|').filter((c) => c.trim()).length;
      lines.push(`| ${Array.from({ length: cells }).map((_, c) => (c === 1 ? blueprint.steps[i] : '[site-specific]')).join(' | ')} |`);
    }
    lines.push('');
    lines.push('### Required inputs');
    lines.push('');
    QUESTIONS.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    lines.push('');
    lines.push('### Controls to consider');
    lines.push('');
    lines.push('- Permit to work and energy isolation where the activity requires it.');
    lines.push('- Hierarchy of controls: elimination, substitution, engineering, administrative, then PPE.');
    lines.push('- Emergency arrangement, rescue plan and first-aid cover for the activity.');
    lines.push('- Competency verification and toolbox talk before work starts.');
    lines.push('');
  } else {
    lines.push('### How to get a useful answer');
    lines.push('');
    lines.push('Provide these details and ask again:');
    QUESTIONS.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    lines.push('');
    lines.push('### Reference material available in this platform');
    lines.push('');
    lines.push('- 50 HSE document formats in the Safety Document Library (JSA, HIRA, PTW, ERP, inspection checklists, registers).');
    lines.push('- Module workflows for permits, LOTO, incidents, CAPA, inspections, training, PPE, environment and audits.');
    lines.push('- Legal compliance register where you record the source, applicability and review date for each requirement.');
    lines.push('');
  }

  if (lang === 'hi') {
    lines.push('### हिंदी सारांश');
    lines.push('');
    lines.push('यह एक संरचित सुरक्षा टेम्पलेट है। कृपया स्थल की वास्तविक जानकारी दें (गतिविधि, स्थान, श्रमिक, उपकरण, ऊर्जा स्रोत, परमिट आवश्यकता)। किसी भी कार्य को प्रारंभ करने की अनुमति केवल अधिकृत साइट कर्मी ही दे सकते हैं।');
    lines.push('');
  }

  return `${lines.join('\n')}${REVIEW_NOTE}`;
}

/* --------------------------------- public API --------------------------------- */

export async function chat({ messages = [], lang = 'en', docType, inputs, prompt }) {
  const provider = activeProvider();
  const cleanMessages = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));

  if (!provider) {
    return {
      content: templateAnswer({ docType: docType || 'general', prompt: prompt || cleanMessages.at(-1)?.content || '', lang, inputs }),
      provider: 'template',
      model: null,
      fallback: true,
      mode: 'template'
    };
  }

  try {
    const full = [{ role: 'system', content: systemPrompt(lang) }, ...cleanMessages];
    const result = await callProvider(provider, full);
    return {
      content: `${result.content}${REVIEW_NOTE}`,
      provider: provider.id,
      model: result.model,
      fallback: false,
      mode: 'provider'
    };
  } catch (error) {
    return {
      content: `${templateAnswer({ docType: docType || 'general', prompt: prompt || cleanMessages.at(-1)?.content || '', lang, inputs })}\n\n> Live AI request failed (${String(error.message).slice(0, 160)}). The template answer above was produced locally.`,
      provider: 'template',
      model: null,
      fallback: true,
      mode: 'template',
      error: String(error.message).slice(0, 300)
    };
  }
}

export async function generate({ docType = 'jsa', inputs = {}, lang = 'en', instructions = '' }) {
  const provider = activeProvider();
  const request = `Generate a ${DOC_BLUEPRINTS[docType]?.title || docType} for an industrial site in India.
Use only the information below. Where information is missing, list it as an open question instead of inventing it.
${Object.entries(inputs)
  .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
  .map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`)
  .join('\n')}
${instructions ? `Additional instructions: ${instructions}` : ''}`;

  return chat({
    messages: [{ role: 'user', content: request }],
    lang,
    docType,
    inputs,
    prompt: instructions || `${DOC_BLUEPRINTS[docType]?.title || docType} generation`
  });
}

export const DOC_TYPES = Object.entries(DOC_BLUEPRINTS).map(([key, value]) => ({ key, title: value.title }));
