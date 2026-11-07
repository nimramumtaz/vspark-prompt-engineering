import express from 'express';
import {
  queryRegistrations,
  findRegistrationById,
  updateRegistration,
  deleteRegistration,
  stats,
  recentActivity,
  findAdminByEmail,
  allRegistrations
} from '../store.js';
import {
  verifyPassword,
  createSessionToken,
  sessionCookie,
  clearSessionCookie,
  requireAdmin,
  loginRateLimit,
  clearLoginAttempts,
  changePassword
} from '../auth.js';
import { STATUSES, PAYMENT_STATUSES, CATEGORIES, getCategory } from '../competitions.js';
import { clean, isEmail, isSameOrigin } from '../validate.js';

const router = express.Router();

/** Express 4 does not catch rejected promises — forward them to the error handler. */
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

/* ---------------------------------------------------------------- */
/* Auth                                                              */
/* ---------------------------------------------------------------- */

router.post('/login', (req, res) => {
  if (!isSameOrigin(req)) {
    return res.status(403).json({ ok: false, error: 'Request blocked (cross-origin).' });
  }

  const email = clean(req.body?.email, 120).toLowerCase();
  const password = String(req.body?.password || '');
  const key = `${req.ip}:${email}`;

  const limit = loginRateLimit(key);
  if (limit.blocked) {
    const minutes = Math.ceil(limit.retryInMs / 60000);
    return res.status(429).json({
      ok: false,
      error: `Too many failed attempts. Try again in ${minutes} minute(s).`
    });
  }

  if (!isEmail(email) || password.length < 6) {
    return res.status(422).json({ ok: false, error: 'Enter a valid email and password.' });
  }

  const admin = findAdminByEmail(email);
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return res.status(401).json({ ok: false, error: 'Incorrect email or password.' });
  }

  clearLoginAttempts(key);
  res.setHeader('Set-Cookie', sessionCookie(createSessionToken(admin)));
  res.json({ ok: true, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.admin) return res.status(401).json({ ok: false, error: 'Not signed in.' });
  res.json({ ok: true, admin: req.admin });
});

router.post('/password', requireAdmin, asyncRoute(async (req, res) => {
  const current = String(req.body?.current || '');
  const next = String(req.body?.next || '');
  if (next.length < 8) {
    return res.status(422).json({ ok: false, error: 'New password must be at least 8 characters.' });
  }
  if (!(await changePassword(req.admin.id, current, next))) {
    return res.status(401).json({ ok: false, error: 'Current password is incorrect.' });
  }
  res.json({ ok: true, message: 'Password updated.' });
}));

/* ---------------------------------------------------------------- */
/* Stats + activity                                                  */
/* ---------------------------------------------------------------- */

router.get('/stats', requireAdmin, (req, res) => {
  res.json({ ok: true, stats: stats(), categories: CATEGORIES, statuses: STATUSES });
});

router.get('/activity', requireAdmin, (req, res) => {
  res.json({ ok: true, activity: recentActivity(15) });
});

/* ---------------------------------------------------------------- */
/* Registrations                                                     */
/* ---------------------------------------------------------------- */

router.get('/registrations', requireAdmin, (req, res) => {
  const result = queryRegistrations({
    search: clean(req.query.search, 100),
    category: getCategory(clean(req.query.category, 60)) ? clean(req.query.category, 60) : '',
    status: STATUSES.includes(req.query.status) ? req.query.status : '',
    payment: PAYMENT_STATUSES.includes(req.query.payment) ? req.query.payment : '',
    sort: clean(req.query.sort, 20) || 'newest',
    page: Number(req.query.page) || 1,
    perPage: Number(req.query.perPage) || 10
  });
  res.json({ ok: true, ...result });
});

router.get('/registrations/:id', requireAdmin, (req, res) => {
  const record = findRegistrationById(req.params.id);
  if (!record) return res.status(404).json({ ok: false, error: 'Registration not found.' });
  res.json({ ok: true, registration: record, category: getCategory(record.category) });
});

router.patch('/registrations/:id', requireAdmin, asyncRoute(async (req, res) => {
  if (!isSameOrigin(req)) {
    return res.status(403).json({ ok: false, error: 'Request blocked (cross-origin).' });
  }

  const patch = {};
  if (req.body?.status !== undefined) {
    if (!STATUSES.includes(req.body.status)) {
      return res.status(422).json({ ok: false, error: 'Invalid status.' });
    }
    patch.status = req.body.status;
  }
  if (req.body?.payment_status !== undefined) {
    if (!PAYMENT_STATUSES.includes(req.body.payment_status)) {
      return res.status(422).json({ ok: false, error: 'Invalid payment status.' });
    }
    patch.payment_status = req.body.payment_status;
  }
  if (req.body?.admin_notes !== undefined) {
    patch.admin_notes = clean(req.body.admin_notes, 500);
  }
  if (!Object.keys(patch).length) {
    return res.status(422).json({ ok: false, error: 'Nothing to update.' });
  }

  const updated = await updateRegistration(req.params.id, patch, req.admin.email);
  if (!updated) return res.status(404).json({ ok: false, error: 'Registration not found.' });
  res.json({ ok: true, registration: updated, message: 'Registration updated.' });
}));

router.delete('/registrations/:id', requireAdmin, asyncRoute(async (req, res) => {
  if (!isSameOrigin(req)) {
    return res.status(403).json({ ok: false, error: 'Request blocked (cross-origin).' });
  }
  const removed = await deleteRegistration(req.params.id, req.admin.email);
  if (!removed) return res.status(404).json({ ok: false, error: 'Registration not found.' });
  res.json({ ok: true, message: `Deleted ${removed.code}.` });
}));

/* ---------------------------------------------------------------- */
/* CSV export (respects the active filters, no pagination)           */
/* ---------------------------------------------------------------- */

const CSV_COLUMNS = [
  ['code', 'Team Code'],
  ['category_name', 'Prompt Category'],
  ['team_name', 'Team Name'],
  ['team_size', 'Team Size'],
  ['leader_name', 'Leader Name'],
  ['leader_email', 'Leader Email'],
  ['leader_phone', 'Leader Phone'],
  ['university', 'University'],
  ['city', 'City'],
  ['discipline', 'Discipline'],
  ['semester', 'Semester'],
  ['cnic', 'CNIC'],
  ['member2_name', 'Member 2 Name'],
  ['member2_email', 'Member 2 Email'],
  ['experience', 'Experience'],
  ['fee', 'Fee (PKR)'],
  ['payment_status', 'Payment'],
  ['status', 'Status'],
  ['admin_notes', 'Admin Notes'],
  ['created_at', 'Registered At']
];

function csvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

router.get('/export.csv', requireAdmin, (req, res) => {
  const { rows } = queryRegistrations({
    search: clean(req.query.search, 100),
    category: getCategory(clean(req.query.category, 60)) ? clean(req.query.category, 60) : '',
    status: STATUSES.includes(req.query.status) ? req.query.status : '',
    payment: PAYMENT_STATUSES.includes(req.query.payment) ? req.query.payment : '',
    sort: clean(req.query.sort, 20) || 'newest',
    page: 1,
    perPage: 100000
  });

  const header = CSV_COLUMNS.map(([, label]) => csvCell(label)).join(',');
  const body = rows
    .map((row) =>
      CSV_COLUMNS.map(([key]) => {
        if (key === 'created_at') return csvCell(new Date(row.created_at).toLocaleString('en-PK'));
        return csvCell(row[key]);
      }).join(',')
    )
    .join('\r\n');

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="prompt-engineering-registrations-${stamp}.csv"`);
  res.send(`\uFEFF${header}\r\n${body}\r\n`);
});

/** Compact recent-registration feed for the dashboard. */
router.get('/recent', requireAdmin, (req, res) => {
  const rows = allRegistrations()
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);
  res.json({ ok: true, rows });
});

export default router;
