/**
 * SURAJ SAFETY HERO - API regression check.
 * Starts the real server against a throwaway database and exercises the
 * critical flows: setup/login, RBAC, HSE module CRUD + approval, dashboard
 * metrics, documents, job portal, AI chat and contact form.
 *
 * Run with: npm test
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = Number(process.env.TEST_PORT || 3999);
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssh-test-'));
const DB_PATH = path.join(tmpDir, 'test.db');

let failures = 0;
let passes = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passes += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? ` :: ${detail}` : ''}`);
  }
}

const cookies = new Map();
function cookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}
function storeCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  raw.forEach((c) => {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (value === '' || /expires=thu, 01 jan 1970/i.test(c)) cookies.delete(name);
    else cookies.set(name, value);
  });
}

async function api(method, url, body) {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookies.size ? { Cookie: cookieHeader() } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual'
  });
  storeCookies(res);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const server = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, PORT: String(PORT), DB_PATH, OWNER_ADMIN_EMAIL: '', OWNER_ADMIN_PASSWORD: '' },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', (d) => process.env.DEBUG_TEST && process.stdout.write(`[server] ${d}`));
server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

let exitCode = 1;
try {
  const up = await waitForServer();
  check('server starts and /api/health responds', up);
  if (!up) throw new Error('server did not start');

  /* ------------------------------- public API ------------------------------ */
  const health = await api('GET', '/api/health');
  check('health reports ok', health.json?.ok === true, JSON.stringify(health.json));

  const summary = await api('GET', '/api/summary');
  check('public summary exposes module + template counts', summary.json?.stats?.modules >= 20 && summary.json?.stats?.templates >= 40, JSON.stringify(summary.json?.stats));

  const modules = await api('GET', '/api/modules');
  check('module catalogue is public', modules.status === 200 && modules.json.modules.length >= 20);

  const setupStatus = await api('GET', '/api/auth/setup-status');
  check('fresh install reports needs_setup', setupStatus.json?.needs_setup === true);

  /* ------------------------------- auth/RBAC ------------------------------- */
  const unauth = await api('GET', '/api/dashboard');
  check('dashboard requires authentication', unauth.status === 401, `status ${unauth.status}`);

  const setup = await api('POST', '/api/auth/setup', {
    name: 'Test Owner',
    email: 'owner@example.com',
    password: 'Str0ngPass!2026',
    org_name: 'Test Safety Co'
  });
  check('initial admin setup succeeds', setup.status === 201, JSON.stringify(setup.json));

  const session = await api('GET', '/api/session');
  check('session cookie authenticates the owner', session.json?.user?.role === 'super_admin', JSON.stringify(session.json?.user));

  const created = await api('POST', '/api/admin/users', {
    name: 'Site Engineer',
    email: 'engineer@example.com',
    password: 'Engineer!2026x',
    role: 'site_engineer'
  });
  check('admin can create a user', created.status === 201, JSON.stringify(created.json));

  const ownerCookies = new Map(cookies);
  cookies.clear();
  const login = await api('POST', '/api/auth/login', { email: 'engineer@example.com', password: 'Engineer!2026x' });
  check('created user can log in', login.status === 200, JSON.stringify(login.json));
  const forbidden = await api('GET', '/api/admin/users');
  check('non-admin is blocked from admin API (RBAC)', forbidden.status === 403, `status ${forbidden.status}`);
  const aiDenied = await api('POST', '/api/modules/hira', { title: 'x' });
  check('employee-role writes are denied on HSE modules', aiDenied.status === 403 || aiDenied.status === 400, `status ${aiDenied.status}`);

  cookies.clear();
  for (const [k, v] of ownerCookies) cookies.set(k, v);

  /* ----------------------------- HSE module flow --------------------------- */
  const listBefore = await api('GET', '/api/modules/hira?page=1&pageSize=5');
  check('HSE module list returns seeded records', listBefore.status === 200 && listBefore.json.rows.length > 0 && listBefore.json.total > 0);

  const create = await api('POST', '/api/modules/hira', {
    title: 'Hot work near solvent store',
    activity: 'Welding repair on tank farm pipeline',
    area: 'Tank Farm',
    hazard: 'Ignition of flammable vapour',
    consequence: 'Fire and burn injury',
    severity: 4,
    likelihood: 3,
    control_engineering: 'Gas testing before and during work',
    control_admin: 'Hot work permit with fire watch',
    control_ppe: 'FR coverall, face shield',
    responsible: 'HSE Officer',
    review_date: '2026-12-31'
  });
  const newId = create.json?.row?.id;
  check('creating an HSE record persists and derives risk', create.status === 201 && create.json.row.initial_risk === 12 && create.json.row.risk_band === 'High', JSON.stringify(create.json?.row));

  const search = await api('GET', '/api/modules/hira?q=solvent');
  check('search finds the new record', search.json?.rows?.some((r) => r.id === newId));

  const filtered = await api('GET', '/api/modules/hira?status=draft');
  check('status filter works', filtered.json?.rows?.every((r) => r.status === 'draft'));

  const approve = await api('POST', `/api/modules/hira/${newId}/approve`, { note: 'Reviewed on site' });
  check('approval workflow updates status', approve.status === 200 && approve.json.row.status === 'approved', JSON.stringify(approve.json?.row?.status));

  const update = await api('PATCH', `/api/modules/hira/${newId}`, { control_admin: 'Permit + continuous gas monitoring' });
  check('editing a record persists the change', update.status === 200 && /continuous gas/.test(update.json.row.control_admin));

  const csv = await api('GET', '/api/modules/hira/export.csv');
  check('CSV export streams module rows', csv.status === 200 && csv.text.includes('Ignition of flammable vapour'));

  /* -------------------------------- dashboard ------------------------------ */
  const dash = await api('GET', '/api/dashboard');
  const kpis = dash.json?.kpis || {};
  check('dashboard returns KPI block', dash.status === 200 && typeof kpis.totalManHours === 'number', JSON.stringify(kpis).slice(0, 200));
  check('man-hours and LTIFR are computed from stored data', kpis.totalManHours > 0 && typeof kpis.ltifr === 'number');
  check('dashboard trend series present', Array.isArray(dash.json?.trend) && dash.json.trend.length >= 3);

  /* -------------------------------- documents ----------------------------- */
  const templates = await api('GET', '/api/documents/templates');
  check('50-format document library available', templates.json?.templates?.length >= 45, `${templates.json?.templates?.length}`);

  const docCreate = await api('POST', '/api/documents', { template_key: 'jsa', title: 'JSA - Tank Cleaning', is_sample: 0 });
  check('document created with automatic number and revision', docCreate.status === 201 && /^JSA-\d{4}-\d{3}$/.test(docCreate.json.row.doc_no) && docCreate.json.row.revision === 'A', JSON.stringify(docCreate.json?.row?.doc_no));

  const revise = await api('POST', `/api/documents/${docCreate.json.row.id}/revise`, { change_note: 'Updated controls' });
  check('revision control increments the revision', revise.json?.row?.revision === 'B', revise.json?.row?.revision);

  const docExport = await api('GET', `/api/documents/${docCreate.json.row.id}/export?format=html`);
  check('document export renders printable HTML', docExport.status === 200 && docExport.text.includes('JSA - Tank Cleaning'));

  /* ------------------------------- job portal ----------------------------- */
  const jobs = await api('GET', '/api/jobs');
  check('published jobs are listed publicly', jobs.status === 200 && jobs.json.total > 0, `${jobs.json?.total}`);

  const jobCreate = await api('POST', '/api/jobs', {
    title: 'Safety Officer - Test Site',
    company: 'Test EPC Ltd',
    category: 'Safety Officer',
    state: 'Gujarat',
    city: 'Surat',
    salary_min: 30000,
    salary_max: 45000,
    experience_min: 2,
    experience_max: 5,
    job_type: 'private',
    status: 'published',
    expiry_date: '2099-12-31',
    source_verified: 1
  });
  check('admin can publish a vacancy', jobCreate.status === 201 && jobCreate.json.row.status === 'published');

  const jobId = jobCreate.json.row.id;
  cookies.clear();
  const apply = await api('POST', `/api/jobs/${jobId}/apply`, {
    name: 'Ravi Kumar',
    email: 'ravi@example.com',
    phone: '9999999999',
    experience_years: 3,
    qualification: 'Diploma in Industrial Safety',
    resume_text: 'Safety officer with 3 years plant experience.'
  });
  check('public application is accepted', apply.status === 201, JSON.stringify(apply.json));
  const jobsAfter = await api('GET', '/api/jobs');
  check('application counted on the vacancy', jobsAfter.json.rows.find((j) => j.id === jobId)?.applications === 1);

  /* --------------------------------- contact ------------------------------ */
  const contact = await api('POST', '/api/contact', {
    name: 'Plant Manager',
    email: 'plant@example.com',
    phone: '8888888888',
    type: 'career',
    message: 'We need HSE support for a 200-person site in Pune.'
  });
  check('contact enquiry is stored', contact.status === 201, JSON.stringify(contact.json));

  const badContact = await api('POST', '/api/contact', { name: 'x', email: 'bad', message: 'short' });
  check('contact form validation rejects bad input', badContact.status === 400);

  /* ----------------------------------- AI --------------------------------- */
  const ai = await api('POST', '/api/ai/chat', { prompt: 'What PPE is required for confined space entry?', lang: 'en' });
  check('AI assistant returns an answer with an explicit mode', ai.status === 200 && typeof ai.json.content === 'string' && ai.json.content.length > 40 && ['live', 'template'].includes(ai.json.mode), JSON.stringify(ai.json?.mode));
  check('AI answer carries safety review warning', /competent person/i.test(ai.json.content));

  const gen = await api('POST', '/api/ai/generate', { doc_type: 'jsa', inputs: { activity: 'Scaffold erection', area: 'Boiler house' } });
  check('AI document generation returns structured output', gen.status === 200 && gen.json.content.length > 100);

  /* ------------------------------- owner restore --------------------------- */
  cookies.clear();
  for (const [k, v] of ownerCookies) cookies.set(k, v);
  const notif = await api('GET', '/api/notifications');
  check('notifications list with unread count', notif.status === 200 && typeof notif.json.unread === 'number');

  const admin = await api('GET', '/api/admin/overview');
  check('admin overview aggregates real records', admin.status === 200 && admin.json.users.total >= 2 && admin.json.modules.length >= 20);

  const backup = await api('GET', '/api/admin/backup');
  check('database backup export works', backup.status === 200 && backup.text.includes('"tables"'));

  const logout = await api('POST', '/api/auth/logout');
  check('logout clears the session', logout.status === 200);
  const afterLogout = await api('GET', '/api/dashboard');
  check('session no longer valid after logout', afterLogout.status === 401);
} catch (err) {
  failures += 1;
  console.error('  ERROR ', err.message);
} finally {
  server.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 600));
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  console.log(`\n${passes} passed, ${failures} failed`);
  exitCode = failures === 0 ? 0 : 1;
  process.exit(exitCode);
}
