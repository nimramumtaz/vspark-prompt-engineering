# VSPARK 2026 — Prompt Engineering Registration Portal

A complete registration website for **Prompt Engineering**, the AI competition at **VSPARK 2026**,
COMSATS University Islamabad, Vehari Campus.

This portal is for **one competition only**. Students register for Prompt Engineering and choose one of
four prompt categories:

| Category | Challenge | Time | Deliverable |
| --- | --- | --- | --- |
| Video Generation | Scenario + reference images → an original AI video | 120 min | Playable MP4 + prompt log |
| Website Generation | Product brief → a working, responsive website | 120 min | Live preview + prompt log |
| Image Generation | Creative brief → an original image set | 90 min | Images + prompt log |
| Image Editing | Supplied photographs → prompt-based edits | 90 min | Before/after set + prompt log |

Registration fee: **PKR 1,000 per team** · Solo or team of 2 · Event date: **December 10, 2026**.

Theme: white + royal blue, Sora / Plus Jakarta Sans, university photo hero — the same look as the
VSPARK reference site, rebuilt as a focused Prompt Engineering portal.

---

## 1. Quick start (Roman Urdu)

```bash
# 1) Project folder VS Code mein kholein: File ▸ Open Folder ▸ VSPARK
# 2) Terminal kholein aur likhein:
npm install
npm start
```

Ya Windows par simply **`start.bat`** par double-click karein — dependencies install hongi, server chalega
 aur browser khud khul jayega.

Phir browser mein kholein:

| Page | Link |
| --- | --- |
| Public portal | http://localhost:3000 |
| Registration form | http://localhost:3000/register.html |
| Track status | http://localhost:3000/status.html |
| Admin login | http://localhost:3000/admin/login.html |

**Admin login (first run):**

```
email:    admin@vspark.pk
password: Vspark@2026
```

Student jab form submit karega, entry foran admin dashboard ke **Registrations** tab mein aa jayegi,
category ke saath. Band karne ke liye terminal mein `Ctrl + C`.

> Node.js 18 ya us se naya install hona chahiye (`node -v` se check karein).

---

## 2. Tech stack

| Layer | Technology |
| --- | --- |
| Server | Node.js + Express 4 (ES modules) |
| Database | Local: JSON document store with atomic writes (`data/db.json`). Production: PostgreSQL via `DATABASE_URL` (Neon free tier), same document stored as JSONB |
| Auth | scrypt password hashing + HMAC-signed, HttpOnly session cookie, brute-force rate limiting |
| Frontend | Hand-written HTML5, modern CSS (custom design system, grid/flex, no framework) and vanilla ES2020 JS |
| Charts | Pure CSS bar/status bars (no chart library) |
| CSV export | Server-generated, Excel-friendly UTF-8 CSV |

Zero front-end build step: the browser loads the same files that live in this folder, so you can edit any
`.html`, `.css` or `.js` file and refresh.

---

## 3. Folder structure

```
vspark/
├─ server/
│  ├─ index.js            Express app, security headers, static hosting, page routes
│  ├─ competitions.js     ⭐ Competition, fee, four categories, rules + judging (single source of truth)
│  ├─ store.js            JSON data store (registrations, admins, activity log, stats, filters)
│  ├─ auth.js             Password hashing, session tokens, auth middleware, admin seeding
│  ├─ validate.js         Input validation + sanitisation, category check, same-origin guard
│  └─ routes/
│     ├─ public.js        /api/register, /api/status, /api/config, /api/categories, /api/stats
│     └─ admin.js         /api/admin/* (login, registrations, stats, activity, CSV, password)
├─ views/
│  └─ admin/dashboard.html   Protected dashboard (never served to signed-out visitors)
├─ public/
│  ├─ index.html          Prompt Engineering home: hero, stats, categories, format, rules, schedule, FAQ
│  ├─ register.html       Registration form with prompt-category selector + live summary
│  ├─ status.html         Track registration with team code + email
│  ├─ 404.html            Branded not-found page
│  ├─ admin/login.html    Admin sign-in (split-screen design)
│  ├─ css/styles.css      Public design system
│  ├─ css/admin.css       Admin portal styles
│  ├─ js/ui.js            Shared helpers (fetch wrapper, toasts, badges, formatting)
│  ├─ js/main.js          Header, mobile nav, reveal animations, live counters, countdown
│  ├─ js/register.js      Category selection, validation, summary, submit, success panel
│  ├─ js/status.js        Status lookup + progress tracker
│  ├─ js/login.js         Admin sign-in
│  ├─ js/admin.js         Dashboard: KPIs, category chart, table, filters, pagination, drawer, CSV
│  └─ assets/             University photo, icon sprite, favicon, footer emblem
├─ scripts/
│  ├─ seed-demo.mjs       Demo registrations across the four categories (npm run seed / reset)
│  ├─ bump-assets.mjs     Stamps a version on CSS links so edits show instantly
│  ├─ test-pg-store.mjs   Postgres persistence regression test (pg-mem, no server needed)
│  └─ smoke-test.mjs      End-to-end API test on a temporary data directory
├─ .github/workflows/ci.yml  GitHub Actions: npm ci + npm test
├─ render.yaml            Render free web service blueprint
├─ DEPLOY.md              GitHub + Neon Postgres + Render deployment guide
├─ data/                  Created at runtime: db.json + session-secret.txt (git-ignored)
├─ .env.example           Optional overrides (PORT, admin credentials, session secret, DATABASE_URL)
├─ start.bat              Windows launcher (install + start + open browser)
└─ package.json
```

---

## 4. Features

### Public side
- Hero with the university photograph, **PROMPT ENGINEERING** title, event date, venue, PKR 1,000 fee note
  and a live "days to go" countdown.
- Live counters (prompt categories, participants, universities) fed by the API.
- Four prompt-category cards with descriptions, focus points, timings and direct register links.
- Challenge format steps, rules, scorecard (prompt craft 30, scenario accuracy 30, visual quality 25,
  creativity 15), event-day timeline and starter prompt patterns.
- FAQ specific to categories, allowed tools, submissions and fees.
- Registration form: **prompt category selector**, team name, leader details, CNIC auto-formatting,
  optional second member, experience, referral source and rules consent.
- Live summary (category, challenge time, team size, fee), inline field errors, duplicate-email
  protection, instant team code (`PE-26-0001`), copy-to-clipboard and a success panel.
- **Track Status** page: team code + leader email shows live status, payment state, prompt category and
  duration, progress steps and organiser notes.

### Admin portal
- Secure sign-in with rate limiting, hashed passwords and HttpOnly session cookie.
- Overview: total registrations, pending review, approved entries, fees collected, expected vs
  outstanding fees, participants, universities, approval rate, registrations **per prompt category** and
  status breakdown.
- Latest registrations table + audit activity log.
- Registrations: search across team/leader/email/code/university/category, filter by **prompt category**,
  status and payment, sort, paginate, and open a detail drawer.
- Detail drawer: full team/academic data, prompt category and category time, clickable email/phone,
  approve / mark pending / reject, toggle payment, write a note the student sees on the status page,
  delete with confirmation.
- CSV export that respects the active filters and includes the prompt category column.
- Settings: change password, account and event information.

### Engineering details
- Server-side validation of every field; the category must be one of the four allowed slugs and the fee is
  set on the server, never trusted from the browser.
- One entry per email address; duplicates are rejected with a clear message.
- Cross-origin form posts are rejected (Origin check) on all mutating endpoints.
- Security headers incl. CSP, `X-Frame-Options`, `nosniff`, referrer policy.
- Content-Security-Policy allows only self + Google Fonts; no inline scripts anywhere.
- Local JSON writes are atomic (temp file + rename); production writes are awaited to PostgreSQL before the request returns.
- The Postgres layer stores the same document as a single JSONB row, auto-creates its table, and falls back to the JSON file when `DATABASE_URL` is absent.
- Responsive from 390 px phones to wide desktops; keyboard-focus styles and reduced-motion support.
- Accessible markup: landmarks, labels on every input, `aria-*` on interactive controls, visible focus.

---

## 5. Useful commands

```bash
npm start           # run the server (http://localhost:3000)
npm run dev         # run with auto-restart on file changes
npm run seed        # add demo registrations to the current database
npm run reset       # archive data/db.json, then seed fresh (stop the server first)
npm run assets 10   # re-stamp CSS cache-busting version after design edits
npm test            # Postgres store test + end-to-end smoke test
```

> `npm run reset` does not delete your data. It renames the old `data/db.json` to
> `data/db.before-prompt-portal-<timestamp>.json` before creating a new one.

---

## 6. Deployment (free)

Full step-by-step guide: [DEPLOY.md](DEPLOY.md).

- **GitHub** par repo push karein (`node_modules/`, `data/`, `.env` already ignored).
- **Neon** (free) se Postgres connection string lein.
- **Render** par **New ▸ Blueprint** → repo select → `ADMIN_PASSWORD` aur `DATABASE_URL` daalein → deploy.

Deploy logs me `Storage: PostgreSQL (DATABASE_URL)` dikhna chahiye. `render.yaml` me free plan,
health check aur auto-generated `SESSION_SECRET` already set hain. Bina `DATABASE_URL` ke app chalega
lekin Render ka free disk ephemeral hai — registrations restart par reset ho jayengi.

## 7. Customising

| What | Where |
| --- | --- |
| Event name, date, venue, contact details, closing date | `server/competitions.js` → `EVENT` |
| Fee, team limit, description, judging weights | `server/competitions.js` → `COMPETITION` |
| The four prompt categories, names, durations, focus points | `server/competitions.js` → `CATEGORIES` |
| Category cards and copy on the homepage | `public/index.html` |
| Registration form fields / validation rules | `public/register.html`, `public/js/register.js`, `server/validate.js` |
| Colours, spacing, typography | `public/css/styles.css` (`:root` tokens at the top) |
| Admin look and feel | `public/css/admin.css` |
| Admin email/password for a *fresh* database | `.env` (copy `.env.example`) or `npm run reset` |
| Change password at any time | Admin portal ▸ Settings ▸ Change password |

Example `.env`:

```
PORT=3000
ADMIN_EMAIL=admin@vspark.pk
ADMIN_PASSWORD=Vspark@2026
ADMIN_NAME=VSPARK Admin
SESSION_SECRET=change-this-to-a-long-random-string
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
```

> The seeded admin account is only created when the database has no admin. To re-seed after changing
> these values, stop the server, run `npm run reset`, and start it again.

After editing CSS, run `npm run assets <number>` (e.g. `npm run assets 9`) so browsers pick up the new
stylesheet immediately. HTML/JS are always revalidated.

---

## 8. API reference (quick)

Public:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/config` | Event, competition and the four categories |
| GET | `/api/categories` | Prompt categories only |
| GET | `/api/stats` | Aggregate participant/university/category counts |
| POST | `/api/register` | Create a registration (requires `category`) |
| GET | `/api/status?code=&email=` | Look up one registration |

Admin (session cookie required):

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/admin/login` / `logout` | Session handling |
| GET | `/api/admin/me` | Current admin |
| GET | `/api/admin/stats` | Dashboard numbers, including `byCategory` |
| GET | `/api/admin/registrations` | Search / filter (`category`, `status`, `payment`) / paginate |
| GET | `/api/admin/registrations/:id` | One registration + category details |
| PATCH | `/api/admin/registrations/:id` | Status, payment, notes |
| DELETE | `/api/admin/registrations/:id` | Remove a registration |
| GET | `/api/admin/export.csv` | CSV of the current filter |
| GET | `/api/admin/activity` | Audit log |
| POST | `/api/admin/password` | Change password |

---

## 9. Notes for the competition submission

- The portal follows the official *Prompt Engineering Competition* rules: teams of up to 2, PKR 1,000 fee,
  own laptops and tool accounts, structured prompts, output created during the competition and a prompt
  log submitted for judging. The official document describes the **AI Video Generation** challenge; the
  other three categories use the same format with the timings set in `server/competitions.js` — adjust
  those values if the organisers publish different durations.
- Demo data is loaded so the admin dashboard is not empty on first run. Use **Registrations ▸ Delete** or
  `npm run reset` to start clean.
- Locally all student data lives in `data/db.json`; on Render it is stored in your own Neon Postgres database. Nothing is sent to any third-party analytics service.
