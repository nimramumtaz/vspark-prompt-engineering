/**
 * Regression test for the Postgres persistence layer, using pg-mem so it
 * runs without a real database server.
 *
 *   node scripts/test-pg-store.mjs
 */
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';

const mem = newDb();
const { Pool } = mem.adapters.createPg();
const pool = new Pool();

const store = await import('../server/store.js');

await store.initStore({ pool });
console.log('· initStore created portal_state and seeded empty document');

const created = await store.createRegistration(
  {
    competition: 'prompt-engineering',
    competition_name: 'Prompt Engineering',
    category: 'video-generation',
    category_name: 'Video Generation',
    category_duration: '120 minutes',
    team_name: 'PG Test Team',
    leader_name: 'PG Tester',
    leader_email: 'pg.tester@example.edu.pk',
    leader_phone: '03001112223',
    university: 'Test University',
    team_size: 1,
    fee: 1000
  },
  'Test'
);

assert.equal(created.code, 'PE-26-0001');
assert.equal(created.status, 'pending');
assert.equal(store.findRegistrationByCode('pe-26-0001').team_name, 'PG Test Team');
assert.equal(store.emailTaken('PG.TESTER@example.edu.pk'), true);
assert.equal(store.emailTaken('other@example.edu.pk'), false);

let persisted = (await pool.query('SELECT doc FROM portal_state WHERE id = 1')).rows[0].doc;
assert.equal(persisted.registrations.length, 1, 'registration must be written to Postgres');
assert.equal(persisted.registrations[0].code, 'PE-26-0001');

const updated = await store.updateRegistration(created.id, { status: 'approved', payment_status: 'paid' }, 'Test');
assert.equal(updated.status, 'approved');
persisted = (await pool.query('SELECT doc FROM portal_state WHERE id = 1')).rows[0].doc;
assert.equal(persisted.registrations[0].status, 'approved');
assert.equal(persisted.registrations[0].payment_status, 'paid');

const filtered = store.queryRegistrations({ category: 'video-generation', status: 'approved' });
assert.equal(filtered.total, 1);
assert.equal(filtered.rows[0].team_name, 'PG Test Team');

const board = store.stats();
assert.equal(board.total, 1);
assert.equal(board.collected, 1000);
assert.equal(board.byCategory['video-generation'], 1);

await store.createRegistration({
  competition: 'prompt-engineering',
  competition_name: 'Prompt Engineering',
  category: 'image-editing',
  category_name: 'Image Editing',
  category_duration: '90 minutes',
  team_name: 'Second Team',
  leader_name: 'Second Tester',
  leader_email: 'second@example.edu.pk',
  leader_phone: '03001112224',
  university: 'Test University',
  team_size: 2,
  fee: 1000
});
assert.equal(store.stats().total, 2);
assert.equal(store.queryRegistrations({ search: 'image editing' }).total, 1);

const removed = await store.deleteRegistration(created.id, 'Test');
assert.equal(removed.code, 'PE-26-0001');
assert.equal(store.stats().total, 1);

const secrets = await store.createAdmin({
  email: 'admin@test.pk',
  name: 'Test Admin',
  passwordHash: 'scrypt$salt$hash'
});
assert.equal(secrets.email, 'admin@test.pk');
assert.equal(store.findAdminByEmail('admin@test.pk').name, 'Test Admin');
await store.updateAdminPassword(secrets.id, 'scrypt$new$hash');
assert.equal(store.findAdminById(secrets.id).password_hash, 'scrypt$new$hash');

persisted = (await pool.query('SELECT doc FROM portal_state WHERE id = 1')).rows[0].doc;
assert.equal(persisted.registrations.length, 1);
assert.equal(persisted.admins.length, 1);

console.log('✓ Postgres store: create, duplicate check, read, filter, stats, update, delete, admin password');
console.log('✓ Every mutation persisted to portal_state.doc');
