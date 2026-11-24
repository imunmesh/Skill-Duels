const { STREAK_TZ } = require('../config/constants');
const User = require('../models/User');

const AVAILABLE_BADGES = {
  streak_3: {
    badgeId: 'streak_3',
    name: 'On Fire',
    description: 'Maintained a 3-day active participation streak',
    icon: 'flame',
    requirement: '3-day streak',
  },
  streak_7: {
    badgeId: 'streak_7',
    name: 'Unstoppable Legend',
    description: 'Achieved a 7-day competitive participation streak',
    icon: 'award',
    requirement: '7-day streak',
  },
};

/**
 * Return YYYY-MM-DD date key in specified timezone using Intl.DateTimeFormat
 *
 * @param {Date|number|string} [date=new Date()]
 * @param {string} [tz=STREAK_TZ]
 * @returns {string} Date string e.g. "2026-11-24"
 */
const dayKey = (date = new Date(), tz = STREAK_TZ) => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/**
 * Parse YYYY-MM-DD string into UTC timestamp representation
 *
 * @param {string} dayStr
 * @returns {number}
 */
const parseDayPartsToUTC = (dayStr) => {
  const [y, m, d] = dayStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/**
 * Compute the exact calendar day difference between two dates/keys (b - a)
 *
 * @param {string|Date} a - earlier or reference date/key
 * @param {string|Date} b - later or test date/key
 * @returns {number} Difference in days (1 = consecutive, 0 = same day, >1 = missed days)
 */
const dayDiff = (a, b) => {
  const keyA = typeof a === 'string' && a.length === 10 ? a : dayKey(a);
  const keyB = typeof b === 'string' && b.length === 10 ? b : dayKey(b);
  const utcA = parseDayPartsToUTC(keyA);
  const utcB = parseDayPartsToUTC(keyB);
  return Math.round((utcB - utcA) / 86400000);
};

/**
 * Calculate hours remaining until midnight in STREAK_TZ
 *
 * @param {Date} [now=new Date()]
 * @returns {number}
 */
const getHoursUntilMidnight = (now = new Date()) => {
  const d = now instanceof Date ? now : new Date(now);
  const today = dayKey(d, STREAK_TZ);
  const [y, m, dNum] = today.split('-').map(Number);
  // Midnight in Asia/Kolkata (UTC+05:30) is 18:30:00 UTC on current day key
  const midnightUtc = Date.UTC(y, m - 1, dNum, 18, 30, 0);
  const diffMs = midnightUtc - d.getTime();
  return Math.max(0, Math.ceil(diffMs / 3600000));
};

/**
 * Pure calculation: applies a completed match to a player's streak state.
 *
 * Logic:
 * - no previous day -> streak 1
 * - same day -> no change
 * - previous day was yesterday -> streak + 1 (extended)
 * - gap of 2+ days -> reset to 1. Keep longest.
 *
 * @param {Object} state - { current, longest, highest, lastPlayedDay }
 * @param {Date} [now=new Date()]
 * @returns {{ next: { current: number, longest: number, highest: number, lastPlayedDay: string }, changed: boolean, extended: boolean }}
 */
const applyMatchToStreak = (state, now = new Date()) => {
  const todayKey = dayKey(now, STREAK_TZ);
  const lastDay = state?.lastPlayedDay || null;
  const prevCurrent = Number(state?.current) || 0;
  const prevLongest = Number(state?.longest ?? state?.highest) || 0;

  // 1. No previous day -> streak 1
  if (!lastDay) {
    const nextCurrent = 1;
    const nextLongest = Math.max(prevLongest, nextCurrent);
    return {
      next: {
        current: nextCurrent,
        longest: nextLongest,
        highest: nextLongest,
        lastPlayedDay: todayKey,
      },
      changed: true,
      extended: false,
    };
  }

  const diff = dayDiff(lastDay, todayKey);

  // 2. Same day -> no change
  if (diff === 0) {
    const currentVal = prevCurrent || 1;
    const longestVal = Math.max(prevLongest, currentVal);
    return {
      next: {
        current: currentVal,
        longest: longestVal,
        highest: longestVal,
        lastPlayedDay: todayKey,
      },
      changed: false,
      extended: false,
    };
  }

  // 3. Previous day was yesterday -> streak + 1 (extended)
  if (diff === 1) {
    const nextCurrent = prevCurrent + 1;
    const nextLongest = Math.max(prevLongest, nextCurrent);
    return {
      next: {
        current: nextCurrent,
        longest: nextLongest,
        highest: nextLongest,
        lastPlayedDay: todayKey,
      },
      changed: true,
      extended: true,
    };
  }

  // 4. Gap of 2+ days -> reset to 1. Keep longest.
  const nextCurrent = 1;
  const nextLongest = Math.max(prevLongest, 1);
  return {
    next: {
      current: nextCurrent,
      longest: nextLongest,
      highest: nextLongest,
      lastPlayedDay: todayKey,
    },
    changed: true,
    extended: false,
  };
};

/**
 * Return display streak and risk state without modifying database.
 * Never shows a stale streak:
 * - gap > 1 -> current 0;
 * - gap === 1 -> keep current and atRisk true;
 * - otherwise (same day) -> current and atRisk false.
 *
 * @param {Object} state - { current, longest, highest, lastPlayedDay }
 * @param {Date} [now=new Date()]
 * @returns {{ current: number, atRisk: boolean, hoursRemaining: number, longest: number }}
 */
const getDisplayStreak = (state, now = new Date()) => {
  const d = now instanceof Date ? now : new Date(now);
  const todayKey = dayKey(d, STREAK_TZ);
  const lastDay = state?.lastPlayedDay || null;
  const currentStored = Number(state?.current) || 0;
  const longest = Number(state?.longest ?? state?.highest) || 0;
  const hoursRemaining = getHoursUntilMidnight(d);

  if (!lastDay || currentStored === 0) {
    return { current: 0, atRisk: false, hoursRemaining, longest };
  }

  const gap = dayDiff(lastDay, todayKey);

  if (gap > 1) {
    // Gap > 1: broken streak drops to 0
    return { current: 0, atRisk: false, hoursRemaining, longest };
  }

  if (gap === 1) {
    // Gap === 1: played yesterday, keep current and atRisk true
    return { current: currentStored, atRisk: true, hoursRemaining, longest };
  }

  // gap <= 0: played today, streak safe
  return { current: currentStored, atRisk: false, hoursRemaining, longest };
};

/**
 * Process match completion for a user's streak:
 * a) return early if match was not completed normally
 * b) compute applyMatchToStreak and return if nothing changed
 * c) save with optimistic guard:
 *    User.updateOne({ _id, "streak.lastPlayedDay": previousValue }, { $set: { streak: next } })
 *    and stop if modifiedCount === 0 (prevent double-counting)
 * d) if extended, award capped bonus XP once: min(current * 10, 50)
 * e) call badge checks (On Fire at 3 days, Unstoppable Legend at 7 days)
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {Object} match - { endReason, reason }
 * @param {Date} [now=new Date()]
 * @returns {Promise<{ changed: boolean, extended: boolean, bonusXP: number, streak?: Object, newBadges?: Array }>}
 */
const onMatchCompleted = async (userId, match, now = new Date()) => {
  // a) Return early if match was not completed normally
  const isCompleted = match?.endReason === 'completed' || match?.reason === 'normal';
  if (!isCompleted) {
    return { changed: false, extended: false, bonusXP: 0 };
  }

  const user = await User.findById(userId);
  if (!user) {
    return { changed: false, extended: false, bonusXP: 0 };
  }

  const previousValue = user.streak?.lastPlayedDay || null;

  // b) Compute applyMatchToStreak and return if nothing changed
  const { next, changed, extended } = applyMatchToStreak(user.streak, now);
  if (!changed) {
    return {
      changed: false,
      extended: false,
      bonusXP: 0,
      streak: next,
      newBadges: [],
    };
  }

  // c) Save with optimistic guard:
  const updateResult = await User.updateOne(
    {
      _id: user._id,
      'streak.lastPlayedDay': previousValue,
    },
    {
      $set: {
        'streak.current': next.current,
        'streak.longest': next.longest,
        'streak.highest': next.longest,
        'streak.lastPlayedDay': next.lastPlayedDay,
        'streak.lastMatchDate': now,
      },
    }
  );

  // If another concurrent match completion already updated the streak, stop
  if (updateResult.modifiedCount === 0) {
    console.warn(`[Streak] Optimistic lock aborted double-update for user ${userId}`);
    return { changed: false, extended: false, bonusXP: 0, streak: next, newBadges: [] };
  }

  // d) If extended, award capped bonus XP once: min(current * 10, 50)
  let bonusXP = 0;
  if (extended) {
    bonusXP = Math.min(next.current * 10, 50);
    if (bonusXP > 0) {
      await User.updateOne(
        { _id: user._id },
        {
          $inc: { xp: bonusXP, weeklyXP: bonusXP },
        }
      );
    }
  }

  // e) Call badge check (On Fire at 3 days, Unstoppable Legend at 7 days)
  const newlyEarnedBadges = [];
  const existingBadgeIds = new Set((user.badges || []).map((b) => b.badgeId));

  if (next.current >= 3 && !existingBadgeIds.has('streak_3')) {
    newlyEarnedBadges.push(AVAILABLE_BADGES.streak_3);
  }
  if (next.current >= 7 && !existingBadgeIds.has('streak_7')) {
    newlyEarnedBadges.push(AVAILABLE_BADGES.streak_7);
  }

  if (newlyEarnedBadges.length > 0) {
    await User.updateOne(
      { _id: user._id },
      { $push: { badges: { $each: newlyEarnedBadges } } }
    );
  }

  return {
    changed: true,
    extended,
    bonusXP,
    streak: next,
    newBadges: newlyEarnedBadges,
  };
};

module.exports = {
  STREAK_TZ,
  dayKey,
  dayDiff,
  getHoursUntilMidnight,
  applyMatchToStreak,
  getDisplayStreak,
  onMatchCompleted,
};
