# SkillDuels - Quiz Content & Admin Panel API Testing Guide
**Document ID:** EDU-WEB-2026-115-QC-v1.0  
**Owner:** Student 4 (Quiz Content & Admin Panel)  
**Requirements Covered:** FR-08, FR-09, AC-06, NFR-03  

---

## 1. Authentication Credentials for Testing

Run `npm run seed` in `/server` to populate default accounts and 50+ questions.
- **Admin Account:** `admin@skillduels.com` / `Admin123!` (Role: `admin`)
- **Player Account:** `player1@skillduels.com` / `Player123!` (Role: `player`)

Log in via `POST /api/auth/login` to obtain your tokens:
```bash
# Obtain Admin Token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@skillduels.com","password":"Admin123!"}' | jq -r .token)

# Obtain Player Token
PLAYER_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"player1@skillduels.com","password":"Player123!"}' | jq -r .token)
```

---

## 2. Category Endpoints (FR-08, FR-09)

### 2.1 Get All Categories (Public)
- **Method:** `GET /api/categories`
- **Access:** Public
- **cURL:**
  ```bash
  curl -X GET http://localhost:5000/api/categories
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "count": 5,
    "categories": [
      {
        "_id": "6735c02e1b4f4c001a1c9010",
        "name": "Data Structures & Algorithms",
        "slug": "dsa",
        "description": "Arrays, trees, graphs, sorting, and Big-O.",
        "icon": "Layers"
      },
      {
        "_id": "6735c02e1b4f4c001a1c9011",
        "name": "Technical & CS",
        "slug": "technical",
        "description": "Core computer science fundamentals.",
        "icon": "Code"
      }
    ]
  }
  ```

---

### 2.2 Create Category (Admin Only - NFR-03)
- **Method:** `POST /api/categories`
- **Access:** Admin only (`Bearer <ADMIN_TOKEN>`)
- **cURL:**
  ```bash
  curl -X POST http://localhost:5000/api/categories \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
      "name": "Cloud & DevOps",
      "slug": "devops",
      "description": "Docker, Kubernetes, CI/CD, and Cloud architecture."
    }'
  ```
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Category created successfully",
    "category": {
      "_id": "6735c02e1b4f4c001a1c9099",
      "name": "Cloud & DevOps",
      "slug": "devops",
      "description": "Docker, Kubernetes, CI/CD, and Cloud architecture."
    }
  }
  ```
- **Forbidden Test (with Player Token):**
  ```bash
  curl -X POST http://localhost:5000/api/categories \
    -H "Authorization: Bearer $PLAYER_TOKEN" \
    -d '{"name": "Unauthorized Category"}'
  ```
  *Returns `403 Forbidden` (`Access requires [admin]`)*.

---

## 3. Question CRUD Endpoints (FR-09)

### 3.1 List Questions with Pagination & Filters (Admin Only)
- **Method:** `GET /api/questions?page=1&limit=10&category=technical&difficulty=medium`
- **Access:** Admin only
- **cURL:**
  ```bash
  curl -X GET "http://localhost:5000/api/questions?page=1&limit=10&category=technical" \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "count": 10,
    "totalQuestions": 10,
    "totalPages": 1,
    "currentPage": 1,
    "questions": [
      {
        "_id": "6735c02e1b4f4c001a1c9020",
        "text": "Which data structure follows the Last-In-First-Out (LIFO) model?",
        "options": ["Queue", "Stack", "Tree", "Graph"],
        "correctIndex": 1,
        "difficulty": "easy",
        "category": {
          "_id": "6735c02e1b4f4c001a1c9011",
          "name": "Technical & CS",
          "slug": "technical"
        },
        "timeLimit": 10,
        "points": 100
      }
    ]
  }
  ```

---

### 3.2 Create Question (Admin Only - AC-06)
- **Method:** `POST /api/questions`
- **Access:** Admin only
- **cURL:**
  ```bash
  curl -X POST http://localhost:5000/api/questions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
      "text": "What is the time complexity of searching an element in a balanced AVL tree?",
      "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      "correctIndex": 1,
      "category": "technical",
      "difficulty": "medium",
      "timeLimit": 10,
      "points": 100
    }'
  ```
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Question created successfully",
    "question": {
      "_id": "6735c02e1b4f4c001a1c9055",
      "text": "What is the time complexity of searching an element in a balanced AVL tree?",
      "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      "correctIndex": 1,
      "difficulty": "medium"
    }
  }
  ```

---

## 4. Random Question Match Endpoint (AC-01, AC-06, NFR-03)

### 4.1 Get Random Question Set for Match
Returns a sanitized question pool where **`correctIndex` is stripped** to protect anti-cheat integrity.

- **Method:** `GET /api/questions/random?category=technical&count=3`
- **Access:** Public / Players
- **cURL:**
  ```bash
  curl -X GET "http://localhost:5000/api/questions/random?category=technical&count=3"
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "count": 3,
    "questions": [
      {
        "_id": "6735c02e1b4f4c001a1c9055",
        "questionNumber": 1,
        "totalQuestions": 3,
        "prompt": "What is the time complexity of searching an element in a balanced AVL tree?",
        "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        "difficulty": "medium",
        "timeLimit": 10,
        "points": 100,
        "category": "technical",
        "categoryName": "Technical & CS"
      }
    ]
  }
  ```
  *(Notice: `correctIndex` is completely omitted).*

---

## 5. Verification of AC-06
> **Acceptance Criterion AC-06:** "Given an administrator adds a question to a category, when a subsequent match uses that category, then the new question is available for selection."

1. Admin adds a question via `POST /api/questions` or via the React Admin Panel (`/admin`).
2. The Socket.IO match engine `questionService.fetchMatchQuestions()` executes a `$sample` query against the live MongoDB collection.
3. The newly inserted question is immediately eligible for inclusion in the next duel.
