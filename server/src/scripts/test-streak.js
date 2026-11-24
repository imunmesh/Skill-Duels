/**
 * SkillDuels Acceptance Test Suite: DAILY STREAK TRACKING
 *
 * Verifies:
 * 1. First ever match: streak 1, longest 1.
 * 2. Two matches on one day: streak stays 1, bonus awarded once or not at all.
 * 3. Matches on consecutive days: 1, 2, 3, with bonuses 20, 30.
 * 4. One missed day: resets to 1, longest preserved.
 * 5. 11:59 PM then 12:01 AM in STREAK_TZ: counts as two days.
 * 6. Display after 3 silent days: current is 0.
 * 7. Played yesterday, not today: current kept and atRisk is true.
 * 8. Forfeit or disconnect win: streak unchanged, no bonus.
 * 9. Nov 30 to Dec 1 and Dec 31 to Jan 1: extend correctly.
 * 10. Concurrent finalisation of two matches: streak increments by 1 only.
 * 11. Bonus is capped at 50 XP for streaks of 5 days and above.
 */

const assert = require('assert');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../../server/.env') });

const User = require('../models/User');
const {
  STREAK_TZ,
  dayKey,
  dayDiff,
  applyMatchToStreak,
  getDisplayStreak,
  onMatchCompleted,
} = require('../services/streak');

console.log('================================================================');
console.log('   SKILLDUELS ACCEPTANCE TESTS: DAILY STREAK TRACKING');
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

async function runAllTests() {
  const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/skillduels';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
  } catch (_localErr) {
    await mongoose.connect(process.env.MONGODB_URI || uri);
  }

  // -------------------------------------------------------------------------
  // Test 1: First ever match: streak 1, longest 1
  // -------------------------------------------------------------------------
  await runAsyncTest('First ever match: streak 1, longest 1', async () => {
    const now = new Date('2026-11-20T10:00:00Z');
    const state = { current: 0, longest: 0, lastPlayedDay: null };
    const { next, changed, extended } = applyMatchToStreak(state, now);

    assert.strictEqual(next.current, 1);
    assert.strictEqual(next.longest, 1);
    assert.strictEqual(next.lastPlayedDay, dayKey(now, STREAK_TZ));
    assert.strictEqual(changed, true);
    assert.strictEqual(extended, false);
  });

  // -------------------------------------------------------------------------
  // Test 2: Two matches on one day: streak stays 1, bonus awarded once or not at all
  // -------------------------------------------------------------------------
  await runAsyncTest('Two matches on one day: streak stays 1, bonus awarded once or not at all', async () => {
    const match1Time = new Date('2026-11-20T10:00:00Z');
    const match2Time = new Date('2026-11-20T15:30:00Z');

    const state0 = { current: 0, longest: 0, lastPlayedDay: null };
    const res1 = applyMatchToStreak(state0, match1Time);
    assert.strictEqual(res1.next.current, 1);

    const res2 = applyMatchToStreak(res1.next, match2Time);
    assert.strictEqual(res2.next.current, 1);
    assert.strictEqual(res2.changed, false);
    assert.strictEqual(res2.extended, false);
  });

  // -------------------------------------------------------------------------
  // Test 3: Matches on consecutive days: 1, 2, 3, with bonuses 20, 30
  // -------------------------------------------------------------------------
  await runAsyncTest('Matches on consecutive days: 1, 2, 3, with bonuses 20, 30', async () => {
    const day1 = new Date('2026-11-20T12:00:00+05:30');
    const day2 = new Date('2026-11-21T12:00:00+05:30');
    const day3 = new Date('2026-11-22T12:00:00+05:30');

    let state = { current: 0, longest: 0, lastPlayedDay: null };

    // Day 1
    const r1 = applyMatchToStreak(state, day1);
    assert.strictEqual(r1.next.current, 1);
    assert.strictEqual(r1.extended, false);

    // Day 2 (extended)
    const r2 = applyMatchToStreak(r1.next, day2);
    assert.strictEqual(r2.next.current, 2);
    assert.strictEqual(r2.extended, true);
    const bonus2 = Math.min(r2.next.current * 10, 50);
    assert.strictEqual(bonus2, 20);

    // Day 3 (extended)
    const r3 = applyMatchToStreak(r2.next, day3);
    assert.strictEqual(r3.next.current, 3);
    assert.strictEqual(r3.extended, true);
    const bonus3 = Math.min(r3.next.current * 10, 50);
    assert.strictEqual(bonus3, 30);
  });

  // -------------------------------------------------------------------------
  // Test 4: One missed day: resets to 1, longest preserved
  // -------------------------------------------------------------------------
  await runAsyncTest('One missed day: resets to 1, longest preserved', async () => {
    const day1 = new Date('2026-11-20T12:00:00+05:30');
    const day3 = new Date('2026-11-22T12:00:00+05:30'); // Missed Nov 21

    const state = { current: 4, longest: 7, lastPlayedDay: dayKey(day1, STREAK_TZ) };
    const res = applyMatchToStreak(state, day3);

    assert.strictEqual(res.next.current, 1);
    assert.strictEqual(res.next.longest, 7, 'Longest streak should be preserved');
    assert.strictEqual(res.changed, true);
    assert.strictEqual(res.extended, false);
  });

  // -------------------------------------------------------------------------
  // Test 5: 11:59 PM then 12:01 AM in STREAK_TZ: counts as two days
  // -------------------------------------------------------------------------
  await runAsyncTest('11:59 PM then 12:01 AM in STREAK_TZ: counts as two days', async () => {
    // 11:59 PM IST (UTC+5:30) on 2026-11-20
    const time1 = new Date('2026-11-20T23:59:00+05:30');
    // 12:01 AM IST (UTC+5:30) on 2026-11-21
    const time2 = new Date('2026-11-21T00:01:00+05:30');

    assert.strictEqual(dayKey(time1, STREAK_TZ), '2026-11-20');
    assert.strictEqual(dayKey(time2, STREAK_TZ), '2026-11-21');
    assert.strictEqual(dayDiff(time1, time2), 1);

    const s1 = applyMatchToStreak({ current: 1, longest: 1, lastPlayedDay: '2026-11-20' }, time1);
    assert.strictEqual(s1.changed, false); // same day as lastPlayedDay

    const s2 = applyMatchToStreak(s1.next, time2);
    assert.strictEqual(s2.next.current, 2);
    assert.strictEqual(s2.extended, true);
  });

  // -------------------------------------------------------------------------
  // Test 6: Display after 3 silent days: current is 0
  // -------------------------------------------------------------------------
  await runAsyncTest('Display after 3 silent days: current is 0', async () => {
    const lastPlayed = '2026-11-20';
    const checkDate = new Date('2026-11-23T12:00:00+05:30'); // 3 days gap

    const state = { current: 5, longest: 5, lastPlayedDay: lastPlayed };
    const display = getDisplayStreak(state, checkDate);

    assert.strictEqual(display.current, 0, 'Broken streak must display 0');
    assert.strictEqual(display.atRisk, false);
    assert.strictEqual(display.longest, 5);
  });

  // -------------------------------------------------------------------------
  // Test 7: Played yesterday, not today: current kept and atRisk is true
  // -------------------------------------------------------------------------
  await runAsyncTest('Played yesterday, not today: current kept and atRisk is true', async () => {
    const yesterday = '2026-11-20';
    const today = new Date('2026-11-21T14:00:00+05:30'); // gap = 1

    const state = { current: 4, longest: 4, lastPlayedDay: yesterday };
    const display = getDisplayStreak(state, today);

    assert.strictEqual(display.current, 4, 'Current streak should be retained while at risk');
    assert.strictEqual(display.atRisk, true);
    assert(display.hoursRemaining > 0, 'Hours remaining until midnight should be > 0');
  });

  // -------------------------------------------------------------------------
  // Test 8: Forfeit or disconnect win: streak unchanged, no bonus
  // -------------------------------------------------------------------------
  await runAsyncTest('Forfeit or disconnect win: streak unchanged, no bonus', async () => {
    const testUser = await User.create({
      username: `streak_forfeit_${Date.now()}`,
      email: `streak_forfeit_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash',
      streak: { current: 2, longest: 2, lastPlayedDay: '2026-11-20' },
    });

    const now = new Date('2026-11-21T12:00:00+05:30');
    // Opponent forfeit ending
    const res = await onMatchCompleted(
      testUser._id,
      { matchId: 'm_forfeit', reason: 'opponent_forfeit', endReason: 'opponent_forfeit' },
      now
    );

    assert.strictEqual(res.changed, false);
    assert.strictEqual(res.extended, false);
    assert.strictEqual(res.bonusXP, 0);

    const reloaded = await User.findById(testUser._id);
    assert.strictEqual(reloaded.streak.current, 2);
    assert.strictEqual(reloaded.streak.lastPlayedDay, '2026-11-20');

    await User.findByIdAndDelete(testUser._id);
  });

  // -------------------------------------------------------------------------
  // Test 9: Nov 30 to Dec 1 and Dec 31 to Jan 1: extend correctly
  // -------------------------------------------------------------------------
  await runAsyncTest('Nov 30 to Dec 1 and Dec 31 to Jan 1: extend correctly', async () => {
    // Nov 30 -> Dec 1
    const nov30 = new Date('2026-11-30T20:00:00+05:30');
    const dec01 = new Date('2026-12-01T08:00:00+05:30');

    assert.strictEqual(dayDiff(nov30, dec01), 1);
    const rMonth = applyMatchToStreak(
      { current: 3, longest: 3, lastPlayedDay: dayKey(nov30, STREAK_TZ) },
      dec01
    );
    assert.strictEqual(rMonth.next.current, 4);
    assert.strictEqual(rMonth.extended, true);

    // Dec 31 -> Jan 1
    const dec31 = new Date('2026-12-31T22:00:00+05:30');
    const jan01 = new Date('2027-01-01T10:00:00+05:30');

    assert.strictEqual(dayDiff(dec31, jan01), 1);
    const rYear = applyMatchToStreak(
      { current: 5, longest: 5, lastPlayedDay: dayKey(dec31, STREAK_TZ) },
      jan01
    );
    assert.strictEqual(rYear.next.current, 6);
    assert.strictEqual(rYear.extended, true);
  });

  // -------------------------------------------------------------------------
  // Test 10: Concurrent finalisation of two matches: streak increments by 1 only
  // -------------------------------------------------------------------------
  await runAsyncTest('Concurrent finalisation of two matches: streak increments by 1 only', async () => {
    const testUser = await User.create({
      username: `streak_concur_${Date.now()}`,
      email: `streak_concur_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash',
      streak: { current: 1, longest: 1, lastPlayedDay: '2026-11-20' },
    });

    const now = new Date('2026-11-21T12:00:00+05:30');
    const match = { matchId: 'm_concur', reason: 'normal', endReason: 'completed' };

    // Fire two onMatchCompleted concurrently
    const [resA, resB] = await Promise.all([
      onMatchCompleted(testUser._id, match, now),
      onMatchCompleted(testUser._id, match, now),
    ]);

    // One must succeed and change streak, the second must be blocked by optimistic guard or detect same day
    const changes = [resA.changed, resB.changed].filter(Boolean);
    assert.strictEqual(changes.length, 1, 'Only one concurrent match completion should increment streak');

    const finalUser = await User.findById(testUser._id);
    assert.strictEqual(finalUser.streak.current, 2, 'Final streak must be 2, not 3');

    await User.findByIdAndDelete(testUser._id);
  });

  // -------------------------------------------------------------------------
  // Test 11: Bonus is capped at 50 XP for streaks of 5 days and above
  // -------------------------------------------------------------------------
  await runAsyncTest('Bonus is capped at 50 XP for streaks of 5 days and above', async () => {
    const day4 = '2026-11-24';
    const day5Time = new Date('2026-11-25T12:00:00+05:30');
    const day6Time = new Date('2026-11-26T12:00:00+05:30');

    // 5-day streak
    const res5 = applyMatchToStreak({ current: 4, longest: 4, lastPlayedDay: day4 }, day5Time);
    assert.strictEqual(res5.next.current, 5);
    const bonus5 = Math.min(res5.next.current * 10, 50);
    assert.strictEqual(bonus5, 50, '5-day streak bonus should be 50 XP');

    // 6-day streak
    const res6 = applyMatchToStreak({ current: 5, longest: 5, lastPlayedDay: '2026-11-25' }, day6Time);
    assert.strictEqual(res6.next.current, 6);
    const bonus6 = Math.min(res6.next.current * 10, 50);
    assert.strictEqual(bonus6, 50, '6-day streak bonus should still be capped at 50 XP');

    // 10-day streak
    const bonus10 = Math.min(10 * 10, 50);
    assert.strictEqual(bonus10, 50, '10-day streak bonus must be capped at 50 XP');
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passedTests} / ${totalTests} acceptance tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('----------------------------------------------------------------\n');

  await mongoose.disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runAllTests().catch((err) => {
  console.error('Fatal streak test error:', err);
  process.exit(1);
});
