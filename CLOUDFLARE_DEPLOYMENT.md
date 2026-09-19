# Anvi Mitra ERP — Cloudflare Deployment Guide (क्लाउडफ्लेयर डिप्लॉयमेंट गाइड)

Multi-school, multi-branch School ERP ko **Cloudflare** par deploy karne ka complete step-by-step process.

---

## 🏛️ Architecture Overview (आर्किटेक्चर)

```
[ User Browser / Mobile App ]
             │
             ▼
    [ Cloudflare Pages ] (Frontend CDN: HTML, CSS, JS, Portals)
             │
             ├── Static Pages: /attendance.html, /login.html, /index.html
             │
             └── /api/*  ──(Proxied via _redirects or Cloudflare Tunnel)──┐
                                                                          ▼
                                                       [ Anvi Mitra ERP Backend (Node.js) ]
                                                                          │
                                                                          ▼
                                                             [ PostgreSQL Database 16 ]
```

1. **Frontend (क्लाउडफ्लेयर पेजेस - Cloudflare Pages)**:
   - HTML, CSS, JS, Portals (Super Admin, Parent, Student, Teacher Attendance, Fees).
   - Global CDN, Free SSL, Ultra-fast edge caching.
2. **Backend (नोड.जेएस + पोस्टग्रेएसक्यूएल)**:
   - Node.js Express server + PostgreSQL database.
   - Cloudflare Tunnel (`cloudflared`) ya Render / Railway / VPS par Cloudflare DNS Proxy (Orange cloud) ke sath run hota hai.

---

## 🚀 Step 1: Frontend Deploy on Cloudflare Pages (फ्रंटएंड डिप्लॉयमेंट)

### Method: Cloudflare Pages via GitHub (Recommended)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) me login karein.
2. Left menu me **Workers & Pages** par click karein -> **Create Application** -> **Pages** tab select karein -> **Connect to Git** par click karein.
3. Apna GitHub account connect karein aur repository select karein: `rockonallraj/anvimitra-erp`.
4. **Build Settings** configure karein:
   - **Project Name**: `anvimitra-erp` (ya jo aap chahein)
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: *(Empty chhod dein - static files directly serve hongi)*
   - **Build output directory**: `.` *(Root directory)*
5. **Save and Deploy** par click karein.
6. 1 minute me aapka frontend live ho jayega: `https://anvimitra-erp.pages.dev`!

> [!NOTE]
> Repository me humne `_redirects` aur `_headers` already add kar diya hai. Jab aap apna backend URL `_redirects` file me configure kar denge, to frontend se `/api/*` ke calls automatically backend par proxy ho jayenge bina kisi CORS issue ke.

---

## 🗄️ Step 2: Database Setup (डेटाबेस सेटअप)

Backend run karne se pehle PostgreSQL database chahiye:

### Free / Managed Cloud PostgreSQL Options:
1. **Neon PostgreSQL** (https://neon.tech) — Free Serverless Postgres, 1-click setup.
2. **Supabase** (https://supabase.com) — Free Managed Postgres instance.
3. **Render PostgreSQL** (https://render.com) — Easy 1-click Postgres.
4. **Aiven / Railway** (https://aiven.io / https://railway.app).

Connection string format:
```
DATABASE_URL=postgres://username:password@host:5432/database_name?sslmode=require
```

---

## ⚙️ Step 3: Backend Deployment (बैकएंड डिप्लॉयमेंट)

Aap do tarikon me se koi bhi use kar sakte hain:

### Option A: Render / Railway / VPS + Cloudflare DNS (Simplest)
1. [Render](https://render.com) par **New Web Service** create karein.
2. GitHub repo `rockonallraj/anvimitra-erp` connect karein.
3. **Root Directory**: `erp`
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. Environment Variables add karein:
   - `DATABASE_URL`: *(Aapka PostgreSQL URL)*
   - `JWT_SECRET`: *(Koi bhi 32+ characters ka random secret key)*
   - `CORS_ORIGIN`: `*` (ya `https://anvimitra-erp.pages.dev`)
   - `NODE_ENV`: `production`
7. Deploy hone par aapko URL milega (e.g. `https://anvimitra-api.onrender.com`).
8. Cloudflare DNS me custom domain (e.g. `api.anvimitra.com`) CNAME record add karke Cloudflare Proxy (Orange Cloud) on kar dein.

---

### Option B: Cloudflare Tunnel + Docker (Zero Open Ports)
Agar aapke paas koi bhi VPS (DigitalOcean, AWS, Hetzner) ya local server hai:

1. **Docker Compose Run Karein**:
   Repository me provided `docker-compose.yml` se database aur backend start karein:
   ```bash
   docker compose up -d
   ```
2. **Cloudflare Zero Trust Dashboard** (https://one.dash.cloudflare.com/) me jayein:
   - **Networks** -> **Tunnels** -> **Create a Tunnel**
   - Name dein: `anvimitra-erp-tunnel`
   - Install connector command run karein ya Tunnel Token copy karein.
   - **Public Hostname** add karein:
     - Subdomain: `api`
     - Domain: `anvimitra.com`
     - Service Type: `HTTP`
     - URL: `localhost:4000` (ya `erp-api:4000` Docker network me).
3. Ab aapka backend completely secure Cloudflare edge ke through live ho gaya!

---

## 🔗 Step 4: Connecting Frontend to Backend (फ्रंटएंड और बैकएंड को कनेक्ट करना)

Aapke paas 2 aasan vikalp hain:

### Vikalp 1: Cloudflare Pages `_redirects` (Recommended)
`_redirects` file me `api.anvimitra.com` ko apne backend domain se replace karein:
```
/api/*  https://api.anvimitra.com/api/:splat  200
```
Isse frontend par koi bhi API call `/api/auth/login` directly backend ko secure proxy ho jayegi.

### Vikalp 2: Landing Page Par Direct API URL Set Karein
Frontend landing page (`index.html`) par bottom me **Backend API Target** box diya gaya hai. Wahan aap apna backend URL (jaise `https://api.anvimitra.com`) enter karke **Set API URL** par click kar sakte hain.

---

## 🩺 Verification & Health Check

Deployment ke baad browser me check karein:
- **Frontend**: `https://anvimitra-erp.pages.dev`
- **Backend Health**: `https://api.anvimitra.com/api/health`

Response aana chahiye:
```json
{
  "ok": true,
  "service": "anvi-mitra-erp-api",
  "product": "Anvi Mitra ERP",
  "database": "ok",
  "timestamp": "2026-09-19T..."
}
```
Jab database `"ok"` dikhaye, to aapka poora ERP system 100% operational hai!
