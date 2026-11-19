# EV Hub — Multi-Team Collaboration

## Project Overview

EV Hub is an electric vehicle charging platform with:
- **Backend**: Express + MySQL API with JWT auth, waitlist, reports, sessions
- **Frontend**: React + Vite with Leaflet maps, station dashboard, admin panel
- **Database**: MySQL (Aiven Cloud) with schema for users, stations, connectors, sessions, waitlist, reports

---

## 👥 Team Collaboration Structure

This is a **single repository** with three teams working in parallel:

| Team | Responsibility | Folder | Branch |
|------|---------------|--------|--------|
| **Backend** | API, auth, services, database schema | `backend/` | `feature/*` → `develop` |
| **Frontend** | React UI, maps, admin panel | `frontend/` | `feature/*` → `develop` |
| **Database** | Schema only (`schema.sql`) | `backend/database/` | `feature/*` → `develop` |

---

## 🌿 Branch Strategy

```
main          # Production-ready (protected)
└── develop   # Integration branch (where features merge)
```

### Workflow:

1. Create feature branch from `develop`
2. Make changes in your area
3. Push feature branch to GitHub
4. Create Pull Request: `feature/*` → `develop`
5. After approval, merge to `develop`
6. When ready for production: `git checkout main && git merge develop`

---

## 📁 Folder Responsibilities

| Folder | Who Modifies It | Example Changes |
|--------|----------------|-----------------|
| `backend/` | Backend team | Controllers, routes, services, API logic |
| `frontend/` | Frontend team | React components, pages, maps, UI |
| `backend/database/` | Database team | `schema.sql` only (never code) |
| `.env*` | Each team member locally | Database creds, API keys (NOT committed) |

---

## 🚀 Running the Project

### **Backend:**

```bash
cd backend
npm install
copy .env.example .env  # Fill in your values
npm run dev  # or: nodemon server.js
```

### **Frontend:**

```bash
cd frontend
npm install
copy .env.example .env  # Edit API URLs
npm run dev  #: vite
```

### **Both Together:**

```bash
# From project root
concurrently "cd backend && npm run dev" "cd frontend && npm run dev"
```

---

## ⚙️ Setup Instructions

### **1. Project Owner: Initialize Git**

```bash
cd "C:\Users\HP\Desktop\ev-charging-bhutan"
git init
git add .
git commit -m "feat: initial project structure"
git remote add origin git@github.com:your-org/ev-charging-bhutan.git
git push -u origin main
git checkout -b develop
git push -u origin develop
```

### **2. Team Members: Clone & Setup**

```bash
git clone git@github.com:your-org/ev-charging-bhutan.git
cd ev-charging-bhutan

:: Create local .env files (fill in own values)
copy backend\.env.example backend\.env
:: Edit: DB_HOST, DB_PASS, JWT_SECRET, SMTP_PASS, etc.

copy frontend\.env.example frontend\.env
:: Edit: VITE_API_BASE_URL, VITE_GOOGLE_MAPS_API_KEY

npm install (backend)
npm install (frontend)
```