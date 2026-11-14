# SkillDuels - API Contract & Teammate Integration Guide
**Document ID:** EDU-WEB-2026-115-API-v1.0  
**Owner:** Student 1 (Backend Core & Auth)  
**Target Audience:** Students 2, 3, 4, and 5  

---

## 1. Overview & General Standards

- **Base URL (Local):** `http://localhost:5000/api`
- **Content-Type:** `application/json`
- **Authentication Standard (NFR-03):** JSON Web Token (JWT) transmitted via HTTP header:
  ```http
  Authorization: Bearer <token>
  ```
- **Consistent Response Envelope:**
  - **Success:**
    ```json
    {
      "success": true,
      "message": "Optional descriptive message",
      "data": { ... } // or entity fields directly
    }
    ```
  - **Error:**
    ```json
    {
      "success": false,
      "message": "Human-readable explanation of error"
    }
    ```

---

## 2. Authentication Endpoints (FR-01)

### 2.1 Register New User
Creates a new player or admin account.

- **Method / Route:** `POST /api/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "username": "alex_coder",
    "email": "alex@skillduels.com",
    "password": "Password123!",
    "role": "player"
  }
  ```
  *(Note: `role` defaults to `"player"` if omitted. Allowed values: `"player"`, `"admin"`)*.
- **Success Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "User registered successfully.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "66432b5f63901b001a1c9001",
      "username": "alex_coder",
      "email": "alex@skillduels.com",
      "role": "player",
      "xp": 0,
      "rank": "Novice",
      "badges": [],
      "createdAt": "2026-11-14T10:00:00.000Z",
      "updatedAt": "2026-11-14T10:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing fields or invalid format (`"Please provide username, email, and password."` / `"Password must be at least 6 characters long."`).
  - `409 Conflict`: Duplicate user (`"An account with this email address already exists."` or `"This username is already taken. Please choose another."`).

---

### 2.2 User Login
Authenticates user credentials and issues a JWT token.

- **Method / Route:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "alex@skillduels.com",
    "password": "Password123!"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "66432b5f63901b001a1c9001",
      "username": "alex_coder",
      "email": "alex@skillduels.com",
      "role": "player",
      "xp": 0,
      "rank": "Novice",
      "badges": [],
      "createdAt": "2026-11-14T10:00:00.000Z",
      "updatedAt": "2026-11-14T10:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid email or password.

---

### 2.3 Get Current Authenticated Profile
Fetches the profile for the logged-in session.

- **Method / Route:** `GET /api/auth/me`
- **Access:** Private (Bearer Token required)
- **Request Headers:**
  ```http
  Authorization: Bearer <token>
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "user": {
      "_id": "66432b5f63901b001a1c9001",
      "username": "alex_coder",
      "email": "alex@skillduels.com",
      "role": "player",
      "xp": 150,
      "rank": "Apprentice",
      "badges": [
        {
          "badgeId": "first-win",
          "name": "First Blood",
          "description": "Won your first 1v1 quiz duel",
          "icon": "first-win.png",
          "awardedAt": "2026-11-14T10:30:00.000Z"
        }
      ],
      "createdAt": "2026-11-14T10:00:00.000Z",
      "updatedAt": "2026-11-14T10:30:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Missing, invalid, or expired token.

---

## 3. Middleware Integration Guide for Teammates (NFR-03)

The authentication & authorization middlewares are located at `server/src/middleware/auth.middleware.js`.

### How Teammates Must Use the Middleware

```javascript
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

// Protect any route requiring login:
router.get('/my-route', authenticateToken, myController);

// Protect route for specific roles:
// Only admins (Student 4 Quiz Management):
router.post('/categories', authenticateToken, requireRole('admin'), createCategory);

// Only players or admins:
router.post('/match/join', authenticateToken, requireRole('player', 'admin'), joinMatch);
```

When `authenticateToken` passes, it attaches the full Mongoose user document to `req.user`:
```javascript
const userId = req.user._id;
const userRole = req.user.role;
const userXP = req.user.xp;
```

---

## 4. Teammate-Specific Action Items

### Student 2 (Socket.IO Match Engine)
- **Token Passing in Handshake:**
  Instruct client to pass token in `socket.io` handshake:
  ```javascript
  const socket = io('http://localhost:5000', {
    auth: { token: localStorage.getItem('token') }
  });
  ```
- **Server Handshake Middleware:**
  Use the pre-built `authenticateSocket` helper in `server/src/middleware/auth.middleware.js`:
  ```javascript
  const { authenticateSocket } = require('./middleware/auth.middleware');
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`Connected player: ${socket.user.username} (${socket.user._id})`);
  });
  ```

### Student 3 (React Frontend)
- After login/register, store `token` in `localStorage` or React auth context.
- Add an Axios / fetch interceptor:
  ```javascript
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  ```
- Use `GET /api/auth/me` on initial app render to restore session state.

### Student 4 (Quiz Management & Admin Panel)
- Protect all Admin category & question routes:
  ```javascript
  router.use(authenticateToken, requireRole('admin'));
  ```

### Student 5 (XP, Leaderboard, Badges)
- The `User` model at `server/src/models/User.js` contains `xp`, `rank`, and `badges`.
- To update player XP after a match:
  ```javascript
  await User.findByIdAndUpdate(userId, { $inc: { xp: earnedXP }, rank: updatedRank });
  ```
- To query leaderboard:
  ```javascript
  const topPlayers = await User.find({ role: 'player' })
    .sort({ xp: -1 })
    .limit(50)
    .select('username xp rank badges');
  ```
