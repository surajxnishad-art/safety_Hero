import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { initSchema, getSetting, setSetting } from './db.js';
import { seedIfEmpty } from './seed.js';
import { runAlertScan } from './notify.js';
import { aiStatus } from './ai.js';
import { rateLimit, currentUser, publicUser } from './auth.js';
import authRoutes, { bootstrapOwnerAdmin } from './routes/auth.js';
import moduleRoutes from './routes/modules.js';
import dashboardRoutes from './routes/dashboard.js';
import documentRoutes from './routes/documents.js';
import jobRoutes from './routes/jobs.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import publicRoutes from './routes/public.js';

/* ------------------------------- initialise ------------------------------- */
initSchema();
const seed = seedIfEmpty();
if (seed.seeded) setSetting('demo_data', '1');
const bootstrap = bootstrapOwnerAdmin();
const initialAlerts = runAlertScan();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(self), camera=(self)');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
  );
  next();
});

app.use('/api', rateLimit({ windowMs: 60_000, max: 900, message: 'Too many requests from this network. Please slow down.' }));

/* --------------------------------- routes --------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', publicRoutes);

app.get('/api/session', (req, res) => {
  const user = currentUser(req);
  res.json({ user: user ? publicUser(user) : null, ai: aiStatus(), demo_data: getSetting('demo_data', '0') === '1' });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API endpoint' }));

/* ---------------------------- static client ---------------------------- */
const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const indexFile = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexFile)) return next();
    res.sendFile(indexFile);
  });
} else {
  app.get('/', (req, res) =>
    res
      .status(503)
      .type('html')
      .send('<h1>SURAJ SAFETY HERO</h1><p>The client bundle is not built yet. Run <code>npm run build</code> and restart.</p>')
  );
}

/* ----------------------------- error handling ---------------------------- */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) console.error('[api error]', err.message);
  res.status(status).json({
    error: status >= 500 ? 'The server could not complete that request. Please try again.' : err.message
  });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SURAJ SAFETY HERO V2.0 running on http://0.0.0.0:${PORT}`);
  console.log(`  AI provider: ${aiStatus().enabled ? aiStatus().provider : 'not configured (template mode)'}`);
  console.log(`  Demo dataset seeded: ${seed.seeded ? 'yes' : 'no (existing data kept)'}`);
  console.log(`  Owner admin bootstrap: ${bootstrap.created ? 'created' : bootstrap.reason}`);
  console.log(`  Alert scan: ${initialAlerts.created} new alerts`);
});

const alertTimer = setInterval(() => runAlertScan(), 6 * 60 * 60 * 1000);
if (alertTimer.unref) alertTimer.unref();
