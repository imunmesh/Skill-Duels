# SkillDuels - 3-5 Minute Live Dual Demo Video Script
**Document ID:** EDU-WEB-2026-115-DEMO-v1.0  
**Project:** SkillDuels: Competitive Learning & Quiz Battle Platform  
**Target Submission:** Mid-Point Review & Final Acceptance Evaluation  
**Demonstrating Requirements:** FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, AC-01 to AC-05  

---

## Pre-Recording Setup (2 Browsers Side-by-Side)
- **Left Browser Window (Window A):** `http://localhost:5173` (Player 1: `alex_player`)
- **Right Browser Window (Window B):** `http://localhost:5173` in Incognito (Player 2: `jordan_rival`)
- **Backend Running:** `cd server && npm run dev`
- **Resolution:** 1080p 60fps screen recording, windows tiled 50/50 side by side.

---

## Detailed Script & Timeline (Total Duration: 4 Minutes)

### Part 1: Architecture & Authentication (0:00 - 0:45)
- **Visual:** Both windows show the SkillDuels login screen.
- **Narrator Voiceover:**
  > "Welcome to our live demonstration of SkillDuels, a gamified 1v1 quiz battle platform built using MongoDB, Express, React, Node.js, and real-time Socket.IO communication.
  > On the left, we log in as Player 1 ('alex_player'), and on the right, we log in as Player 2 ('jordan_rival'). Our platform verifies JWT authentication and retrieves each player's persistent XP, rank tier, and active daily streak from MongoDB."
- **Action on Screen:**
  1. Window A logs in with `player1@skillduels.com` / `Player123!`.
  2. Window B logs in with `player2@skillduels.com` / `Player123!`.
  3. Both windows display the Arena Lobby with XP indicators (`250 XP - Apprentice` vs `180 XP - Novice`).

---

### Part 2: Matchmaking & Shared Question Dispatch (0:45 - 1:30)
- **Visual:** Category selection and pairing into a duel room.
- **Narrator Voiceover:**
  > "Now, demonstrating Functional Requirement FR-03 and Acceptance Criterion AC-01.
  > Both players choose the 'Technical & CS' skill category. When Alex clicks 'Find Opponent', they enter our matchmaking queue with a pulsing radar state.
  > When Jordan clicks 'Find Opponent', the server immediately pairs them into a synchronized battle room and dispatches the exact same question set to both players."
- **Action on Screen:**
  1. Window A selects 'Technical & CS' and clicks **Find Opponent** (Queue counter starts).
  2. Window B selects 'Technical & CS' and clicks **Find Opponent**.
  3. Server automatically fires `match_start` and pairs them into `match_<id>`.
  4. Both screens transition simultaneously to the 1v1 Battle HUD.

---

### Part 3: Live Duel, Server Timer, & Real-Time Scoring (1:30 - 2:45)
- **Visual:** Head-to-head match gameplay across 3 questions.
- **Narrator Voiceover:**
  > "Demonstrating FR-04, FR-05, and Acceptance Criteria AC-02 and AC-03:
  > Notice the server-authoritative countdown timer ticking down synchronously on both screens.
  > On Question 1, Alex presses the hotkey '2' on their keyboard to lock in 'Stack'. Instantly, without any page refresh, Jordan's screen updates to show that Alex has answered and shows their updated live score of 150 points!
  > Jordan answers with Option 3 and receives 0 points for an incorrect choice.
  > When both answer or the timer hits zero, the question automatically closes, reveals the correct option in green, and enters a 3-second intermission before the next round."
- **Action on Screen:**
  1. **Question 1:** Alex answers correctly. Live scores update in real-time (`Alex: 150 | Jordan: 0`).
  2. Round concludes, showing the correct answer highlight.
  3. **Question 2:** Jordan answers faster and earns speed bonus points (`Alex: 300 | Jordan: 145`).
  4. **Question 3:** Final question concludes.

---

### Part 4: Match Conclusion & XP Progression (2:45 - 3:30)
- **Visual:** Result screen showing winner declaration and XP awards.
- **Narrator Voiceover:**
  > "Demonstrating FR-02 and Acceptance Criterion AC-04:
  > At the end of the duel, the match engine records the final outcome in MongoDB. Alex is crowned the Winner with 300 points, earning +50 XP. Jordan receives a +15 XP participation bonus.
  > Notice the streak counter and profile progress bar updating seamlessly."
- **Action on Screen:**
  1. Alex sees the 'Victory!' screen with gold trophy and XP gain.
  2. Jordan sees the 'Battle Ended' screen with their earned XP.

---

### Part 5: Global & Weekly Leaderboard (3:30 - 4:00)
- **Visual:** Clicking into the Leaderboard & Profile tab.
- **Narrator Voiceover:**
  > "Finally, demonstrating FR-06, FR-07, and AC-05:
  > Clicking on the Leaderboard tab opens our live rankings. Players are dynamically ranked in descending order of XP earned.
  > Users can toggle between Global All-Time rankings and Weekly rankings, inspect unlocked achievement badges like 'First Blood' and 'Centurion', and review their full match history."
- **Action on Screen:**
  1. Click 'Leaderboard' in the navbar.
  2. Toggle between Global and Weekly tabs.
  3. Highlight player's rank card and newly unlocked badges.
  4. Conclude video with closing remarks.
