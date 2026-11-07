import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

/* ------------------------------------------------------------------ */
/* Tiny .env loader (keeps the project dependency-free)                */
/* ------------------------------------------------------------------ */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');

if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line);
    if (!match || line.trim().startsWith('#')) continue;
    const key = match[1];
    const value = (match[2] || '').replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

const { initStore } = await import('./store.js');
const { seedAdmin, attachAdmin, requireAdmin } = await import('./auth.js');
const { default: publicRoutes } = await import('./routes/public.js');
const { default: adminRoutes } = await import('./routes/admin.js');
const { EVENT, COMPETITION } = await import('./competitions.js');

await initStore();
const seeded = await seedAdmin();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(ROOT, 'public');
const PRIVATE_DIR = path.join(ROOT, 'views');

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "script-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
  );
  next();
});

app.use(attachAdmin);

/* API ------------------------------------------------------------- */
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'prompt-engineering-portal',
    event: EVENT.edition,
    competition: COMPETITION.name,
    time: new Date().toISOString()
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint not found.' });
});

/* Admin pages (dashboard lives outside /public so it is never served
   to signed-out visitors) ------------------------------------------ */
app.get(['/admin', '/admin/'], (req, res) => {
  res.redirect(req.admin ? '/admin/dashboard.html' : '/admin/login.html');
});

app.get('/admin/login.html', (req, res) => {
  if (req.admin) return res.redirect('/admin/dashboard.html');
  res.sendFile(path.join(PUBLIC_DIR, 'admin', 'login.html'));
});

app.get(['/admin/dashboard', '/admin/dashboard.html'], requireAdmin, (req, res) => {
  res.sendFile(path.join(PRIVATE_DIR, 'admin', 'dashboard.html'));
});

/* Public pages ----------------------------------------------------- */
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    maxAge: '1h',
    setHeaders(res, filePath) {
      // Always revalidate HTML/CSS/JS so edits show up immediately (ETag keeps it cheap).
      if (/\.(html|css|js)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
      else res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  })
);

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

app.use((err, req, res, _next) => {
  console.error('[error]', err);
  if (req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
  res.status(500).send('Internal server error');
});

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  VSPARK 2026 — Prompt Engineering Portal');
  console.log('  --------------------------------------------------');
  console.log(`  Public site : ${url}`);
  console.log(`  Admin portal: ${url}/admin/login.html`);
  if (seeded.created) {
    console.log('');
    console.log('  First-run admin account created:');
    console.log(`    email    : ${seeded.email}`);
    console.log(`    password : ${seeded.password}`);
    console.log('  Change it inside the admin portal (Settings) or via .env');
  }
  console.log('');
});
