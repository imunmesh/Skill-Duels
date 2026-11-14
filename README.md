# SkillDuels - Backend Core Foundation & Authentication Platform

[![Document ID](https://img.shields.io/badge/Doc%20ID-EDU--WEB--2026--115--SRS--v1.2-blue.svg)](#)
[![Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20Express%20%7C%20MongoDB%20%7C%20JWT-brightgreen.svg)](#)
[![Security](https://img.shields.io/badge/Security-NFR--03%20Compliant-orange.svg)](#)

SkillDuels is a gamified web platform that promotes competitive learning by letting students challenge each other in 1v1 quizzes and skill-based games with live score synchronisation, virtual XP, ranks, and leaderboards.

---

## 1. Project Folder Structure

```
Skill duel/
├── .env.example              # Root environment template
├── .gitignore                # Git ignore rules (secrets, dependencies, logs)
├── .prettierrc               # Prettier code formatting rules
├── .prettierignore           # Prettier ignore rules
├── package.json              # Monorepo root script runner
├── README.md                 # Complete system documentation & setup guide
├── docs/
│   └── API_CONTRACT.md       # API contract & teammate integration specifications
├── client/                   # React Frontend (Student 3)
│   └── README.md             # Client specifications & instructions
└── server/                   # Express + Socket.IO Backend
    ├── .env.example          # Server environment variable template
    ├── .eslintrc.json        # ESLint syntax & style rules
    ├── package.json          # Server dependencies & scripts
    └── src/
        ├── app.js            # Express application configuration & routing
        ├── server.js         # HTTP server instance & graceful shutdown
        ├── config/
        │   └── db.js         # Mongoose connection & reconnection handling
        ├── controllers/
        │   └── auth.controller.js  # Register, login, getMe controller logic
        ├── middleware/
        │   ├── auth.middleware.js   # JWT verification & role authorization (NFR-03)
        │   └── error.middleware.js  # 404 & centralized error handling
        ├── models/
        │   └── User.js       # Mongoose User schema (XP, rank, badges, role)
        └── routes/
            ├── auth.routes.js # /api/auth routes (register, login, me)
            └── test.routes.js # /api/test routes (public, player, admin)
```

---

## 2. Prerequisites

- **Node.js**: `v18.x` or later
- **npm**: `v9.x` or later
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or free MongoDB Atlas cluster

---

## 3. Quickstart & Setup Guide

### Step 1: Install Server Dependencies
From the repository root or inside `server/`:
```bash
cd server
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to create your local `.env` (never commit `.env` to Git - NFR-03):
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Adjust values if necessary:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/skillduels
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### Step 3: Run the Development Server
```bash
npm run dev
```

The server will initialize:
```text
===============================================
 SkillDuels Backend API Server running on port 5000
 Environment: development
 Health Check: http://localhost:5000/api/health
===============================================
[Database] MongoDB Connected: 127.0.0.1/skillduels
```

### Step 4: Run Code Quality Checks
```bash
npm run lint
```

---

## 4. Architecture & Security (NFR-03, NFR-08)

### Security Features
1. **Password Hashing:** Uses `bcryptjs` with 10 salt rounds before persisting credentials.
2. **Data Sanitization:** The `passwordHash` field is marked `select: false` and explicitly stripped by a Mongoose `toJSON` transform to prevent accidental leaks.
3. **Role-Based Access Control (RBAC):** Middleware checks `req.user.role` against authorized roles (`'player'`, `'admin'`).
4. **Token Expiration:** JWTs are issued with configurable expiration (default 7 days).
5. **No Secrets in Repo:** All sensitive connection strings and secrets reside strictly in `.env`.

---

## 5. Teammate API Integration Contract

See [`docs/API_CONTRACT.md`](./docs/API_CONTRACT.md) for detailed JSON payloads and instructions for:
- **Student 2 (Match Engine):** Using `authenticateSocket` for Socket.IO handshake auth.
- **Student 3 (React Client):** Sending `Bearer <token>` headers and handling errors.
- **Student 4 (Admin / Quiz Content):** Securing quiz management routes using `requireRole('admin')`.
- **Student 5 (XP & Leaderboard):** Modifying player XP and querying top-ranked players.
