import { COMPETITION, getCategory } from './competitions.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Trim, collapse whitespace, drop control characters and cap length. */
export function clean(value, max = 200) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function isEmail(value) {
  return EMAIL_RE.test(String(value || '')) && String(value).length <= 120;
}

export function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

export function isPhone(value) {
  const digits = normalizePhone(value).replace(/^\+/, '');
  return digits.length >= 10 && digits.length <= 15;
}

/** Accepts 12345-1234567-1 or 13 plain digits. Returns 13 digits or ''. */
export function normalizeCnic(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 13 ? digits : '';
}

const EXPERIENCE = new Set(['beginner', 'intermediate', 'advanced']);

export function validateRegistration(body = {}) {
  const errors = {};

  const category = getCategory(clean(body.category, 60));
  if (!category) errors.category = 'Choose the prompt category you are entering.';

  const team_name = clean(body.team_name, 60);
  if (team_name.length < 3) errors.team_name = 'Team name must be at least 3 characters.';

  const leader_name = clean(body.leader_name, 80);
  if (leader_name.length < 3) errors.leader_name = 'Please enter the leader’s full name.';

  const leader_email = clean(body.leader_email, 120).toLowerCase();
  if (!isEmail(leader_email)) errors.leader_email = 'Enter a valid email address.';

  const leader_phone = normalizePhone(body.leader_phone);
  if (!isPhone(leader_phone)) errors.leader_phone = 'Enter a valid phone number (10–15 digits).';

  const university = clean(body.university, 120);
  if (university.length < 2) errors.university = 'Please enter your university or institute.';

  const city = clean(body.city, 60);
  const semester = clean(body.semester, 40);
  const discipline = clean(body.discipline, 80);

  const cnicRaw = clean(body.cnic, 20);
  let cnic = '';
  if (cnicRaw) {
    cnic = normalizeCnic(cnicRaw);
    if (!cnic) errors.cnic = 'CNIC / B-Form must contain 13 digits.';
  }

  const experience = EXPERIENCE.has(clean(body.experience, 20)) ? clean(body.experience, 20) : 'beginner';
  const heard_from = clean(body.heard_from, 60);

  let member2_name = clean(body.member2_name, 80);
  let member2_email = clean(body.member2_email, 120).toLowerCase();
  const hasSecond = Boolean(member2_name || member2_email);

  if (hasSecond) {
    if (member2_name.length < 3) errors.member2_name = 'Please enter the second member’s full name.';
    if (!isEmail(member2_email)) errors.member2_email = 'Enter a valid email for the second member.';
    if (member2_email && member2_email === leader_email) {
      errors.member2_email = 'Second member must use a different email.';
    }
  } else {
    member2_name = '';
    member2_email = '';
  }

  if (body.agree !== true && body.agree !== 'true' && body.agree !== 'on') {
    errors.agree = 'You must accept the competition rules to register.';
  }

  const record = {
    competition: COMPETITION.slug,
    competition_name: COMPETITION.name,
    category: category ? category.slug : '',
    category_name: category ? category.name : '',
    category_duration: category ? category.duration : '',
    team_name,
    leader_name,
    leader_email,
    leader_phone,
    university,
    city,
    semester,
    discipline,
    cnic,
    member2_name,
    member2_email,
    experience,
    heard_from,
    team_size: hasSecond ? 2 : 1,
    fee: COMPETITION.fee
  };

  return { errors, record, valid: Object.keys(errors).length === 0 };
}

export function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin form posts / curl without Origin
  try {
    const url = new URL(origin);
    return url.host === req.headers.host;
  } catch {
    return false;
  }
}
