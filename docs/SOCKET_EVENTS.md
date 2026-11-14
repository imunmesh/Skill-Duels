# SkillDuels - Socket.IO Real-Time Event Contract
**Document ID:** EDU-WEB-2026-115-WS-v1.0  
**Owner:** Student 2 (Real-Time Match Engine)  
**Collaborators:** Student 3 (React Client), Student 4 (Quiz Content), Student 5 (XP & Rank)  

---

## 1. Connection & Handshake Authentication (NFR-03)

Every WebSocket client must pass a valid JWT in the Socket.IO connection handshake:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('token'), // Bearer JWT token from /api/auth/login
  },
  transports: ['websocket', 'polling'],
});
```

If the token is invalid, missing, or expired, the connection is rejected with an `Authentication error`.

---

## 2. Event Reference Table

### 2.1 Client-to-Server Events (Emitted by Frontend / Student 3)

| Event Name | Payload Format | Description | Handled Requirement |
|---|---|---|---|
| `join_queue` | `{ "category": "technical" \| "aptitude" \| "logical" }` | Places player into matchmaking pool. | **FR-03** |
| `leave_queue` | None | Removes player from matchmaking queue before being paired. | **FR-03** |
| `submit_answer` | `{ "matchId": string, "questionIndex": number, "selectedOptionIndex": number }` | Submits selected answer for current question. Callback supported. | **FR-05, AC-02** |
| `reconnect_match` | None | Reconnects to an active match room after a network drop. | **NFR-04** |

---

### 2.2 Server-to-Client Events (Listened by Frontend / Student 3)

| Event Name | Direction | Payload Example | Description | Handled Requirement |
|---|---|---|---|---|
| `queue_joined` | Server &rarr; Client | `{"category": "technical", "message": "Searching..."}` | Confirms player is placed in matchmaking lobby. | **FR-03** |
| `queue_left` | Server &rarr; Client | `{"success": true}` | Confirms player removed from queue. | **FR-03** |
| `match_start` | Server &rarr; Room | `{"matchId": "match_...", "category": "technical", "opponent": {"userId": "...", "username": "bob"}, "totalQuestions": 3}` | Dispatched when two players are paired into a match room. | **FR-03, AC-01** |
| `new_question` | Server &rarr; Room | `{"id": "tech_01", "questionNumber": 1, "totalQuestions": 3, "category": "technical", "prompt": "...", "options": ["A", "B", "C", "D"], "timeLimit": 10, "points": 100, "remainingSeconds": 10}` | Dispatches next question simultaneously to both players. *Note: Correct answer is hidden.* | **AC-01, FR-04** |
| `timer_tick` | Server &rarr; Room | `{"questionIndex": 0, "remainingSeconds": 7}` | Server-authoritative 1-second countdown clock. | **FR-04, AC-03** |
| `score_update` | Server &rarr; Room | `{"matchId": "match_...", "scores": {"<uid1>": 120, "<uid2>": 0}, "lastAnsweredBy": {"userId": "...", "username": "alice", "hasAnswered": true}}` | Real-time score update broadcast whenever a player submits an answer. | **FR-05, AC-02** |
| `question_ended` | Server &rarr; Room | `{"questionIndex": 0, "correctOptionIndex": 1, "correctOptionText": "Stack", "scores": {"<uid1>": 120, "<uid2>": 0}, "playerResults": [...], "nextInSeconds": 3}` | Broadcast when question timer hits 0 or both players answer. Reveals correct answer. | **FR-04, AC-03** |
| `match_ended` | Server &rarr; Room | `{"matchId": "match_...", "reason": "normal", "winnerId": "...", "isDraw": false, "finalScores": {...}, "players": [{"userId": "...", "username": "alice", "score": 340, "isWinner": true, "xpAwarded": 50, "newTotalXP": 150}]}` | Concludes match, declares winner, and broadcasts XP awarded. | **FR-02, AC-04** |
| `reconnect_available` | Server &rarr; Client | `{"matchId": "match_...", "message": "..."}` | Emitted on connection if user was disconnected from an active match. | **NFR-04** |
| `opponent_disconnected`| Server &rarr; Room | `{"disconnectedUserId": "...", "disconnectedUsername": "bob", "gracePeriodSeconds": 20}` | Broadcast if opponent unexpectedly disconnects. 20s forfeit timer started. | **NFR-04** |
| `opponent_reconnected` | Server &rarr; Room | `{"userId": "...", "username": "bob"}` | Broadcast when opponent reconnects within grace period. | **NFR-04** |
| `match_sync` | Server &rarr; Client | `{"matchId": "...", "state": "in_progress", "currentQuestion": {...}, "remainingSeconds": 6, "scores": {...}}` | Sends full game snapshot to rejoining player. | **NFR-04** |

---

## 3. Teammate Integration Hooks

### Student 4 (Quiz Content & Category Swap)
In `server/src/socket/questionService.js`, swap `fetchMatchQuestions`:
```javascript
const Question = require('../models/Question');

const fetchMatchQuestions = async (category = 'technical', count = 3) => {
  return await Question.aggregate([
    { $match: { category, isActive: true } },
    { $sample: { size: count } }
  ]);
};
```

### Student 5 (XP, Badges & Leaderboards Hook)
In `server/src/socket/xpService.js`, the `awardMatchXP` hook automatically awards XP and can trigger badge calculations:
- Winner: +50 XP
- Draw: +25 XP
- Loser / Participation: +15 XP
- Forfeit: Winner +50 XP
