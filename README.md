# 💠 FINVAULT — Personal Finance Ledger

A cinematic neon-noir personal finance tracker with translucent glass UI.

## 🔑 Default Login
- **Username:** `admin`
- **Password:** `admin123`

> ⚠️ Change the default password after first login via User Management.

---

## 🚀 Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. Vercel auto-detects `vercel.json` — click **Deploy**
5. Done ✅

**Or via CLI:**
```bash
npm i -g vercel
cd finvault
vercel
```

---

## 🚀 Deploy to Render

1. Push this folder to a GitHub repo
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Click **Deploy** ✅

**Or Render detects `render.yaml` automatically.**

---

## 📁 Project Structure

```
finvault/
├── public/
│   └── index.html      ← Full app (single file)
├── server.js           ← Express static server
├── package.json
├── vercel.json         ← Vercel config
├── render.yaml         ← Render config
└── README.md
```

---

## ✨ Features

| Module | Description |
|---|---|
| 📊 Dashboard | Live stats ticker, net balance, pending loans |
| 💰 Income | Log earnings with categories |
| 🧾 Expenses | Track all spending |
| 🤝 Loans Given | Friends loan tracker with return status |
| 🏦 Bank Loans | Bank borrowings with interest rate & EMI |
| 💸 Interest | Log all interest/EMI payments |
| 👤 Users | Admin-only user registration & management |

---

## 🔒 Data Storage
Data is stored in the browser's **localStorage** — private to each device/browser.
For multi-device sync, a backend database integration (MongoDB, Supabase, etc.) can be added.
