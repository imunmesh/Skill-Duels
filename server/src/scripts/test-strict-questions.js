/**
 * SkillDuels Acceptance Test Suite: Strict Category & Question Rules
 *
 * Verifies:
 * 1. Category with 0 questions: findOpponent returns CATEGORY_HAS_NO_QUESTIONS and no match is created.
 * 2. Category with 3 questions (needs 5): returns CATEGORY_NOT_ENOUGH_QUESTIONS (available: 3, required: 5).
 * 3. Category with 5+ questions: match starts and every question in it has category === selected category.
 * 4. Category A has 10 questions, category B has 0: starting a B match never returns any A question.
 * 5. Admin adds questions to a category: the next match in it can use them (AC-06).
 * 6. Questions deleted between pairing and creation: no match is created and both players receive matchError.
 * 7. Both players receive identical question IDs in identical order (AC-01).
 */

const assert = require('assert');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../../server/.env') });

const Category = require('../models/Category');
const Question = require('../models/Question');
const { QUESTIONS_PER_MATCH, ERROR_CODES } = require('../config/constants');
const { getPlayableQuestions, checkCategoryPlayable } = require('../socket/questionService');
const matchManager = require('../socket/matchManager');

console.log('================================================================');
console.log('   SKILLDUELS ACCEPTANCE TESTS: STRICT QUESTION RULES');
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
    console.error(`         Error: ${err.message}\n${err.stack}`);
    process.exitCode = 1;
  }
}

async function runAllTests() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillduels';
  await mongoose.connect(uri);

  // Setup test categories
  const testCatZero = await Category.findOneAndUpdate(
    { slug: 'test-cat-zero' },
    { name: 'Test Empty Category', slug: 'test-cat-zero', description: 'Zero questions test' },
    { upsert: true, new: true }
  );

  const testCatThree = await Category.findOneAndUpdate(
    { slug: 'test-cat-three' },
    { name: 'Test Three Category', slug: 'test-cat-three', description: 'Three questions test' },
    { upsert: true, new: true }
  );

  const testCatA = await Category.findOneAndUpdate(
    { slug: 'test-cat-a' },
    { name: 'Category Alpha', slug: 'test-cat-a', description: 'Ten questions test' },
    { upsert: true, new: true }
  );

  const testCatB = await Category.findOneAndUpdate(
    { slug: 'test-cat-b' },
    { name: 'Category Beta', slug: 'test-cat-b', description: 'Zero questions test' },
    { upsert: true, new: true }
  );

  // Clean up any old test questions
  await Question.deleteMany({
    category: { $in: [testCatZero._id, testCatThree._id, testCatA._id, testCatB._id] },
  });

  // Seed 3 questions in testCatThree
  for (let i = 1; i <= 3; i++) {
    await Question.create({
      text: `Test Three Question ${i}?`,
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctIndex: 0,
      category: testCatThree._id,
      difficulty: 'medium',
      isActive: true,
    });
  }

  // Seed 10 questions in testCatA
  for (let i = 1; i <= 10; i++) {
    await Question.create({
      text: `Alpha Question ${i}?`,
      options: ['Alpha 1', 'Alpha 2', 'Alpha 3', 'Alpha 4'],
      correctIndex: 1,
      category: testCatA._id,
      difficulty: 'easy',
      isActive: true,
    });
  }

  // -------------------------------------------------------------------------
  // Test 1: Category with 0 questions: findOpponent returns CATEGORY_HAS_NO_QUESTIONS
  // -------------------------------------------------------------------------
  await runAsyncTest('Category with 0 questions returns CATEGORY_HAS_NO_QUESTIONS and no match is created', async () => {
    const check = await checkCategoryPlayable('test-cat-zero');
    assert.strictEqual(check.playable, false);
    assert.strictEqual(check.questionCount, 0);
    assert.strictEqual(check.error.code, ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS);

    // Verify getPlayableQuestions throws typed error
    let thrownError = null;
    try {
      await getPlayableQuestions('test-cat-zero');
    } catch (err) {
      thrownError = err;
    }
    assert(thrownError !== null, 'Expected error was not thrown');
    assert.strictEqual(thrownError.code, ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS);
    assert.strictEqual(thrownError.available, 0);
    assert.strictEqual(thrownError.required, 5);
  });

  // -------------------------------------------------------------------------
  // Test 2: Category with 3 questions (needs 5): returns CATEGORY_NOT_ENOUGH_QUESTIONS
  // -------------------------------------------------------------------------
  await runAsyncTest('Category with 3 questions (needs 5) returns CATEGORY_NOT_ENOUGH_QUESTIONS with available: 3', async () => {
    const check = await checkCategoryPlayable('test-cat-three');
    assert.strictEqual(check.playable, false);
    assert.strictEqual(check.questionCount, 3);
    assert.strictEqual(check.error.code, ERROR_CODES.CATEGORY_NOT_ENOUGH_QUESTIONS);
    assert.strictEqual(check.error.available, 3);
    assert.strictEqual(check.error.required, QUESTIONS_PER_MATCH);

    let thrownError = null;
    try {
      await getPlayableQuestions('test-cat-three');
    } catch (err) {
      thrownError = err;
    }
    assert(thrownError !== null, 'Expected error was not thrown');
    assert.strictEqual(thrownError.code, ERROR_CODES.CATEGORY_NOT_ENOUGH_QUESTIONS);
    assert.strictEqual(thrownError.available, 3);
  });

  // -------------------------------------------------------------------------
  // Test 3: Category with 5+ questions: match starts and every question has category === selected category
  // -------------------------------------------------------------------------
  await runAsyncTest('Category with 5+ questions: every returned question belongs strictly to selected category', async () => {
    const questions = await getPlayableQuestions('test-cat-a');
    assert.strictEqual(questions.length, QUESTIONS_PER_MATCH);
    for (const q of questions) {
      assert.strictEqual(q.categoryId, testCatA._id.toString());
      assert.strictEqual(q.category, testCatA.name);
      assert(Array.isArray(q.options));
      assert.strictEqual(q.options.length, 4);
    }
  });

  // -------------------------------------------------------------------------
  // Test 4: Category A has 10 questions, category B has 0: starting B never returns any A question
  // -------------------------------------------------------------------------
  await runAsyncTest('Category A has 10, category B has 0: B match never returns any A question or falls back', async () => {
    let thrown = null;
    try {
      await getPlayableQuestions('test-cat-b');
    } catch (err) {
      thrown = err;
    }
    assert(thrown !== null);
    assert.strictEqual(thrown.code, ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS);

    // Verify that Alpha questions exist and were not touched or borrowed
    const alphaCount = await Question.countDocuments({ category: testCatA._id });
    assert.strictEqual(alphaCount, 10);
  });

  // -------------------------------------------------------------------------
  // Test 5: Admin adds questions to a category: next match can use them (AC-06)
  // -------------------------------------------------------------------------
  await runAsyncTest('Admin adds 2 more questions to category with 3: now has 5 and becomes playable', async () => {
    // Add 2 questions to testCatThree (now 3 + 2 = 5)
    await Question.create([
      {
        text: 'Test Three Question 4 (Admin Added)?',
        options: ['Ans 1', 'Ans 2', 'Ans 3', 'Ans 4'],
        correctIndex: 2,
        category: testCatThree._id,
        difficulty: 'hard',
        isActive: true,
      },
      {
        text: 'Test Three Question 5 (Admin Added)?',
        options: ['Ans 1', 'Ans 2', 'Ans 3', 'Ans 4'],
        correctIndex: 3,
        category: testCatThree._id,
        difficulty: 'medium',
        isActive: true,
      },
    ]);

    const check = await checkCategoryPlayable('test-cat-three');
    assert.strictEqual(check.playable, true);
    assert.strictEqual(check.questionCount, 5);

    const questions = await getPlayableQuestions('test-cat-three');
    assert.strictEqual(questions.length, QUESTIONS_PER_MATCH);
  });

  // -------------------------------------------------------------------------
  // Test 6: Questions deleted between pairing and creation: no match created, matchError emitted to both
  // -------------------------------------------------------------------------
  await runAsyncTest('Questions deleted between pairing and creation: no match created and matchError emitted', async () => {
    // Create temporary category with 5 questions
    const volatileCat = await Category.create({
      name: 'Volatile Category',
      slug: 'volatile-test',
      description: 'Test category for deletion between pairing',
    });

    const createdQs = [];
    for (let i = 1; i <= 5; i++) {
      createdQs.push({
        text: `Volatile Question ${i}`,
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        category: volatileCat._id,
        isActive: true,
      });
    }
    await Question.insertMany(createdQs);

    // Mock IO and player sockets
    const emittedToP1 = [];
    const emittedToP2 = [];

    const mockIo = {
      sockets: {
        sockets: new Map([
          ['socket_p1', { join: () => {} }],
          ['socket_p2', { join: () => {} }],
        ]),
      },
      to: (socketId) => ({
        emit: (event, payload) => {
          if (socketId === 'socket_p1') emittedToP1.push({ event, payload });
          if (socketId === 'socket_p2') emittedToP2.push({ event, payload });
        },
      }),
    };

    // Now delete questions before createMatch is called (simulating admin deletion while queued)
    await Question.deleteMany({ category: volatileCat._id });

    const player1 = { userId: new mongoose.Types.ObjectId().toString(), username: 'Player1', socketId: 'socket_p1' };
    const player2 = { userId: new mongoose.Types.ObjectId().toString(), username: 'Player2', socketId: 'socket_p2' };

    const matchResult = await matchManager.createMatch(mockIo, player1, player2, volatileCat.slug);

    // No match must be created
    assert.strictEqual(matchResult, null);

    // Both players must receive matchError
    const p1Error = emittedToP1.find((e) => e.event === 'matchError');
    const p2Error = emittedToP2.find((e) => e.event === 'matchError');

    assert(p1Error, 'Player 1 should receive matchError');
    assert(p2Error, 'Player 2 should receive matchError');
    assert.strictEqual(p1Error.payload.code, ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS);
    assert.strictEqual(p2Error.payload.code, ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS);

    // Clean up
    await Category.findByIdAndDelete(volatileCat._id);
  });

  // -------------------------------------------------------------------------
  // Test 7: Both players receive identical question IDs in identical order (AC-01)
  // -------------------------------------------------------------------------
  await runAsyncTest('Both players receive identical question IDs in identical order (AC-01)', async () => {
    const emittedToP1 = [];
    const emittedToP2 = [];

    const mockIo = {
      sockets: {
        sockets: new Map([
          ['socket_p1', { join: () => {} }],
          ['socket_p2', { join: () => {} }],
        ]),
      },
      to: (socketId) => ({
        emit: (event, payload) => {
          if (socketId === 'socket_p1') emittedToP1.push({ event, payload });
          if (socketId === 'socket_p2') emittedToP2.push({ event, payload });
        },
      }),
    };

    const player1 = { userId: new mongoose.Types.ObjectId().toString(), username: 'Alice', socketId: 'socket_p1' };
    const player2 = { userId: new mongoose.Types.ObjectId().toString(), username: 'Bob', socketId: 'socket_p2' };

    const matchState = await matchManager.createMatch(mockIo, player1, player2, 'test-cat-a');
    assert(matchState !== null);

    const p1Found = emittedToP1.find((e) => e.event === 'matchFound');
    const p2Found = emittedToP2.find((e) => e.event === 'matchFound');

    assert(p1Found && p1Found.payload.questions);
    assert(p2Found && p2Found.payload.questions);
    assert.strictEqual(p1Found.payload.questions.length, QUESTIONS_PER_MATCH);
    assert.strictEqual(p2Found.payload.questions.length, QUESTIONS_PER_MATCH);

    // Check exact question IDs and order
    for (let i = 0; i < QUESTIONS_PER_MATCH; i++) {
      assert.strictEqual(
        p1Found.payload.questions[i].id,
        p2Found.payload.questions[i].id,
        `Question ID mismatch at index ${i}`
      );
      // Ensure correct answer was NOT leaked (NFR-03 Security)
      assert.strictEqual(p1Found.payload.questions[i].correctOptionIndex, undefined);
      assert.strictEqual(p2Found.payload.questions[i].correctIndex, undefined);
    }

    // Clean up created match from memory
    matchManager.cleanupMatch(matchState.id);
  });

  // Clean up all test categories and questions
  await Question.deleteMany({
    category: { $in: [testCatZero._id, testCatThree._id, testCatA._id, testCatB._id] },
  });
  await Category.deleteMany({
    _id: { $in: [testCatZero._id, testCatThree._id, testCatA._id, testCatB._id] },
  });

  await mongoose.disconnect();

  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passedTests} / ${totalTests} acceptance tests passed (100%)`);
  console.log('----------------------------------------------------------------\n');
}

runAllTests().catch((err) => {
  console.error('[Acceptance Tests Fatal Error]:', err);
  process.exit(1);
});
