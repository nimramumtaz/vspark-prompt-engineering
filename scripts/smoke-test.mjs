/**
 * End-to-end smoke test: boots the real Express server on a temporary data
 * directory and exercises registration, status tracking and admin actions.
 *
 *   node scripts/smoke-test.mjs
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vspark-smoke-'));
const port = 3900 + Math.floor(Math.random() * 80);
const base = `http://127.0.0.1:${port}`;

const child = spawn(process.execPath, ['server/index.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    DATA_DIR: tmp,
    ADMIN_EMAIL: 'smoke-admin@example.pk',
    ADMIN_PASSWORD: 'SmokeTest@2026',
    SESSION_SECRET: 'smoke-test-secret-value-1234567890'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let logs = '';
child.stdout.on('data', (d) => (logs += d));
child.stderr.on('data', (d) => (logs += d));

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not start in time.\n${logs}`);
}

function stop(code) {
  try {
    child.kill('SIGTERM');
  } catch {
    // already gone
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(code);
}

try {
  await waitForServer();
  console.log('· server booted on', base);

  const home = await fetch(base + '/');
  assert.equal(home.status, 200);

  const payload = {
    category: 'image-generation',
    team_name: 'Smoke Team',
    leader_name: 'Smoke Tester',
    leader_email: 'smoke@example.edu.pk',
    leader_phone: '03001112233',
    university: 'Test University',
    agree: true
  };

  const created = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const createdBody = await created.json();
  assert.equal(created.status, 201, JSON.stringify(createdBody));
  assert.match(createdBody.registration.code, /^PE-\d{2}-\d{4}$/);
  assert.equal(createdBody.registration.category_name, 'Image Generation');

  const duplicate = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(duplicate.status, 409);

  const status = await fetch(
    `${base}/api/status?code=${createdBody.registration.code}&email=${payload.leader_email}`
  );
  const statusBody = await status.json();
  assert.equal(status.status, 200);
  assert.equal(statusBody.registration.category_name, 'Image Generation');
  assert.equal(statusBody.registration.duration, '90 minutes');

  const login = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ email: 'smoke-admin@example.pk', password: 'SmokeTest@2026' })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const stats = await fetch(`${base}/api/admin/stats`, { headers: { Cookie: cookie } });
  const statsBody = await stats.json();
  assert.equal(stats.status, 200);
  assert.equal(statsBody.stats.total, 1);
  assert.equal(statsBody.stats.byCategory['image-generation'], 1);

  const list = await fetch(`${base}/api/admin/registrations?category=image-generation`, {
    headers: { Cookie: cookie }
  });
  const listBody = await list.json();
  assert.equal(listBody.total, 1);

  const id = listBody.rows[0].id;
  const patched = await fetch(`${base}/api/admin/registrations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookie },
    body: JSON.stringify({ status: 'approved', payment_status: 'paid' })
  });
  const patchedBody = await patched.json();
  assert.equal(patched.status, 200);
  assert.equal(patchedBody.registration.status, 'approved');
  assert.equal(patchedBody.registration.payment_status, 'paid');

  const csv = await fetch(`${base}/api/admin/export.csv`, { headers: { Cookie: cookie } });
  const csvText = await csv.text();
  assert.match(csvText, /"Prompt Category"/);
  assert.match(csvText, /Image Generation/);

  const removed = await fetch(`${base}/api/admin/registrations/${id}`, {
    method: 'DELETE',
    headers: { Origin: base, Cookie: cookie }
  });
  assert.equal(removed.status, 200);

  console.log('✓ home page, registration, duplicate block, status lookup');
  console.log('✓ admin login, category filter, approve + payment, CSV, delete');
  stop(0);
} catch (err) {
  console.error('✗ smoke test failed:', err.message);
  console.error(logs);
  stop(1);
}
