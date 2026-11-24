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

## 5. Gameplay & Progression Mechanics (FR-02 to FR-10)

### 1. Matchmaking & Duels (FR-03, AC-01)
- Players select a skill domain (**Technical & CS**, **Quantitative Aptitude**, **Logical Reasoning**, **Web Development**, or **Data Structures & Algorithms**).
- Clicking **Find Opponent** places the player into the matchmaking pool.
- As soon as a peer queues in the same category, the server pairs them into a synchronized room and dispatches the exact same question set to both screens.

### 2. Server-Authoritative Timer & Speed Bonus (FR-04, FR-05, AC-02, AC-03)
- Each question runs on a strict server countdown timer (20 seconds).
- **Scoring Formula:**
  $$\text{Points} = \text{Base Points (100)} + (\text{Remaining Seconds} \times 2.5)$$
- When a player answers, their score updates live on their opponent's HUD without a page refresh!
- When the countdown reaches zero, the round automatically closes, reveals the correct option in green, and enters a 3-second intermission before advancing.

### 3. XP Progression & Rank Tiers (FR-02, AC-04)
At the end of every duel, the server awards XP and updates rank tiers:
- **Victory:** `+50 XP`
- **Draw:** `+25 XP`
- **Defeat / Participation:** `+15 XP`

| Rank Tier | Minimum XP | Icon |
|---|---|---|
| **Novice** | 0 XP | 🌱 |
| **Apprentice** | 100 XP | 📜 |
| **Warrior** | 300 XP | 🛡️ |
| **Veteran** | 600 XP | ⚔️ |
| **Master** | 1,000 XP | 💎 |
| **Grandmaster** | 2,000+ XP | 👑 |

### 4. Streaks & Achievement Badges (FR-10)
- **Daily Participation Streaks:** Playing on consecutive days maintains a streak (`🔥`). Reaching 3+ days grants `+10 XP` bonus points per duel; 7+ days grants `+25 XP`.
- **Badges:** Automatically unlocked for milestones (`Arena Initiate`, `First Blood`, `On Fire`, `Centurion`, `Veteran Duelist`, `Grandmaster Champion`).

---

## 6. Project Documentation & Reviews
- **API Contract:** [`docs/API_CONTRACT.md`](./docs/API_CONTRACT.md)
- **Socket.IO Event Specifications:** [`docs/SOCKET_EVENTS.md`](./docs/SOCKET_EVENTS.md)
- **Quiz Content & Anti-Cheat Tests:** [`docs/QUIZ_CONTENT_TESTS.md`](./docs/QUIZ_CONTENT_TESTS.md)
- **Live Demo Video Script:** [`docs/DEMO_VIDEO_SCRIPT.md`](./docs/DEMO_VIDEO_SCRIPT.md)
- **Mid-Point Status Note:** [`docs/MID_POINT_STATUS_NOTE.md`](./docs/MID_POINT_STATUS_NOTE.md)
- **Student 5 (XP & Leaderboard):** Modifying player XP and querying top-ranked players.
