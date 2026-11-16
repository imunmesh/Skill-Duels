/**
 * SkillDuels CI Unit Test Suite
 * Fast, database-independent unit tests for CI/CD pipeline verification.
 */
const assert = require('assert');
const {
  calculateRank,
  getActiveStreak,
  getCalendarDayDifference,
} = require('../services/progressionService');

console.log('====================================================');
console.log('   SKILLDUELS CI / CD AUTOMATED UNIT TESTS');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// 1. Rank Tier & XP Progression Tests (FR-02)
// ----------------------------------------------------
console.log('1. Rank Tier & XP Calculation:');

runTest('0 XP should return Novice tier', () => {
  assert.strictEqual(calculateRank(0), 'Novice');
});

runTest('100 XP should return Apprentice tier', () => {
  assert.strictEqual(calculateRank(100), 'Apprentice');
});

runTest('300 XP should return Warrior tier', () => {
  assert.strictEqual(calculateRank(300), 'Warrior');
});

runTest('600 XP should return Veteran tier', () => {
  assert.strictEqual(calculateRank(600), 'Veteran');
});

runTest('1000 XP should return Master tier', () => {
  assert.strictEqual(calculateRank(1000), 'Master');
});

runTest('2000+ XP should return Grandmaster tier', () => {
  assert.strictEqual(calculateRank(2000), 'Grandmaster');
  assert.strictEqual(calculateRank(5000), 'Grandmaster');
});

// ----------------------------------------------------
// 2. Calendar-Day Daily Streak Calculation Tests (FR-10)
// ----------------------------------------------------
console.log('\n2. Daily Streak Calculation & Expiration:');

runTest('Consecutive calendar day should return difference of 1', () => {
  const d1 = new Date('2026-11-16T23:30:00Z');
  const d2 = new Date('2026-11-17T08:15:00Z');
  assert.strictEqual(getCalendarDayDifference(d1, d2), 1);
});

runTest('Same calendar day should return difference of 0', () => {
  const d1 = new Date('2026-11-16T10:00:00Z');
  const d2 = new Date('2026-11-16T22:00:00Z');
  assert.strictEqual(getCalendarDayDifference(d1, d2), 0);
});

runTest('Skipping a calendar day should return difference >= 2', () => {
  const d1 = new Date('2026-11-16T23:00:00Z');
  const d2 = new Date('2026-11-18T01:00:00Z');
  assert.strictEqual(getCalendarDayDifference(d1, d2), 2);
});

runTest('Streak active when last match was played today or yesterday', () => {
  const todayMatch = { current: 4, lastMatchDate: '2026-11-16T12:00:00Z' };
  const yesterdayMatch = { current: 4, lastMatchDate: '2026-11-15T12:00:00Z' };
  const refDate = new Date('2026-11-16T20:00:00Z');

  assert.strictEqual(getActiveStreak(todayMatch, refDate), 4);
  assert.strictEqual(getActiveStreak(yesterdayMatch, refDate), 4);
});

runTest('Streak expires to 0 when inactive for 2+ calendar days', () => {
  const expiredMatch = { current: 4, lastMatchDate: '2026-11-14T12:00:00Z' };
  const refDate = new Date('2026-11-16T20:00:00Z');

  assert.strictEqual(getActiveStreak(expiredMatch, refDate), 0);
});

// ----------------------------------------------------
// 3. Question Count & Match Rules (5 Questions)
// ----------------------------------------------------
console.log('\n3. Question & Match Architecture:');

runTest('Question service module loads without errors', () => {
  const qService = require('../socket/questionService');
  assert.strictEqual(typeof qService.fetchMatchQuestions, 'function');
  assert.strictEqual(typeof qService.sanitizeQuestionForClient, 'function');
});

runTest('Match Manager module loads and instantiates clean Map states', () => {
  const matchManager = require('../socket/matchManager');
  assert.strictEqual(typeof matchManager, 'object');
  assert.strictEqual(typeof matchManager.createMatch, 'function');
});

// ----------------------------------------------------
// Summary Output
// ----------------------------------------------------
console.log('\n----------------------------------------------------');
console.log(`Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('----------------------------------------------------\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
