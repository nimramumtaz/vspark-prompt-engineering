/**
 * Seeds the portal with realistic demo registrations so the admin dashboard
 * has something to show before real students register.
 *
 *   node scripts/seed-demo.mjs          # add demo rows (keeps existing data)
 *   node scripts/seed-demo.mjs --fresh  # archive db.json first, then seed
 *
 * Stop the server before running with --fresh, then start it again.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const dbFile = path.join(dataDir, 'db.json');
const fresh = process.argv.includes('--fresh');

if (fresh && fs.existsSync(dbFile)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archive = path.join(dataDir, `db.before-prompt-portal-${stamp}.json`);
  fs.renameSync(dbFile, archive);
  console.log(`· archived previous data/db.json → ${path.basename(archive)}`);
}

const { initStore, createRegistration, getDb, saveNow } = await import('../server/store.js');
const { seedAdmin } = await import('../server/auth.js');
const { CATEGORIES, COMPETITION } = await import('../server/competitions.js');

await initStore();
const seeded = await seedAdmin();
console.log(`· admin: ${seeded.email}${seeded.created ? ` (password ${seeded.password})` : ' (already existed)'}`);

const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));

const demo = [
  {
    category: 'video-generation',
    team_name: 'Latent Space',
    leader_name: 'Ayesha Khan',
    leader_email: 'ayesha.khan@cui.edu.pk',
    leader_phone: '03001234567',
    university: 'COMSATS University Islamabad, Vehari Campus',
    city: 'Vehari',
    discipline: 'BS Computer Science',
    semester: '5th',
    cnic: '3520212345671',
    member2_name: 'Bilal Ahmed',
    member2_email: 'bilal.ahmed@cui.edu.pk',
    experience: 'advanced',
    heard_from: 'University announcement',
    status: 'approved',
    payment_status: 'paid',
    note: 'Prompt log verified. Seat confirmed.'
  },
  {
    category: 'website-generation',
    team_name: 'Deploy on Friday',
    leader_name: 'Hamza Tariq',
    leader_email: 'hamza.tariq@cui.edu.pk',
    leader_phone: '03017654321',
    university: 'COMSATS University Islamabad, Sahiwal Campus',
    city: 'Sahiwal',
    discipline: 'BS Software Engineering',
    semester: '7th',
    member2_name: 'Zainab Noor',
    member2_email: 'zainab.noor@cui.edu.pk',
    experience: 'intermediate',
    heard_from: 'Instagram / Facebook',
    status: 'approved',
    payment_status: 'unpaid',
    note: 'Bring your student ID for verification.'
  },
  {
    category: 'image-generation',
    team_name: 'Golden Ratio',
    leader_name: 'Usman Ghani',
    leader_email: 'usman.ghani@uet.edu.pk',
    leader_phone: '03219876543',
    university: 'UET Lahore',
    city: 'Lahore',
    discipline: 'BS Computer Science',
    semester: '3rd',
    member2_name: 'Saad Iqbal',
    member2_email: 'saad.iqbal@uet.edu.pk',
    experience: 'advanced',
    heard_from: 'Previous participant',
    status: 'pending',
    payment_status: 'unpaid',
    note: ''
  },
  {
    category: 'image-editing',
    team_name: 'Stage Fright',
    leader_name: 'Ali Raza',
    leader_email: 'ali.raza@nfc.edu.pk',
    leader_phone: '03211234567',
    university: 'NFC Institute of Engineering & Technology, Multan',
    city: 'Multan',
    discipline: 'BS Electrical Engineering',
    semester: '6th',
    member2_name: '',
    member2_email: '',
    experience: 'beginner',
    heard_from: 'Classmate or friend',
    status: 'pending',
    payment_status: 'unpaid',
    note: ''
  },
  {
    category: 'website-generation',
    team_name: 'Byte Me',
    leader_name: 'Fatima Rehman',
    leader_email: 'fatima.rehman@cui.edu.pk',
    leader_phone: '03451122334',
    university: 'COMSATS University Islamabad, Vehari Campus',
    city: 'Vehari',
    discipline: 'BS Computer Science',
    semester: '4th',
    member2_name: 'Hira Aslam',
    member2_email: 'hira.aslam@cui.edu.pk',
    experience: 'intermediate',
    heard_from: 'University announcement',
    status: 'approved',
    payment_status: 'paid',
    note: 'Preview URL requested at check-in.'
  },
  {
    category: 'video-generation',
    team_name: 'Segfault Squad',
    leader_name: 'Ahmed Nawaz',
    leader_email: 'ahmed.nawaz@bzu.edu.pk',
    leader_phone: '03067788990',
    university: 'Bahauddin Zakariya University, Multan',
    city: 'Multan',
    discipline: 'BS Information Technology',
    semester: '5th',
    member2_name: 'Rida Fatima',
    member2_email: 'rida.fatima@bzu.edu.pk',
    experience: 'beginner',
    heard_from: 'LinkedIn',
    status: 'pending',
    payment_status: 'unpaid',
    note: ''
  },
  {
    category: 'image-editing',
    team_name: 'Prompt Pirates',
    leader_name: 'Sana Malik',
    leader_email: 'sana.malik@cui.edu.pk',
    leader_phone: '03134455667',
    university: 'COMSATS University Islamabad, Vehari Campus',
    city: 'Vehari',
    discipline: 'BS Computer Science',
    semester: '8th',
    member2_name: '',
    member2_email: '',
    experience: 'intermediate',
    heard_from: 'University announcement',
    status: 'pending',
    payment_status: 'unpaid',
    note: ''
  },
  {
    category: 'image-generation',
    team_name: 'Pixel Poets',
    leader_name: 'Bilal Hussain',
    leader_email: 'bilal.hussain@iub.edu.pk',
    leader_phone: '03028899001',
    university: 'The Islamia University of Bahawalpur',
    city: 'Bahawalpur',
    discipline: 'BS Computer Science',
    semester: '2nd',
    member2_name: '',
    member2_email: '',
    experience: 'beginner',
    heard_from: 'Instagram / Facebook',
    status: 'rejected',
    payment_status: 'unpaid',
    note: 'Duplicate entry — same student already registered under another team.'
  },
  {
    category: 'website-generation',
    team_name: 'Runtime Terrors',
    leader_name: 'Noor Fatima',
    leader_email: 'noor.fatima@gcuf.edu.pk',
    leader_phone: '03009876543',
    university: 'Government College University Faisalabad',
    city: 'Faisalabad',
    discipline: 'BS Software Engineering',
    semester: '6th',
    member2_name: 'Areeba Shah',
    member2_email: 'areeba.shah@gcuf.edu.pk',
    experience: 'advanced',
    heard_from: 'Classmate or friend',
    status: 'pending',
    payment_status: 'unpaid',
    note: ''
  },
  {
    category: 'video-generation',
    team_name: 'Frame by Frame',
    leader_name: 'Zeeshan Akram',
    leader_email: 'zeeshan.akram@cui.edu.pk',
    leader_phone: '03337788991',
    university: 'COMSATS University Islamabad, Vehari Campus',
    city: 'Vehari',
    discipline: 'BS Computer Science',
    semester: '7th',
    member2_name: 'Taha Yousaf',
    member2_email: 'taha.yousaf@cui.edu.pk',
    experience: 'advanced',
    heard_from: 'University announcement',
    status: 'pending',
    payment_status: 'unpaid',
    note: ''
  }
];

let added = 0;

for (const [index, entry] of demo.entries()) {
  const category = byCategory[entry.category];
  if (!category) continue;

  const duplicate = getDb().registrations.some((r) => r.leader_email === entry.leader_email);
  if (duplicate) continue;

  const record = await createRegistration(
    {
      competition: COMPETITION.slug,
      competition_name: COMPETITION.name,
      category: category.slug,
      category_name: category.name,
      category_duration: category.duration,
      team_name: entry.team_name,
      leader_name: entry.leader_name,
      leader_email: entry.leader_email,
      leader_phone: entry.leader_phone,
      university: entry.university,
      city: entry.city,
      semester: entry.semester,
      discipline: entry.discipline,
      cnic: entry.cnic || '',
      member2_name: entry.member2_name,
      member2_email: entry.member2_email,
      experience: entry.experience,
      heard_from: entry.heard_from,
      team_size: entry.member2_name ? 2 : 1,
      fee: COMPETITION.fee
    },
    'Demo seed'
  );

  // Mutate directly (no audit noise), then spread dates over the past week.
  const when = new Date(Date.now() - (demo.length - index) * 7 * 60 * 60 * 1000).toISOString();
  record.status = entry.status;
  record.payment_status = entry.payment_status;
  record.admin_notes = entry.note;
  record.created_at = when;
  record.updated_at = when;
  added += 1;
}

await saveNow();
console.log(`· ${added} demo registrations added (${getDb().registrations.length} total)`);
