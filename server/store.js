import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const TMP_FILE = path.join(DATA_DIR, 'db.json.tmp');

const EMPTY_DB = {
  meta: { seq: 0, createdAt: new Date().toISOString() },
  registrations: [],
  admins: [],
  activity: []
};

let db = null;
let pool = null;

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/*                                                                     */
/* Local development keeps the simple JSON file. When DATABASE_URL is  */
/* set (Render + Neon), the whole document is stored in one JSONB row  */
/* so the deployed portal keeps every registration across restarts.    */
/* ------------------------------------------------------------------ */

let persistImpl = persistFile;
let writeChain = Promise.resolve();

async function persistFile() {
  // Write to a temp file first, then rename so a crash can never leave a
  // half-written database behind.
  await fs.promises.writeFile(TMP_FILE, JSON.stringify(db, null, 2), 'utf8');
  await fs.promises.rename(TMP_FILE, DB_FILE);
}

async function persistPostgres() {
  await pool.query(
    `INSERT INTO portal_state (id, doc)
     VALUES (1, $1::jsonb)
     ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()`,
    [JSON.stringify(db)]
  );
}

function persist() {
  const run = writeChain.then(persistImpl, persistImpl);
  // Keep the chain alive even if one write fails; callers still see the error.
  writeChain = run.catch(() => {});
  return run;
}

function normalizeDb(raw) {
  const next = { ...structuredClone(EMPTY_DB), ...(raw || {}) };
  next.registrations = Array.isArray(next.registrations) ? next.registrations : [];
  next.admins = Array.isArray(next.admins) ? next.admins : [];
  next.activity = Array.isArray(next.activity) ? next.activity : [];
  next.meta = next.meta || { seq: 0, createdAt: new Date().toISOString() };
  next.meta.seq = Number(next.meta.seq) || 0;
  return next;
}

function loadFileSync() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      return normalizeDb(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
    } catch (err) {
      // Corrupt file: keep a backup instead of silently destroying data.
      const backup = path.join(DATA_DIR, `db.corrupt-${Date.now()}.json`);
      fs.copyFileSync(DB_FILE, backup);
      console.error(`[store] Could not parse db.json (${err.message}); backup written to ${backup}`);
    }
  }
  return structuredClone(EMPTY_DB);
}

export async function initStore(options = {}) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (options.pool) {
    pool = options.pool;
    persistImpl = persistPostgres;
  } else if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg');
    const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 20000
    });
    persistImpl = persistPostgres;
  }

  if (pool) {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS portal_state (
         id integer PRIMARY KEY,
         doc jsonb NOT NULL,
         updated_at timestamptz NOT NULL DEFAULT now()
       )`
    );
    const { rows } = await pool.query('SELECT doc FROM portal_state WHERE id = 1');
    if (rows.length) {
      db = normalizeDb(rows[0].doc);
      console.log('  Storage: PostgreSQL (DATABASE_URL)');
      return db;
    }
    db = structuredClone(EMPTY_DB);
    await persist();
    console.log('  Storage: PostgreSQL (fresh database initialised)');
    return db;
  }

  db = loadFileSync();
  console.log('  Storage: local JSON file (data/db.json)');
  return db;
}

export function getDb() {
  if (!db) db = loadFileSync();
  return db;
}

/* ------------------------------------------------------------------ */
/* Activity log                                                        */
/* ------------------------------------------------------------------ */

export function logActivity(actor, action, target, detail = '') {
  const entry = {
    id: getDb().activity.length + 1,
    actor,
    action,
    target,
    detail,
    at: new Date().toISOString()
  };
  db.activity.unshift(entry);
  db.activity = db.activity.slice(0, 300);
  return entry;
}

export function recentActivity(limit = 12) {
  return getDb().activity.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Registrations                                                       */
/* ------------------------------------------------------------------ */

export function nextCode() {
  const db2 = getDb();
  db2.meta.seq = (db2.meta.seq || 0) + 1;
  const year = new Date().getFullYear().toString().slice(-2);
  return `PE-${year}-${String(db2.meta.seq).padStart(4, '0')}`;
}

export function allRegistrations() {
  return getDb().registrations;
}

export function findRegistrationByCode(code) {
  const needle = String(code || '').trim().toUpperCase();
  return getDb().registrations.find((r) => r.code.toUpperCase() === needle) || null;
}

export function findRegistrationById(id) {
  return getDb().registrations.find((r) => r.id === Number(id)) || null;
}

export function emailTaken(email, excludeId = null) {
  const needle = String(email || '').trim().toLowerCase();
  return getDb().registrations.some(
    (r) => r.id !== excludeId && r.leader_email.toLowerCase() === needle
  );
}

export async function createRegistration(data, actor = 'Public site') {
  const db2 = getDb();
  const id = db2.meta.seq + 1;
  const now = new Date().toISOString();
  const record = {
    id,
    code: nextCode(),
    ...data,
    status: 'pending',
    payment_status: 'unpaid',
    admin_notes: '',
    created_at: now,
    updated_at: now
  };
  db2.registrations.unshift(record);
  logActivity(actor, 'registered', record.code, `${record.team_name} — ${record.category_name || 'Prompt Engineering'}`);
  await persist();
  return record;
}

export async function updateRegistration(id, patch, actor = 'Admin') {
  const record = findRegistrationById(id);
  if (!record) return null;

  const statusChanged = patch.status !== undefined && patch.status !== record.status;
  const paymentChanged = patch.payment_status !== undefined && patch.payment_status !== record.payment_status;
  const notesChanged = patch.admin_notes !== undefined && patch.admin_notes !== record.admin_notes;

  Object.assign(record, patch, { updated_at: new Date().toISOString() });

  if (statusChanged) logActivity(actor, `status:${record.status}`, record.code, record.team_name);
  else if (paymentChanged) logActivity(actor, `payment:${record.payment_status}`, record.code, record.team_name);
  else if (notesChanged) logActivity(actor, 'note', record.code, record.team_name);
  await persist();
  return record;
}

export async function deleteRegistration(id, actor = 'Admin') {
  const db2 = getDb();
  const idx = db2.registrations.findIndex((r) => r.id === Number(id));
  if (idx === -1) return null;
  const [removed] = db2.registrations.splice(idx, 1);
  logActivity(actor, 'deleted', removed.code, removed.team_name);
  await persist();
  return removed;
}

/** Filtering + search + sorting + pagination for the admin table. */
export function queryRegistrations({
  search = '',
  category = '',
  status = '',
  payment = '',
  sort = 'newest',
  page = 1,
  perPage = 10
} = {}) {
  const needle = String(search || '').trim().toLowerCase();
  let rows = getDb().registrations.slice();

  if (needle) {
    rows = rows.filter((r) =>
      [
        r.code,
        r.team_name,
        r.leader_name,
        r.leader_email,
        r.university,
        r.leader_phone,
        r.member2_name,
        r.cnic,
        r.category_name
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }
  if (category) rows = rows.filter((r) => r.category === category);
  if (status) rows = rows.filter((r) => r.status === status);
  if (payment) rows = rows.filter((r) => r.payment_status === payment);

  const sorters = {
    newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    name: (a, b) => a.team_name.localeCompare(b.team_name),
    category: (a, b) => String(a.category_name).localeCompare(String(b.category_name))
  };
  rows.sort(sorters[sort] || sorters.newest);

  const total = rows.length;
  const size = Math.min(Math.max(Number(perPage) || 10, 1), 100);
  const pages = Math.max(Math.ceil(total / size), 1);
  const current = Math.min(Math.max(Number(page) || 1, 1), pages);
  const start = (current - 1) * size;

  return {
    rows: rows.slice(start, start + size),
    total,
    page: current,
    pages,
    perPage: size
  };
}

export function stats() {
  const rows = getDb().registrations;
  const byCategory = {};
  const byStatus = { pending: 0, approved: 0, rejected: 0 };
  let revenue = 0;
  let collected = 0;

  for (const r of rows) {
    const key = r.category || 'unspecified';
    byCategory[key] = (byCategory[key] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.status !== 'rejected') revenue += r.fee || 0;
    if (r.payment_status === 'paid' && r.status !== 'rejected') collected += r.fee || 0;
  }

  const today = new Date().toDateString();
  const newToday = rows.filter((r) => new Date(r.created_at).toDateString() === today).length;

  const universities = new Set(rows.map((r) => (r.university || '').toLowerCase()).filter(Boolean));

  return {
    total: rows.length,
    byStatus,
    byCategory,
    revenue,
    collected,
    outstanding: revenue - collected,
    newToday,
    participants: rows.reduce((sum, r) => sum + (r.team_size || 1), 0),
    universities: universities.size,
    approvedRate: rows.length ? Math.round((byStatus.approved / rows.length) * 100) : 0
  };
}

/* ------------------------------------------------------------------ */
/* Admin accounts                                                      */
/* ------------------------------------------------------------------ */

export function findAdminByEmail(email) {
  const needle = String(email || '').trim().toLowerCase();
  return getDb().admins.find((a) => a.email === needle) || null;
}

export function findAdminById(id) {
  return getDb().admins.find((a) => a.id === Number(id)) || null;
}

export async function createAdmin({ email, name, passwordHash, role = 'admin' }) {
  const db2 = getDb();
  const admin = {
    id: db2.admins.length + 1,
    email: String(email).trim().toLowerCase(),
    name: name || 'Administrator',
    password_hash: passwordHash,
    role,
    created_at: new Date().toISOString()
  };
  db2.admins.push(admin);
  await persist();
  return admin;
}

export async function updateAdminPassword(id, passwordHash) {
  const admin = findAdminById(id);
  if (!admin) return null;
  admin.password_hash = passwordHash;
  admin.updated_at = new Date().toISOString();
  await persist();
  return admin;
}

export async function saveNow() {
  await persist();
}
