import express from 'express';
import { CATEGORIES, COMPETITION, EVENT, categoryName } from '../competitions.js';
import { createRegistration, emailTaken, findRegistrationByCode, allRegistrations } from '../store.js';
import { validateRegistration, isSameOrigin, clean, isEmail } from '../validate.js';

const router = express.Router();

/** Express 4 does not catch rejected promises — forward them to the error handler. */
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

/* Simple in-memory rate limit: 12 registration attempts per IP per hour. */
const registerHits = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_HITS = 12;

function limited(ip) {
  const now = Date.now();
  const entry = registerHits.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) {
    registerHits.set(ip, { first: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_HITS;
}

/** Everything the front end needs to render the portal consistently. */
router.get('/config', (req, res) => {
  res.json({ ok: true, event: EVENT, competition: COMPETITION, categories: CATEGORIES });
});

router.get('/categories', (req, res) => {
  res.json({ ok: true, categories: CATEGORIES });
});

/** Aggregate, non-personal numbers for the homepage counters. */
router.get('/stats', (req, res) => {
  const rows = allRegistrations().filter((r) => r.status !== 'rejected');
  const universities = new Set(rows.map((r) => (r.university || '').toLowerCase()).filter(Boolean));
  const byCategory = {};
  for (const c of CATEGORIES) byCategory[c.slug] = 0;
  for (const r of rows) if (r.category in byCategory) byCategory[r.category] += 1;

  res.json({
    ok: true,
    stats: {
      teams: rows.length,
      participants: rows.reduce((sum, r) => sum + (r.team_size || 1), 0),
      universities: universities.size,
      categories: CATEGORIES.length,
      byCategory
    }
  });
});

router.post('/register', asyncRoute(async (req, res) => {
  if (!isSameOrigin(req)) {
    return res.status(403).json({ ok: false, error: 'Request blocked (cross-origin).' });
  }
  if (limited(req.ip)) {
    return res.status(429).json({ ok: false, error: 'Too many attempts. Please try again later.' });
  }

  const { errors, record, valid } = validateRegistration(req.body || {});
  if (!valid) {
    return res.status(422).json({ ok: false, error: 'Please fix the highlighted fields.', errors });
  }

  if (emailTaken(record.leader_email)) {
    return res.status(409).json({
      ok: false,
      error: 'This email is already registered for Prompt Engineering.',
      errors: { leader_email: 'Already registered — one entry per student.' }
    });
  }

  const saved = await createRegistration(record, 'Public site');
  res.status(201).json({
    ok: true,
    message: 'Registration received! Our team will verify your details shortly.',
    registration: {
      code: saved.code,
      team_name: saved.team_name,
      category: saved.category,
      category_name: saved.category_name,
      competition_name: saved.competition_name,
      fee: saved.fee,
      status: saved.status,
      payment_status: saved.payment_status,
      created_at: saved.created_at
    }
  });
}));

/** Students can track their application with their team code + leader email. */
router.get('/status', (req, res) => {
  const code = clean(req.query.code, 24);
  const email = clean(req.query.email, 120).toLowerCase();

  if (!code || !isEmail(email)) {
    return res.status(422).json({ ok: false, error: 'Enter your team code and the leader’s email.' });
  }

  const found = findRegistrationByCode(code);
  if (!found || found.leader_email.toLowerCase() !== email) {
    return res.status(404).json({ ok: false, error: 'No registration found for that code and email.' });
  }

  res.json({
    ok: true,
    registration: {
      code: found.code,
      team_name: found.team_name,
      team_size: found.team_size,
      category: found.category,
      category_name: found.category_name || categoryName(found.category),
      competition_name: found.competition_name || COMPETITION.name,
      leader_name: found.leader_name,
      university: found.university,
      fee: found.fee,
      status: found.status,
      payment_status: found.payment_status,
      admin_notes: found.admin_notes,
      created_at: found.created_at,
      duration: found.category_duration || COMPETITION.duration
    }
  });
});

export default router;
