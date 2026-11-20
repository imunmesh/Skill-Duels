const mongoose = require('mongoose');
const User = require('../models/User');
const Match = require('../models/Match');

// Rank Thresholds (FR-02, AC-04)
const RANK_TIERS = [
  { name: 'Conqueror', minXP: 3500, icon: '👑', color: '#f43f5e' },
  { name: 'Ace', minXP: 2000, icon: '⚡', color: '#a855f7' },
  { name: 'Diamond', minXP: 1000, icon: '💎', color: '#06b6d4' },
  { name: 'Platinum', minXP: 600, icon: '💠', color: '#10b981' },
  { name: 'Gold', minXP: 300, icon: '🥇', color: '#f59e0b' },
  { name: 'Silver', minXP: 100, icon: '🥈', color: '#94a3b8' },
  { name: 'Bronze', minXP: 0, icon: '🥉', color: '#cd7f32' },
];

/**
 * Determine rank based on total XP
 * @param {number} xp
 * @returns {string} Rank name
 */
const calculateRank = (xp) => {
  for (const tier of RANK_TIERS) {
    if (xp >= tier.minXP) {
      return tier.name;
    }
  }
  return 'Bronze';
};

/**
 * Available Badges Catalog (FR-10)
 */
const AVAILABLE_BADGES = {
  first_duel: {
    badgeId: 'first_duel',
    name: 'Arena Initiate',
    description: 'Completed your first 1v1 quiz duel in SkillDuels',
    icon: 'swords',
  },
  first_win: {
    badgeId: 'first_win',
    name: 'First Blood',
    description: 'Claimed your first victory in a head-to-head match',
    icon: 'trophy',
  },
  flawless: {
    badgeId: 'flawless',
    name: 'Flawless Victory',
    description: 'Won a duel with a 100% perfect question accuracy score',
    icon: 'sparkles',
  },
  speed_demon: {
    badgeId: 'speed_demon',
    name: 'Lightning Reflexes',
    description: 'Answered correctly in under 3 seconds with max speed bonus',
    icon: 'zap',
  },
  streak_3: {
    badgeId: 'streak_3',
    name: 'On Fire',
    description: 'Maintained a 3-day active participation streak',
    icon: 'flame',
  },
  streak_7: {
    badgeId: 'streak_7',
    name: 'Unstoppable Legend',
    description: 'Achieved a 7-day competitive participation streak',
    icon: 'fire',
  },
  fair_play: {
    badgeId: 'fair_play',
    name: 'Honorable Duelist',
    description: 'Maintained 100% fair play with zero anti-cheat tab warnings',
    icon: 'shield-check',
  },
  centurion: {
    badgeId: 'centurion',
    name: 'Silver Centurion',
    description: 'Accumulated 100 or more lifetime XP and reached Silver tier',
    icon: 'shield',
  },
  gold: {
    badgeId: 'gold',
    name: 'Gold Gladiator',
    description: 'Attained Gold rank with 300+ XP',
    icon: 'trophy',
  },
  veteran: {
    badgeId: 'veteran',
    name: 'Platinum Duelist',
    description: 'Attained Platinum rank with 600+ XP',
    icon: 'medal',
  },
  master: {
    badgeId: 'master',
    name: 'Diamond Master',
    description: 'Surpassed 1,000+ XP and dominated Diamond lobbies',
    icon: 'diamond',
  },
  ace: {
    badgeId: 'ace',
    name: 'Ace Champion',
    description: 'Reached 2,000+ XP and earned the prestigious Ace tier',
    icon: 'zap',
  },
  grandmaster: {
    badgeId: 'grandmaster',
    name: 'Conqueror Supreme',
    description: 'Ascended to the highest echelon (3,500+ XP) — True Conqueror',
    icon: 'crown',
  },
};

/**
 * Calculate difference in calendar days (UTC) between two dates (FR-10)
 * Ensures daily streaks track true calendar dates, not raw 24-hour millisecond windows.
 */
const getCalendarDayDifference = (dateA, dateB) => {
  if (!dateA || !dateB) return null;
  const dA = new Date(dateA);
  const dB = new Date(dateB);
  const utcDayA = Math.floor(Date.UTC(dA.getUTCFullYear(), dA.getUTCMonth(), dA.getUTCDate()) / 86400000);
  const utcDayB = Math.floor(Date.UTC(dB.getUTCFullYear(), dB.getUTCMonth(), dB.getUTCDate()) / 86400000);
  return utcDayB - utcDayA;
};

/**
 * Get active streak taking expiration into account (FR-10)
 * A streak is active if the last match occurred today (0) or yesterday (1).
 * If 2 or more calendar days have passed, active streak is 0.
 */
const getActiveStreak = (streakObj, referenceDate = new Date()) => {
  if (!streakObj || !streakObj.current || !streakObj.lastMatchDate) return 0;
  const diffDays = getCalendarDayDifference(streakObj.lastMatchDate, referenceDate);
  if (diffDays === null || diffDays > 1) return 0;
  return streakObj.current;
};

/**
 * Process match completion: updates player XP, rank, streaks, badges, and records match (FR-02, AC-04, FR-10)
 * Exposed for the Socket.IO match engine (Student 2 hook).
 *
 * @param {Object} params
 * @param {string} params.matchId
 * @param {string} params.category
 * @param {Object} params.player1 - { userId, username, score }
 * @param {Object} params.player2 - { userId, username, score }
 * @param {string|null} params.winnerId
 * @param {string} params.reason
 * @returns {Promise<Object>} Summary of awards and updated ranks for both players
 */
const processMatchProgression = async ({
  matchId,
  category = 'technical',
  player1,
  player2,
  winnerId,
  reason = 'normal',
  totalQuestions = 5,
}) => {
  const isDraw = winnerId === null;

  // Base XP calculations
  let p1BaseXP = 0;
  let p2BaseXP = 0;

  if (reason === 'opponent_forfeit' || reason === 'tab_switch_forfeit') {
    if (winnerId === player1.userId) {
      p1BaseXP = 50;
      p2BaseXP = 0; // Disqualified / kicked player gets 0 XP
    } else {
      p1BaseXP = 0;
      p2BaseXP = 50;
    }
  } else if (isDraw) {
    p1BaseXP = 25;
    p2BaseXP = 25;
  } else if (winnerId === player1.userId) {
    p1BaseXP = 50;
    p2BaseXP = 15; // Participation bonus
  } else {
    p1BaseXP = 15;
    p2BaseXP = 50;
  }

  const results = {
    [player1.userId]: { xpAwarded: p1BaseXP, streakBonus: 0, newTotalXP: p1BaseXP, rank: 'Bronze', newBadges: [] },
    [player2.userId]: { xpAwarded: p2BaseXP, streakBonus: 0, newTotalXP: p2BaseXP, rank: 'Bronze', newBadges: [] },
  };

  // If MongoDB is offline, return basic memory representation
  if (mongoose.connection.readyState !== 1) {
    return results;
  }

  try {
    const playersToProcess = [
      { p: player1, baseXP: p1BaseXP, isWin: winnerId === player1.userId },
      { p: player2, baseXP: p2BaseXP, isWin: winnerId === player2.userId },
    ];

    for (const item of playersToProcess) {
      const user = await User.findById(item.p.userId);
      if (!user) continue;

      const now = new Date();
      let streakBonus = 0;

      // 1. Calculate Participation Streak (FR-10) using calendar day differences
      const lastDate = user.streak?.lastMatchDate ? new Date(user.streak.lastMatchDate) : null;
      let currentStreak = user.streak?.current || 0;

      if (!lastDate) {
        currentStreak = 1;
      } else {
        const diffDays = getCalendarDayDifference(lastDate, now);

        if (diffDays === 0) {
          // Same calendar day, streak stays intact
          if (currentStreak === 0) currentStreak = 1;
        } else if (diffDays === 1) {
          // Consecutive calendar day, increment streak
          currentStreak += 1;
        } else if (diffDays > 1) {
          // Missed one or more days, reset streak to 1
          currentStreak = 1;
        }
      }

      // Bonus points for consistent participation streaks (FR-10)
      if (currentStreak >= 7) {
        streakBonus = 25;
      } else if (currentStreak >= 3) {
        streakBonus = 10;
      }

      const totalXpGain = item.baseXP + streakBonus;
      const newTotalXP = (user.xp || 0) + totalXpGain;
      const newWeeklyXP = (user.weeklyXP || 0) + totalXpGain;
      const newRank = calculateRank(newTotalXP);

      // 2. Evaluate Badges (FR-10)
      const existingBadgeIds = new Set((user.badges || []).map((b) => b.badgeId));
      const newlyEarnedBadges = [];

      const checkAndAwardBadge = (badgeKey) => {
        const badgeDef = AVAILABLE_BADGES[badgeKey];
        if (badgeDef && !existingBadgeIds.has(badgeDef.badgeId)) {
          newlyEarnedBadges.push(badgeDef);
          existingBadgeIds.add(badgeDef.badgeId);
        }
      };

      // Check badge award conditions (FR-10)
      checkAndAwardBadge('first_duel');
      if (item.isWin) checkAndAwardBadge('first_win');
      if (currentStreak >= 3) checkAndAwardBadge('streak_3');
      if (currentStreak >= 7) checkAndAwardBadge('streak_7');
      if (newTotalXP >= 100) checkAndAwardBadge('centurion');
      if (newTotalXP >= 300) checkAndAwardBadge('gold');
      if (newTotalXP >= 600) checkAndAwardBadge('veteran');
      if (newTotalXP >= 1000) checkAndAwardBadge('master');
      if (newTotalXP >= 2000) checkAndAwardBadge('ace');
      if (newTotalXP >= 3500) checkAndAwardBadge('grandmaster');

      // Check flawless victory (won and all questions answered correctly)
      const answersList = item.p.answers ? Object.values(item.p.answers) : [];
      if (item.isWin && answersList.length >= 3 && answersList.every((a) => a.isCorrect)) {
        checkAndAwardBadge('flawless');
      }

      // Check lightning reflexes (answered a question correctly in >= 7 seconds remaining)
      if (answersList.some((a) => a.isCorrect && a.answeredAtSecondsRemaining >= 7)) {
        checkAndAwardBadge('speed_demon');
      }

      // Check fair play (finished without any anti-cheat warnings)
      if ((item.p.tabWarnings || 0) === 0) {
        checkAndAwardBadge('fair_play');
      }

      // 3. Update User Document
      user.xp = newTotalXP;
      user.weeklyXP = newWeeklyXP;
      user.rank = newRank;

      user.stats = user.stats || {};
      user.stats.matchesPlayed = (user.stats.matchesPlayed || 0) + 1;
      if (item.isWin) user.stats.matchesWon = (user.stats.matchesWon || 0) + 1;
      else if (isDraw) user.stats.matchesDrawn = (user.stats.matchesDrawn || 0) + 1;
      else user.stats.matchesLost = (user.stats.matchesLost || 0) + 1;

      user.streak = {
        current: currentStreak,
        highest: Math.max(user.streak?.highest || 0, currentStreak),
        lastMatchDate: now,
      };

      if (newlyEarnedBadges.length > 0) {
        user.badges.push(...newlyEarnedBadges);
      }

      await user.save();

      results[item.p.userId] = {
        xpAwarded: item.baseXP,
        streakBonus,
        totalXpGain,
        newTotalXP,
        rank: newRank,
        currentStreak,
        newBadges: newlyEarnedBadges,
      };
    }

    // 4. Record Match in MongoDB for history & analytics
    await Match.create({
      matchId,
      roomId: matchId,
      category,
      players: [
        {
          userId: new mongoose.Types.ObjectId(player1.userId),
          username: player1.username,
          score: player1.score,
          xpAwarded: results[player1.userId].totalXpGain,
          isWinner: winnerId === player1.userId,
        },
        {
          userId: new mongoose.Types.ObjectId(player2.userId),
          username: player2.username,
          score: player2.score,
          xpAwarded: results[player2.userId].totalXpGain,
          isWinner: winnerId === player2.userId,
        },
      ],
      winnerId: winnerId ? new mongoose.Types.ObjectId(winnerId) : null,
      isDraw,
      reason,
      totalQuestions: totalQuestions || 5,
    });

    console.log(`[Progression Service] Match ${matchId} persisted. Ranks and XP synchronized.`);
  } catch (err) {
    console.error('[Progression Service] Error updating match progression:', err);
  }

  return results;
};

module.exports = {
  calculateRank,
  RANK_TIERS,
  AVAILABLE_BADGES,
  processMatchProgression,
  getActiveStreak,
  getCalendarDayDifference,
};
