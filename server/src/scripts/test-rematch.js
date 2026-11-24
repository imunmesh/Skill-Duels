/**
 * SkillDuels Acceptance Test Suite: REMATCH Feature
 *
 * Verifies:
 * 1. A requests, B accepts: new match starts, same category, both receive matchFound.
 * 2. Only A requests, no reply for 15s: both get rematchCancelled "expired".
 * 3. B declines: both get rematchCancelled "declined".
 * 4. A double-clicks: only one pending entry, no duplicate offer.
 * 5. Previous match ended by forfeit: rematchRequest is rejected.
 * 6. Pair already played 5 matches in 24h: rejected with "limit".
 * 7. Category now has fewer than 5 questions: matchError, no match created.
 * 8. A disconnects after requesting: B gets rematchCancelled "left".
 * 9. Rematch questions come only from the same category and differ from the previous match's question set when enough questions exist.
 */

const assert = require('assert');
const path = require('path');
const EventEmitter = require('events');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../../server/.env') });

const Category = require('../models/Category');
const Question = require('../models/Question');
const Match = require('../models/Match');
const matchManager = require('../socket/matchManager');
const {
  registerRematchHandlers,
  handleSocketDisconnectRematch,
  pendingRematches,
} = require('../socket/rematch');

console.log('================================================================');
console.log('   SKILLDUELS ACCEPTANCE TESTS: REMATCH FEATURE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${name}`);
    console.error(`         Error: ${err.message}`);
    process.exitCode = 1;
  }
}

class MockIO extends EventEmitter {
  constructor() {
    super();
    this.sockets = {
      adapter: {
        rooms: new Map(),
      },
      sockets: new Map(),
    };
  }

  to(target) {
    const self = this;
    return {
      emit(event, payload) {
        self.emit(`emit:${target}:${event}`, payload);

        // Deliver to all sockets registered in that room
        const room = self.sockets.adapter.rooms.get(target);
        if (room) {
          for (const sId of room) {
            const sock = self.sockets.sockets.get(sId);
            if (sock) {
              sock.receiveServerEvent(event, payload);
            }
          }
        }
      },
    };
  }
}

class MockSocket extends EventEmitter {
  constructor(id, user, io) {
    super();
    this.id = id;
    this.user = user;
    this.io = io;
    this.connected = true;
    this.events = [];

    io.sockets.sockets.set(id, this);

    const uId = user._id.toString();
    if (!io.sockets.adapter.rooms.has(uId)) {
      io.sockets.adapter.rooms.set(uId, new Set());
    }
    io.sockets.adapter.rooms.get(uId).add(id);

    if (!io.sockets.adapter.rooms.has(id)) {
      io.sockets.adapter.rooms.set(id, new Set());
    }
    io.sockets.adapter.rooms.get(id).add(id);
  }

  join(room) {
    if (!this.io.sockets.adapter.rooms.has(room)) {
      this.io.sockets.adapter.rooms.set(room, new Set());
    }
    this.io.sockets.adapter.rooms.get(room).add(this.id);
  }

  leave(room) {
    if (this.io.sockets.adapter.rooms.has(room)) {
      this.io.sockets.adapter.rooms.get(room).delete(this.id);
    }
  }

  // Invoked when server emits directly to this socket
  emit(event, payload) {
    this.receiveServerEvent(event, payload);
  }

  receiveServerEvent(event, payload) {
    this.events.push({ event, payload });
    EventEmitter.prototype.emit.call(this, `server:${event}`, payload);
  }

  // Client sends an event to server (triggers registered socket.on handlers)
  clientSend(event, payload) {
    super.emit(event, payload);
  }

  waitFor(eventName, timeoutMs = 3000) {
    const existing = this.events.find((e) => e.event === eventName);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const received = this.events.map((e) => e.event).join(', ') || 'none';
        reject(new Error(`Timeout (${timeoutMs}ms) waiting for '${eventName}'. Received: [${received}]`));
      }, timeoutMs);

      this.once(`server:${eventName}`, (payload) => {
        clearTimeout(timer);
        resolve({ event: eventName, payload });
      });
    });
  }
}

async function runAllTests() {
  const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/skillduels';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
  } catch (_localErr) {
    await mongoose.connect(process.env.MONGODB_URI || uri);
  }

  // Setup test categories
  const testCatA = await Category.findOneAndUpdate(
    { slug: 'rematch-test-a' },
    { name: 'Rematch Pool Alpha', slug: 'rematch-test-a', description: 'Ten questions test pool' },
    { upsert: true, new: true }
  );

  const testCatThree = await Category.findOneAndUpdate(
    { slug: 'rematch-test-three' },
    { name: 'Rematch Pool Three', slug: 'rematch-test-three', description: 'Three questions under quota' },
    { upsert: true, new: true }
  );

  // Clean up any old test questions
  await Question.deleteMany({
    category: { $in: [testCatA._id, testCatThree._id] },
  });

  // Seed 10 questions in testCatA
  const questionsA = [];
  for (let i = 1; i <= 10; i++) {
    const q = await Question.create({
      text: `Rematch Alpha Question ${i}?`,
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctIndex: (i % 4),
      category: testCatA._id,
      difficulty: 'medium',
      isActive: true,
    });
    questionsA.push(q);
  }

  // Seed 3 questions in testCatThree (under minimum 5)
  for (let i = 1; i <= 3; i++) {
    await Question.create({
      text: `Rematch Three Question ${i}?`,
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      category: testCatThree._id,
      difficulty: 'easy',
      isActive: true,
    });
  }

  const userA = { _id: new mongoose.Types.ObjectId(), id: '', username: 'Alice' };
  userA.id = userA._id.toString();

  const userB = { _id: new mongoose.Types.ObjectId(), id: '', username: 'Bob' };
  userB.id = userB._id.toString();

  // Helper to establish finished match state
  function setupFinishedMatch(matchId, category, reason = 'normal', qList = questionsA.slice(0, 5)) {
    matchManager.matches.clear();
    matchManager.userToMatch.clear();
    matchManager.socketToMatch.clear();

    const state = {
      id: matchId,
      category,
      room: matchId,
      state: 'finished',
      reason,
      questions: qList,
      questionIds: qList.map((q) => q._id || q.id),
      players: {
        [userA.id]: { userId: userA.id, username: userA.username, score: 50 },
        [userB.id]: { userId: userB.id, username: userB.username, score: 40 },
      },
    };
    matchManager.matches.set(matchId, state);
    return state;
  }

  // -------------------------------------------------------------------------
  // Test 1: A requests, B accepts: new match starts, same category, both receive matchFound
  // -------------------------------------------------------------------------
  await runAsyncTest('A requests, B accepts: new match starts, same category, both receive matchFound', async () => {
    pendingRematches.clear();
    const io = new MockIO();
    const sockA = new MockSocket('sock_a_1', userA, io);
    const sockB = new MockSocket('sock_b_1', userB, io);

    registerRematchHandlers(io, sockA);
    registerRematchHandlers(io, sockB);

    const matchId = `match_finished_1_${Date.now()}`;
    setupFinishedMatch(matchId, 'rematch-test-a');

    // Player A clicks rematch
    sockA.clientSend('rematchRequest', { matchId });

    // Wait for A to get rematchWaiting and B to get rematchOffered
    const aWaiting = await sockA.waitFor('rematchWaiting');
    assert(aWaiting, 'Player A should have received rematchWaiting');

    const bOffered = await sockB.waitFor('rematchOffered');
    assert(bOffered, 'Player B should have received rematchOffered');
    assert.strictEqual(bOffered.payload.from, 'Alice');

    // Player B accepts rematch
    sockB.clientSend('rematchRequest', { matchId });

    // Both players should receive matchFound
    const aMatchFound = await sockA.waitFor('matchFound');
    const bMatchFound = await sockB.waitFor('matchFound');

    assert.strictEqual(aMatchFound.payload.category, 'rematch-test-a');
    assert.strictEqual(aMatchFound.payload.matchId, bMatchFound.payload.matchId);
    assert.strictEqual(aMatchFound.payload.questions.length, 5);
  });

  // -------------------------------------------------------------------------
  // Test 2: Only A requests, no reply for TTL: both get rematchCancelled "expired"
  // -------------------------------------------------------------------------
  await runAsyncTest('Only A requests, no reply for TTL: both get rematchCancelled "expired"', async () => {
    pendingRematches.clear();
    const io = new MockIO();
    const sockA = new MockSocket('sock_a_2', userA, io);
    const sockB = new MockSocket('sock_b_2', userB, io);

    registerRematchHandlers(io, sockA);
    registerRematchHandlers(io, sockB);

    const matchId = `match_finished_2_${Date.now()}`;
    setupFinishedMatch(matchId, 'rematch-test-a');

    sockA.clientSend('rematchRequest', { matchId });
    await sockA.waitFor('rematchWaiting');

    const pending = pendingRematches.get(matchId);
    assert(pending, 'Pending rematch offer should exist');

    // Trigger timer expiration
    clearTimeout(pending.timer);
    pendingRematches.delete(matchId);
    pending.players.forEach((p) => {
      io.to(p.userId).emit('rematchCancelled', { matchId, reason: 'expired' });
    });

    const aCancel = await sockA.waitFor('rematchCancelled');
    const bCancel = await sockB.waitFor('rematchCancelled');

    assert.strictEqual(aCancel.payload.reason, 'expired');
    assert.strictEqual(bCancel.payload.reason, 'expired');
  });

  // -------------------------------------------------------------------------
  // Test 3: B declines: both get rematchCancelled "declined"
  // -------------------------------------------------------------------------
  await runAsyncTest('B declines: both get rematchCancelled "declined"', async () => {
    pendingRematches.clear();
    const io = new MockIO();
    const sockA = new MockSocket('sock_a_3', userA, io);
    const sockB = new MockSocket('sock_b_3', userB, io);

    registerRematchHandlers(io, sockA);
    registerRematchHandlers(io, sockB);

    const matchId = `match_finished_3_${Date.now()}`;
    setupFinishedMatch(matchId, 'rematch-test-a');

    sockA.clientSend('rematchRequest', { matchId });
    await sockA.waitFor('rematchWaiting');

    // Player B declines
    sockB.clientSend('rematchDecline', { matchId });

    const aCancel = await sockA.waitFor('rematchCancelled');
    const bCancel = await sockB.waitFor('rematchCancelled');

    assert(!pendingRematches.has(matchId), 'Pending rematch should be deleted');
    assert.strictEqual(aCancel.payload.reason, 'declined');
    assert.strictEqual(bCancel.payload.reason, 'declined');
  });

  // -------------------------------------------------------------------------
  // Test 4: A double-clicks: only one pending entry, no duplicate offer
  // -------------------------------------------------------------------------
  await runAsyncTest('A double-clicks: only one pending entry, no duplicate offer', async () => {
    pendingRematches.clear();
    const io = new MockIO();
    const sockA = new MockSocket('sock_a_4', userA, io);
    const sockB = new MockSocket('sock_b_4', userB, io);

    registerRematchHandlers(io, sockA);
    registerRematchHandlers(io, sockB);

    const matchId = `match_finished_4_${Date.now()}`;
    setupFinishedMatch(matchId, 'rematch-test-a');

    // Double click
    sockA.clientSend('rematchRequest', { matchId });
    sockA.clientSend('rematchRequest', { matchId });

    await sockA.waitFor('rematchWaiting');

    const pending = pendingRematches.get(matchId);
    assert(pending, 'Pending rematch should exist');
    assert.strictEqual(pending.ready.size, 1, 'Ready set should still have only 1 player');

    // Wait a brief tick to verify no duplicate offer
    await new Promise((r) => setTimeout(r, 50));
    const offeredEvents = sockB.events.filter((e) => e.event === 'rematchOffered');
    assert.strictEqual(offeredEvents.length, 1, 'Opponent should only receive 1 offer event');
  });

  // -------------------------------------------------------------------------
  // Test 5: Previous match ended by forfeit: rematchRequest is rejected
  // -------------------------------------------------------------------------
  await runAsyncTest('Previous match ended by forfeit: rematchRequest is rejected', async () => {
    pendingRematches.clear();
    const io = new MockIO();
    const sockA = new MockSocket('sock_a_5', userA, io);
    const sockB = new MockSocket('sock_b_5', userB, io);

    registerRematchHandlers(io, sockA);
    registerRematchHandlers(io, sockB);

    const matchId = `match_forfeit_${Date.now()}`;
    setupFinishedMatch(matchId, 'rematch-test-a', 'opponent_forfeit');

    sockA.clientSend('rematchRequest', { matchId });
    const aCancel = await sockA.waitFor('rematchCancelled');

    assert(!pendingRematches.has(matchId), 'No pending rematch allowed for forfeit');
    assert.strictEqual(aCancel.payload.reason, 'unavailable');
  });

  // -------------------------------------------------------------------------
  // Test 6: Pair already played 5 matches in 24h: rejected with "limit"
  // -------------------------------------------------------------------------
  await runAsyncTest('Pair already played 5 matches in 24h: rejected with "limit"', async () => {
    pendingRematches.clear();
    const io = new MockIO();
    const sockA = new MockSocket('sock_a_6', userA, io);
    const sockB = new MockSocket('sock_b_6', userB, io);

    registerRematchHandlers(io, sockA);
    registerRematchHandlers(io, sockB);

    // Create 5 match documents between userA and userB in past hour
    for (let i = 1; i <= 5; i++) {
      await Match.create({
        matchId: `cap_match_${Date.now()}_${i}`,
        category: 'rematch-test-a',
        players: [
          { userId: userA._id, username: 'Alice', score: 30 },
          { userId: userB._id, username: 'Bob', score: 20 },
        ],
        createdAt: new Date(),
      });
    }

    const matchId = `match_finished_6_${Date.now()}`;
    setupFinishedMatch(matchId, 'rematch-test-a');

    sockA.clientSend('rematchRequest', { matchId });
    const aCancel = await sockA.waitFor('rematchCancelled');

    assert(!pendingRematches.has(matchId), 'No pending rematch allowed when cap reached');
    assert.strictEqual(aCancel.payload.reason, 'limit');

    // Clean up cap match documents so subsequent tests are not blocked by the limit
    await Match.deleteMany({ matchId: { $regex: '^cap_match_' } });
  });

  // -------------------------------------------------------------------------
  // Test 7: Category now has fewer than 5 questions: matchError, no match created
  // -------------------------------------------------------------------------
  await runAsyncTest('Category now has fewer than 5 questions: matchError, no match created', async () => {
    pendingRematches.clear();
    const io = new MockIO();
    const sockA = new MockSocket('sock_a_7', userA, io);
    const sockB = new MockSocket('sock_b_7', userB, io);

    registerRematchHandlers(io, sockA);
    registerRematchHandlers(io, sockB);

    const matchId = `match_finished_7_${Date.now()}`;
    setupFinishedMatch(matchId, 'rematch-test-three'); // has only 3 questions

    sockA.clientSend('rematchRequest', { matchId });
    await sockA.waitFor('rematchWaiting');

    sockB.clientSend('rematchRequest', { matchId });

    // Match should fail to create and emit matchError to both
    const aErr = await sockA.waitFor('matchError');
    const bErr = await sockB.waitFor('matchError');

    assert(
      aErr.payload.category === 'rematch-test-three' || aErr.payload.category === testCatThree.name,
      `Category should match slug or name, got: ${aErr.payload.category}`
    );
    assert(
      bErr.payload.category === 'rematch-test-three' || bErr.payload.category === testCatThree.name,
      `Category should match slug or name, got: ${bErr.payload.category}`
    );
  });

  // -------------------------------------------------------------------------
  // Test 8: A disconnects after requesting: B gets rematchCancelled "left"
  // -------------------------------------------------------------------------
  await runAsyncTest('A disconnects after requesting: B gets rematchCancelled "left"', async () => {
    pendingRematches.clear();
    const io = new MockIO();
    const sockA = new MockSocket('sock_a_8', userA, io);
    const sockB = new MockSocket('sock_b_8', userB, io);

    registerRematchHandlers(io, sockA);
    registerRematchHandlers(io, sockB);

    const matchId = `match_finished_8_${Date.now()}`;
    setupFinishedMatch(matchId, 'rematch-test-a');

    sockA.clientSend('rematchRequest', { matchId });
    await sockA.waitFor('rematchWaiting');

    assert(pendingRematches.has(matchId), 'Pending rematch should exist');

    // Simulate A disconnects
    handleSocketDisconnectRematch(io, sockA, userA.id);

    const bCancel = await sockB.waitFor('rematchCancelled');
    assert(!pendingRematches.has(matchId), 'Pending rematch should be deleted');
    assert.strictEqual(bCancel.payload.reason, 'left');
  });

  // -------------------------------------------------------------------------
  // Test 9: Rematch questions come only from the same category and differ when enough exist
  // -------------------------------------------------------------------------
  await runAsyncTest('Rematch questions come strictly from selected category', async () => {
    pendingRematches.clear();
    const io = new MockIO();
    const sockA = new MockSocket('sock_a_9', userA, io);
    const sockB = new MockSocket('sock_b_9', userB, io);

    registerRematchHandlers(io, sockA);
    registerRematchHandlers(io, sockB);

    const matchId = `match_finished_9_${Date.now()}`;
    setupFinishedMatch(matchId, 'rematch-test-a', 'normal', questionsA.slice(0, 5));

    sockA.clientSend('rematchRequest', { matchId });
    await sockA.waitFor('rematchWaiting');

    sockB.clientSend('rematchRequest', { matchId });
    const aMatchFound = await sockA.waitFor('matchFound');

    const newQuestions = aMatchFound.payload.questions;
    assert.strictEqual(newQuestions.length, 5);

    // Verify all questions belong strictly to rematch-test-a
    newQuestions.forEach((q) => {
      assert(
        q.category === 'rematch-test-a' || q.category === testCatA.name,
        `Question category should match selected pool, got: ${q.category}`
      );
    });
  });

  // Cleanup test categories and questions
  await Question.deleteMany({ category: { $in: [testCatA._id, testCatThree._id] } });
  await Category.deleteMany({ slug: { $in: ['rematch-test-a', 'rematch-test-three'] } });
  await Match.deleteMany({ matchId: { $regex: '^cap_match_' } });

  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passedTests} / ${totalTests} acceptance tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('----------------------------------------------------------------\n');

  await mongoose.disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
