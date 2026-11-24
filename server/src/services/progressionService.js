const mongoose = require('mongoose');
const User = require('../models/User');
const Match = require('../models/Match');
const { onMatchCompleted, getDisplayStreak } = require('./streak');

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
 * Each badge has a distinct Lucide icon, description, and canonical requirement definition.
 */
const AVAILABLE_BADGES = {
  first_duel: {
    badgeId: 'first_duel',
    name: 'Arena Initiate',
    description: 'Completed your first 1v1 quiz duel in SkillDuels',
    icon: 'swords',
    requirement: 'Play 1 duel',
  },
  first_win: {
    badgeId: 'first_win',
    name: 'First Blood',
    description: 'Claimed your first victory in a head-to-head match',
    icon: 'target',
    requirement: 'Win 1 duel',
  },
  flawless: {
    badgeId: 'flawless',
    name: 'Flawless Victory',
    description: 'Won a duel with a 100% perfect question accuracy score',
    icon: 'sparkles',
    requirement: 'Win a duel without a wrong answer',
  },
  speed_demon: {
    badgeId: 'speed_demon',
    name: 'Lightning Reflexes',
    description: 'Answered correctly in under 3 seconds with max speed bonus',
    icon: 'zap',
    requirement: 'Answer correctly with 17s+ remaining',
  },
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
  fair_play: {
    badgeId: 'fair_play',
    name: 'Honorable Duelist',
    description: 'Maintained 100% fair play with zero anti-cheat tab warnings',
    icon: 'shield-check',
    requirement: 'Finish match with 0 tab warnings',
  },
  centurion: {
    badgeId: 'centurion',
    name: 'Silver Centurion',
    description: 'Accumulated 100 or more lifetime XP and reached Silver tier',
    icon: 'shield',
    requirement: 'Reach Silver tier (100 XP)',
  },
  gold: {
    badgeId: 'gold',
    name: 'Gold Gladiator',
    description: 'Attained Gold rank with 300+ XP',
    icon: 'trophy',
    requirement: 'Reach Gold tier (300 XP)',
  },
  veteran: {
    badgeId: 'veteran',
    name: 'Platinum Duelist',
    description: 'Attained Platinum rank with 600+ XP',
    icon: 'medal',
    requirement: 'Reach Platinum tier (600 XP)',
  },
  master: {
    badgeId: 'master',
    name: 'Diamond Master',
    description: 'Surpassed 1,000+ XP and dominated Diamond lobbies',
    icon: 'diamond',
    requirement: 'Reach Diamond tier (1,000 XP)',
  },
  ace: {
    badgeId: 'ace',
    name: 'Ace Champion',
    description: 'Reached 2,000+ XP and earned the prestigious Ace tier',
    icon: 'star',
    requirement: 'Reach Ace tier (2,000 XP)',
  },
  grandmaster: {
    badgeId: 'grandmaster',
    name: 'Conqueror Supreme',
    description: 'Ascended to the highest echelon (3,500+ XP) — True Conqueror',
    icon: 'crown',
    requirement: 'Reach Conqueror tier (3,500 XP)',
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
  if (!streakObj || !streakObj.current) return 0;
  if (streakObj.lastPlayedDay) {
    return getDisplayStreak(streakObj, referenceDate).current;
  }
  if (streakObj.lastMatchDate) {
    const diffDays = getCalendarDayDifference(streakObj.lastMatchDate, referenceDate);
    if (diffDays === null || diffDays > 1) return 0;
    return streakObj.current;
  }
  return getDisplayStreak(streakObj, referenceDate).current;
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
  questionIds = [],
}) => {
  const isDraw = winnerId === null;

  // Base XP calculations
  let p1BaseXP = 0;
  let p2BaseXP = 0;

  if (reason === 'opponent_forfeit' || reason === 'tab_switch_forfeit') {
    // Anti-exploit: Reduced XP for forfeit wins (+10 XP if >= 2 questions answered, 0 if < 2)
    // Disqualified or disconnected player receives 0 XP
    const isP1Winner = winnerId === player1.userId;
    const winnerPlayer = isP1Winner ? player1 : player2;
    const answeredCount = winnerPlayer && winnerPlayer.answers ? Object.keys(winnerPlayer.answers).length : 0;

    let forfeitWinXP = answeredCount >= 2 ? 10 : 0;

    // Daily forfeit XP cap (max 3 forfeit wins awarded XP per day to prevent collusion)
    if (forfeitWinXP > 0 && mongoose.connection.readyState === 1 && winnerPlayer?.userId) {
      try {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayForfeitWins = await Match.countDocuments({
          winnerId: winnerPlayer.userId,
          reason: { $in: ['opponent_forfeit', 'tab_switch_forfeit'] },
          createdAt: { $gte: todayStart },
        });
        if (todayForfeitWins >= 3) {
          forfeitWinXP = 0;
        }
      } catch (capErr) {
        console.warn('[Progression] Daily forfeit cap check error:', capErr.message);
      }
    }

    if (isP1Winner) {
      p1BaseXP = forfeitWinXP;
      p2BaseXP = 0;
    } else {
      p1BaseXP = 0;
      p2BaseXP = forfeitWinXP;
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

      // 1. Process daily streak and capped bonus XP (FR-10, computed on calendar days in STREAK_TZ)
      const streakResult = await onMatchCompleted(
        item.p.userId,
        { matchId, endReason: reason === 'normal' ? 'completed' : reason, reason },
        now
      );
      const streakBonus = streakResult.bonusXP || 0;
      const currentStreak = streakResult.streak?.current || user.streak?.current || 0;
      const longestStreak = streakResult.streak?.longest || user.streak?.longest || user.streak?.highest || currentStreak;
      const streakExtended = Boolean(streakResult.extended);

      const oldRank = calculateRank(user.xp || 0);
      const totalXpGain = item.baseXP + streakBonus;
      const newTotalXP = (user.xp || 0) + totalXpGain;
      const newWeeklyXP = (user.weeklyXP || 0) + totalXpGain;
      const newRank = calculateRank(newTotalXP);
      const oldTierIdx = RANK_TIERS.findIndex((t) => t.name === oldRank);
      const newTierIdx = RANK_TIERS.findIndex((t) => t.name === newRank);
      const isRankUp =
        oldRank !== newRank &&
        oldTierIdx !== -1 &&
        newTierIdx !== -1 &&
        newTierIdx < oldTierIdx;

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

      // Check lightning reflexes (answered a question correctly in under 3 seconds -> >= 17s remaining)
      if (answersList.some((a) => a.isCorrect && a.answeredAtSecondsRemaining >= 17)) {
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
        longest: longestStreak,
        highest: longestStreak,
        lastPlayedDay: streakResult.streak?.lastPlayedDay || user.streak?.lastPlayedDay || null,
        lastMatchDate: now,
      };

      if (newlyEarnedBadges.length > 0) {
        user.badges.push(...newlyEarnedBadges);
      }

      await user.save();

      results[item.p.userId] = {
        xpAwarded: item.baseXP,
        streakBonus,
        streakExtended,
        totalXpGain,
        newTotalXP,
        oldRank,
        rank: newRank,
        isRankUp,
        currentStreak,
        longestStreak,
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
      questionIds: Array.isArray(questionIds)
        ? questionIds.map((id) => new mongoose.Types.ObjectId(id))
        : [],
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
