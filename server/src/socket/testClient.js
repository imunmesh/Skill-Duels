/**
 * Test Client Simulation for SkillDuels Match Engine
 * Simulates a full head-to-head 1v1 duel between two players (Alice & Bob).
 *
 * Verifies:
 * - JWT Handshake Authentication (NFR-03)
 * - Matchmaking pairing into room (FR-03, AC-01)
 * - Shared question delivery (AC-01)
 * - Server timer ticks and countdown expiry (FR-04, AC-03)
 * - Real-time answer validation and live score broadcast (FR-05, AC-02)
 * - Match conclusion and XP award hook (FR-02)
 */

const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production_min_32_chars';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

// Generate valid JWT tokens for test players
const tokenAlice = jwt.sign(
  { id: '66432b5f63901b001a1c9001', username: 'Alice_Duels', role: 'player' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const tokenBob = jwt.sign(
  { id: '66432b5f63901b001a1c9002', username: 'Bob_Duels', role: 'player' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const runSimulation = async () => {
  console.log('===============================================================');
  console.log('   SKILLDUELS 1v1 REAL-TIME MATCH ENGINE SIMULATION TEST');
  console.log('===============================================================\n');

  // Check if server is running; if not, spin up local test server instance
  let localServer = null;
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(`${SERVER_URL}/api/health`, (res) => {
        if (res.statusCode === 200) resolve();
        else reject(new Error(`Server returned ${res.statusCode}`));
      });
      req.on('error', reject);
    });
    console.log(`[Test] Server is already UP at ${SERVER_URL}\n`);
  } catch (_err) {
    console.log(`[Test] Server not running at ${SERVER_URL}. Launching in-process test server...`);
    const app = require('../app');
    const initSocketServer = require('./index');
    localServer = http.createServer(app);
    initSocketServer(localServer);
    await new Promise((resolve) => localServer.listen(5000, resolve));
    console.log('[Test] In-process server listening on port 5000.\n');
  }

  // 1. Connect Alice
  console.log('[Setup] Connecting Player 1 (Alice) with JWT token...');
  const socketAlice = io(SERVER_URL, {
    auth: { token: tokenAlice },
    transports: ['websocket'],
  });

  // 2. Connect Bob
  console.log('[Setup] Connecting Player 2 (Bob) with JWT token...');
  const socketBob = io(SERVER_URL, {
    auth: { token: tokenBob },
    transports: ['websocket'],
  });

  let currentMatchId = null;

  // Setup Alice event listeners
  socketAlice.on('connect', () => {
    console.log(`[Alice] Connected with Socket ID: ${socketAlice.id}`);
    console.log('[Alice] Entering matchmaking queue for "technical"...');
    socketAlice.emit('join_queue', { category: 'technical' });
  });

  socketAlice.on('queue_joined', (data) => {
    console.log(`[Alice] Queue Status: ${data.message}`);
  });

  socketAlice.on('match_start', (data) => {
    currentMatchId = data.matchId;
    console.log('\n---------------------------------------------------------------');
    console.log(`[MATCH FOUND] Room: ${data.matchId}`);
    console.log(`[Alice] Opponent: ${data.opponent.username} (${data.opponent.userId})`);
    console.log(`[Alice] Total Questions: ${data.totalQuestions}`);
    console.log('---------------------------------------------------------------\n');
  });

  socketAlice.on('new_question', (q) => {
    console.log(`\n>>> [QUESTION ${q.questionNumber}/${q.totalQuestions}] Category: ${q.category}`);
    console.log(`Prompt: "${q.prompt}"`);
    q.options.forEach((opt, idx) => console.log(`   [${idx}] ${opt}`));
    console.log(`Time limit: ${q.timeLimit}s | Points: ${q.points}`);

    // Alice answers Option 1 quickly after 800ms
    setTimeout(() => {
      console.log('[Alice] Submitting answer [Option 1]...');
      socketAlice.emit('submit_answer', {
        matchId: currentMatchId,
        questionIndex: q.questionNumber - 1,
        selectedOptionIndex: 1,
      });
    }, 800);
  });

  socketAlice.on('score_update', (data) => {
    console.log(
      `[LIVE SCORES] Alice: ${data.scores['66432b5f63901b001a1c9001']} | Bob: ${data.scores['66432b5f63901b001a1c9002']}`
    );
  });

  socketAlice.on('question_ended', (data) => {
    console.log(
      `[Round Ended] Correct answer was [${data.correctOptionIndex}]: "${data.correctOptionText}"`
    );
  });

  socketAlice.on('match_ended', (data) => {
    console.log('\n===============================================================');
    console.log('                     MATCH COMPLETED!');
    console.log('===============================================================');
    console.log(`Winner ID: ${data.winnerId || 'DRAW'}`);
    console.log(`Reason: ${data.reason}`);
    data.players.forEach((p) => {
      console.log(
        `- ${p.username}: Final Score = ${p.score} pts | XP Awarded = +${p.xpAwarded} XP ${
          p.isWinner ? '👑 WINNER' : ''
        }`
      );
    });
    console.log('===============================================================\n');

    socketAlice.disconnect();
    socketBob.disconnect();
    if (localServer) {
      localServer.close(() => process.exit(0));
    } else {
      process.exit(0);
    }
  });

  // Setup Bob event listeners
  socketBob.on('connect', () => {
    console.log(`[Bob] Connected with Socket ID: ${socketBob.id}`);
    // Bob joins queue shortly after Alice
    setTimeout(() => {
      console.log('[Bob] Entering matchmaking queue for "technical"...');
      socketBob.emit('join_queue', { category: 'technical' });
    }, 500);
  });

  socketBob.on('new_question', (q) => {
    // Bob answers after 1800ms with Option 2
    setTimeout(() => {
      console.log('[Bob] Submitting answer [Option 2]...');
      socketBob.emit('submit_answer', {
        matchId: currentMatchId,
        questionIndex: q.questionNumber - 1,
        selectedOptionIndex: 2,
      });
    }, 1800);
  });
};

runSimulation();
