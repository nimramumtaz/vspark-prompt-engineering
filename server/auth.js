import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, findAdminByEmail, findAdminById, createAdmin, updateAdminPassword } from './store.js';

const SECRET_FILE = path.join(DATA_DIR, 'session-secret.txt');
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

let secret = null;

export function getSecret() {
  if (secret) return secret;
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    secret = process.env.SESSION_SECRET;
    return secret;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(SECRET_FILE)) {
    secret = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (secret) return secret;
  }
  secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, secret, 'utf8');
  return secret;
}

/* ------------------------------------------------------------------ */
/* Passwords — scrypt with per-user salt and timing-safe comparison    */
/* ------------------------------------------------------------------ */

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, salt, hash] = String(stored).split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const derived = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Session tokens — compact HMAC signed payload                        */
/* ------------------------------------------------------------------ */

const b64url = (buf) => Buffer.from(buf).toString('base64url');

export function createSessionToken(admin) {
  const payload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    exp: Date.now() + SESSION_TTL_MS
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    const admin = findAdminById(payload.sub);
    if (!admin) return null;
    return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Cookies & middleware                                                */
/* ------------------------------------------------------------------ */

export const SESSION_COOKIE = 'vspark_session';

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
    SESSION_TTL_MS / 1000
  }`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Reads the signed-in admin (if any) and attaches it to req. */
export function attachAdmin(req, _res, next) {
  const token = parseCookies(req.headers.cookie).vspark_session;
  req.admin = verifySessionToken(token);
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.admin) {
    // req.path is relative to the mounted router, so use the full URL.
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ ok: false, error: 'Please sign in to continue.' });
    }
    return res.redirect('/admin/login.html');
  }
  next();
}

/* ------------------------------------------------------------------ */
/* Brute-force protection (in-memory, per IP + email)                  */
/* ------------------------------------------------------------------ */

const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;

export function loginRateLimit(key) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(key, { first: now, count: 1 });
    return { blocked: false, remaining: MAX_ATTEMPTS - 1 };
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    return { blocked: true, retryInMs: WINDOW_MS - (now - entry.first) };
  }
  return { blocked: false, remaining: MAX_ATTEMPTS - entry.count };
}

export function clearLoginAttempts(key) {
  attempts.delete(key);
}

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@vspark.pk';
  if (findAdminByEmail(email)) return { created: false, email };

  const password = process.env.ADMIN_PASSWORD || 'Vspark@2026';
  const name = process.env.ADMIN_NAME || 'VSPARK Admin';
  await createAdmin({ email, name, passwordHash: hashPassword(password), role: 'admin' });
  return { created: true, email, password };
}

export async function changePassword(adminId, current, next) {
  const admin = findAdminById(adminId);
  if (!admin || !verifyPassword(current, admin.password_hash)) return false;
  await updateAdminPassword(adminId, hashPassword(next));
  return true;
}
