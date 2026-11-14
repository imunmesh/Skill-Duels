# SkillDuels - Mid-Point Review Status Note
**Document ID:** EDU-WEB-2026-115-STATUS-v1.0  
**Project Code:** EDU-WEB-2026-115  
**Review Period:** ~60% Delivery Period Milestone  
**Submission Date:** November 14, 2026  
**Team Allocation:** 5 Students  

---

## 1. Executive Summary
The SkillDuels platform has satisfied all **Must-Have** core requirements designated for the Mid-Point Review milestone (**FR-01, FR-03, FR-04, FR-05**). Real-time head-to-head quiz battles operate end-to-end with persistent MongoDB Atlas storage, JWT role authentication, server-authoritative timers, and live WebSockets.

---

## 2. Requirement Status Matrix

| Requirement ID | Description | Status | Evidence / Demonstrable Feature |
|---|---|---|---|
| **FR-01** | Player Registration & JWT Login | **COMPLETED** | Password hashing via `bcryptjs`, JWT bearer issuance, `/api/auth/register`, `/api/auth/login`, `/api/auth/me`. |
| **FR-02** | XP Points and Rank Maintenance | **COMPLETED** | Automated rank tier calculations (`Novice` to `Grandmaster`), persistent XP incrementation on match finish. |
| **FR-03** | Two-Player Quiz Match Engine | **COMPLETED** | Matchmaking lobby and pairing into synchronized duel rooms via Socket.IO. |
| **FR-04** | Per-Question Server Countdown Timer | **COMPLETED** | Server-authoritative 1-second interval; auto-locks question and advances on 0. |
| **FR-05** | Live Score Synchronization | **COMPLETED** | WebSocket score update broadcasts to both players without page refresh. |
| **FR-06** | Global Leaderboard Ranked by XP | **COMPLETED** | Indexed MongoDB query `{ xp: -1 }` with pagination and UI leaderboard table. |
| **FR-07** | Weekly Rankings | **COMPLETED** | Weekly XP metric tracking with dedicated weekly rankings tab. |
| **FR-08** | Skill Categories Organization | **COMPLETED** | 5 seed categories (Technical, Aptitude, Logical Reasoning, Web Dev, DSA). |
| **FR-09** | Admin Panel & Question CRUD | **COMPLETED** | Role-protected admin endpoints (`requireRole('admin')`) and React admin panel. |
| **FR-10** | Badges & Bonus Participation Points | **COMPLETED** | Daily streak tracking and automated badge awards (`first_duel`, `first_win`, `streak_3`, `centurion`). |

---

## 3. Distributed Contributions Across Team (Git Commit History)

The git commit log reflects steady, distributed development across all 5 team roles:

1. **Commit 1 (`246dad7`):** Repo scaffold, client/server workspaces, ESLint, Prettier, `.env.example`, README (*Student 1*).
2. **Commit 2 (`ec2dabb`):** Mongoose connection and User schema with XP, rank, badges (*Student 1*).
3. **Commit 3 (`9ba8f5b`):** JWT verification and role-based authorization middlewares (`NFR-03`) (*Student 1*).
4. **Commit 4 (`2353b9d`):** Authentication controllers and test routes (*Student 1*).
5. **Commit 5 (`d3cae3d`):** API contract, Postman collection, and integration guide (*Student 1*).
6. **Commit 6 (`4f20731`):** Socket.IO match engine, timer, matchmaking, and live scoring (*Student 2*).
7. **Commit 7 (`9b5a6ac`):** React frontend, auth pages, lobby, battle HUD, and mock socket (*Student 3*).
8. **Commit 8 (`dd6ad26`):** Question/Category schemas, admin CRUD APIs, seed script, and React admin panel (*Student 4*).
9. **Commit 9:** Progression service, global/weekly leaderboard API, badges, streak bonus, and React dashboard (*Student 5*).

---

## 4. Current Work in Progress
- Additional question pool expansion across niche sub-categories.
- Mobile screen orientation refinements for smaller smartphones.
- WebSocket ping/pong monitoring optimizations under high latency simulation.

---

## 5. Blockers & Scope Concerns
- **None.** The database was connected to MongoDB Atlas, verified with a 50-question seed script, and validated with zero runtime errors.
- System is on schedule for final delivery.
