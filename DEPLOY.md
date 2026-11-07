# Deploy guide — GitHub + Neon + Render (free)

Ye portal Node/Express hai, is liye **Render free web service** par chalega. Render ka free disk
ephemeral hota hai, is liye registrations **Neon free Postgres** me save hongi. Dono free hain.

> **Important:** Render free service 15 minute idle ke baad sleep karti hai; pehla request ~1 minute
> leta hai. Neon free database 5 minute inactivity ke baad scale-to-zero hota hai. Normal event use ke
> liye ye kaafi hai.

---

## 1. GitHub par push

Project folder me:

```bash
git init -b main
git add .
git commit -m "VSPARK 2026 Prompt Engineering registration portal"
```

Phir GitHub par naya **empty** repo banayein (README/gitignore add na karein), e.g.
`vspark-prompt-engineering`, aur:

```bash
git remote add origin https://github.com/<your-username>/vspark-prompt-engineering.git
git push -u origin main
```

VS Code se bhi ho sakta hai: **Source Control ▸ Publish to GitHub**.

`.gitignore` `node_modules/`, `data/`, `.env` aur session secrets ko push hone se rokta hai.

---

## 2. Neon free Postgres

1. [neon.tech](https://neon.tech) par sign up karein (GitHub se).
2. **New Project** → region apne qareeb (Singapore / Frankfurt) → create.
3. Dashboard ▸ **Connect** → **Connection string** copy karein. Pooled connection string
   (`...-pooler...`) best hai.
4. String aisi dikhegi:

```
postgresql://user:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Kuch karne ki zaroorat nahi — app pehli baar chalte hi `portal_state` table khud bana leta hai aur
saara data usi JSONB row me save karta hai.

---

## 3. Render free web service

### Blueprint se (recommended)

1. [render.com](https://render.com) par GitHub se sign up / sign in karein.
2. **New ▸ Blueprint** → apna repo select karein.
3. Render `render.yaml` padh kar service bana dega. Values maangega:
   - `ADMIN_PASSWORD` — apna strong admin password (email `admin@vspark.pk`)
   - `DATABASE_URL` — Neon ka connection string paste karein
4. **Apply / Deploy** dabayein. Pehla build 2–4 minute leta hai.

### Manual se

**New ▸ Web Service** → repo → settings:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Plan | Free |

Environment variables:

| Key | Value |
| --- | --- |
| `NODE_VERSION` | `22.14.0` |
| `SESSION_SECRET` | long random string (32+ chars) |
| `ADMIN_EMAIL` | `admin@vspark.pk` |
| `ADMIN_PASSWORD` | strong password |
| `DATABASE_URL` | Neon connection string |

Deploy ke baad logs me ye line dikhni chahiye:

```
Storage: PostgreSQL (DATABASE_URL)
```

Agar `Storage: local JSON file` dikhe to `DATABASE_URL` set nahi hua — variable add karke redeploy
karein.

---

## 4. Deploy ke baad checks

1. `https://<service>.onrender.com/api/health` → `{"ok":true,...}`
2. Home page kholein → hero, four categories, register button.
3. Ek test registration karein → team code mile.
4. Admin login → **Registrations** me wahi entry category ke saath dikhe.
5. Render ▸ **Manual Deploy ▸ Restart** karein, phir admin me entry dobara dekhein — data rehna chahiye
   (Postgres confirm).
6. Test entry delete karein.

---

## 5. Free-tier limits (2026)

| Cheez | Limit |
| --- | --- |
| Render web service | 750 instance hours/month, 15-min idle sleep, ephemeral disk |
| Neon Postgres | 1 GB storage, 100 compute-hours/month per project, scale-to-zero |
| Bandwidth | Render free monthly allowance; Neon 5 GB/project |

Event se pehle admin dashboard kholte rehna sleep se bachata hai, lekin zaroori nahi — pehla request
bas thora slow hoga.

---

## 6. Railway (alternative)

Railway ka permanent free plan sirf **$1/month credit** deta hai, jo 24/7 Node service ke liye kaafi
nahi. Agar Railway use karna ho:

1. Railway par GitHub se sign in → **New Project ▸ Deploy from GitHub repo**.
2. `DATABASE_URL` me Neon string add karein (Railway ka apna Postgres bhi use kar sakte hain).
3. Settings ▸ **Generate Domain** se public URL lein.

Free credit khatam hone par service ruk sakti hai, is liye Render + Neon zyada predictable hai.

---

## 7. Security notes

- `ADMIN_PASSWORD` sirf **fresh database** par seed hota hai. Deploy ke foran baad admin portal ▸
  Settings se password change karein.
- `SESSION_SECRET` Render par auto-generate hota hai (blueprint) ya aap khud set karein. Iske baghair
  har restart par admin sessions invalid ho jate hain.
- Kabhi bhi `.env` ya Neon connection string GitHub par commit na karein.
- Ye portal public internet par hoga, is liye student data (email/phone) sirf admin login ke peeche
  rehta hai — admin password strong rakhein.
