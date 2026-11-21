const User = require('../models/User');
const Match = require('../models/Match');
const { RANK_TIERS, AVAILABLE_BADGES, getActiveStreak, calculateRank } = require('../services/progressionService');

const VALID_TIERS = new Set(['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ace', 'Conqueror']);
const resolvePlayerTier = (player) => {
  if (player.rank && VALID_TIERS.has(player.rank)) {
    return player.rank;
  }
  return calculateRank(player.xp || 0);
};

/**
 * @desc    Get Global Leaderboard ranked by XP (FR-06, AC-05, NFR-02)
 * @route   GET /api/leaderboard/global
 * @access  Public
 */
const getGlobalLeaderboard = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { role: 'player' };

    // Leverage compound index { role: 1, xp: -1 } for efficient scalable execution (NFR-02)
    const totalPlayers = await User.countDocuments(filter);
    const players = await User.find(filter)
      .select('username displayName avatarUrl xp rank badges stats streak createdAt')
      .sort({ xp: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach dynamic position rank (1, 2, 3...)
    const rankedPlayers = players.map((player, idx) => ({
      position: skip + idx + 1,
      id: player._id,
      username: player.username,
      displayName: player.displayName || player.username,
      avatarUrl: player.avatarUrl || '',
      xp: player.xp || 0,
      rank: resolvePlayerTier(player),
      badgesCount: (player.badges || []).length,
      matchesPlayed: player.stats?.matchesPlayed || 0,
      matchesWon: player.stats?.matchesWon || 0,
      winRate:
        player.stats?.matchesPlayed > 0
          ? Math.round((player.stats.matchesWon / player.stats.matchesPlayed) * 100)
          : 0,
      streak: getActiveStreak(player.streak),
    }));

    return res.status(200).json({
      success: true,
      type: 'global',
      totalPlayers,
      totalPages: Math.ceil(totalPlayers / limit),
      currentPage: page,
      leaderboard: rankedPlayers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Weekly Rankings (FR-07, NFR-02)
 * @route   GET /api/leaderboard/weekly
 * @access  Public
 */
const getWeeklyLeaderboard = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { role: 'player' };

    // Sort by weeklyXP descending (indexed)
    const totalPlayers = await User.countDocuments(filter);
    const players = await User.find(filter)
      .select('username displayName avatarUrl weeklyXP xp rank badges stats streak')
      .sort({ weeklyXP: -1, xp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const rankedPlayers = players.map((player, idx) => ({
      position: skip + idx + 1,
      id: player._id,
      username: player.username,
      displayName: player.displayName || player.username,
      avatarUrl: player.avatarUrl || '',
      weeklyXP: player.weeklyXP || 0,
      totalXP: player.xp || 0,
      xp: player.weeklyXP || 0,
      rank: resolvePlayerTier(player),
      badgesCount: (player.badges || []).length,
      matchesPlayed: player.stats?.matchesPlayed || 0,
      matchesWon: player.stats?.matchesWon || 0,
      winRate:
        player.stats?.matchesPlayed > 0
          ? Math.round((player.stats.matchesWon / player.stats.matchesPlayed) * 100)
          : 0,
      streak: getActiveStreak(player.streak),
    }));

    return res.status(200).json({
      success: true,
      type: 'weekly',
      totalPlayers,
      totalPages: Math.ceil(totalPlayers / limit),
      currentPage: page,
      leaderboard: rankedPlayers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get full player profile, rank breakdown, badges, and recent matches (FR-02, FR-10)
 * @route   GET /api/leaderboard/user/:id
 * @access  Public / Authenticated
 */
const getUserProgression = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch recent matches with server-side pagination & category filter
    const userIdObj = user._id;
    const userIdStr = user._id.toString();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const categoryParam = req.query.category;

    const matchQuery = {
      $or: [
        { 'players.userId': userIdObj },
        { 'players.userId': userIdStr },
        { player1: userIdObj },
        { player2: userIdObj },
        { player1: userIdStr },
        { player2: userIdStr },
      ],
    };

    if (categoryParam && categoryParam !== 'all') {
      if (categoryParam === 'ml' || categoryParam === 'mi') {
        matchQuery.category = { $in: ['ml', 'mi', 'Machine Learning'] };
      } else {
        matchQuery.category = categoryParam;
      }
    }

    const totalMatchesCount = await Match.countDocuments(matchQuery);

    const recentMatches = await Match.find(matchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('player1', 'username')
      .populate('player2', 'username')
      .lean();

    // Calculate position in global leaderboard
    const betterRankedCount = await User.countDocuments({
      role: 'player',
      xp: { $gt: user.xp },
    });
    const globalRankPosition = betterRankedCount + 1;

    // Badges summary with real dynamic requirement text and progress
    const earnedBadgeIds = new Set((user.badges || []).map((b) => b.badgeId));
    const activeStreakCount = getActiveStreak(user.streak);

    const allBadgesWithStatus = Object.values(AVAILABLE_BADGES).map((b) => {
      const isUnlocked = earnedBadgeIds.has(b.badgeId);
      let requirementText = b.requirement || 'Play matches and keep streaks to unlock';
      let progressPercent = 0;

      if (b.badgeId === 'streak_3') {
        const cur = Math.min(3, activeStreakCount);
        requirementText = `3-day streak (${cur}/3)`;
        progressPercent = Math.min(100, Math.round((cur / 3) * 100));
      } else if (b.badgeId === 'streak_7') {
        const cur = Math.min(7, activeStreakCount);
        requirementText = `7-day streak (${cur}/7)`;
        progressPercent = Math.min(100, Math.round((cur / 7) * 100));
      } else if (b.badgeId === 'centurion') {
        const needed = Math.max(0, 100 - (user.xp || 0));
        requirementText = isUnlocked ? 'Reached Silver (100+ XP)' : `${needed} XP to go`;
        progressPercent = Math.min(100, Math.round(((user.xp || 0) / 100) * 100));
      } else if (b.badgeId === 'gold') {
        const needed = Math.max(0, 300 - (user.xp || 0));
        requirementText = isUnlocked ? 'Reached Gold (300+ XP)' : `${needed} XP to go`;
        progressPercent = Math.min(100, Math.round(((user.xp || 0) / 300) * 100));
      } else if (b.badgeId === 'veteran') {
        const needed = Math.max(0, 600 - (user.xp || 0));
        requirementText = isUnlocked ? 'Reached Platinum (600+ XP)' : `${needed} XP to go`;
        progressPercent = Math.min(100, Math.round(((user.xp || 0) / 600) * 100));
      } else if (b.badgeId === 'master') {
        const needed = Math.max(0, 1000 - (user.xp || 0));
        requirementText = isUnlocked ? 'Reached Diamond (1,000+ XP)' : `${needed} XP to go`;
        progressPercent = Math.min(100, Math.round(((user.xp || 0) / 1000) * 100));
      } else if (b.badgeId === 'ace') {
        const needed = Math.max(0, 2000 - (user.xp || 0));
        requirementText = isUnlocked ? 'Reached Ace (2,000+ XP)' : `${needed} XP to go`;
        progressPercent = Math.min(100, Math.round(((user.xp || 0) / 2000) * 100));
      } else if (b.badgeId === 'grandmaster') {
        const needed = Math.max(0, 3500 - (user.xp || 0));
        requirementText = isUnlocked ? 'Reached Conqueror (3,500+ XP)' : `${needed} XP to go`;
        progressPercent = Math.min(100, Math.round(((user.xp || 0) / 3500) * 100));
      } else if (b.badgeId === 'first_duel') {
        requirementText = isUnlocked ? 'First duel played' : 'Play 1 duel (0/1)';
        progressPercent = isUnlocked ? 100 : 0;
      } else if (b.badgeId === 'first_win') {
        requirementText = isUnlocked ? 'First victory claimed' : 'Win 1 duel (0/1)';
        progressPercent = isUnlocked ? 100 : 0;
      } else if (b.badgeId === 'flawless') {
        requirementText = 'Win a duel without a wrong answer';
        progressPercent = isUnlocked ? 100 : 0;
      } else if (b.badgeId === 'speed_demon') {
        requirementText = 'Answer correctly in < 3s (7s+ left)';
        progressPercent = isUnlocked ? 100 : 0;
      } else if (b.badgeId === 'fair_play') {
        requirementText = 'Finish match with 0 tab warnings';
        progressPercent = isUnlocked ? 100 : 0;
      }

      return {
        ...b,
        requirement: requirementText,
        progressPercent,
        isUnlocked,
        unlockedAt: (user.badges || []).find((ub) => ub.badgeId === b.badgeId)?.awardedAt || null,
      };
    });

    // Find next rank tier
    const sortedTiers = [...RANK_TIERS].sort((a, b) => a.minXP - b.minXP);
    const nextTier = sortedTiers.find((t) => t.minXP > user.xp) || null;
    const currentTier = sortedTiers.slice().reverse().find((t) => user.xp >= t.minXP) || sortedTiers[0];

    const xpToNextRank = nextTier ? Math.max(0, nextTier.minXP - user.xp) : 0;
    const rankProgressPercent = nextTier
      ? Math.min(100, Math.round(((user.xp - currentTier.minXP) / (nextTier.minXP - currentTier.minXP)) * 100))
      : 100;

    // Calculate best category from matches
    const categoryWinCounts = {};
    recentMatches.forEach((m) => {
      const isWinner = m.winnerId
        ? m.winnerId.toString() === user._id.toString()
        : (m.winner && (m.winner._id || m.winner).toString() === user._id.toString());
      if (isWinner && m.category) {
        const catKey = m.category === 'mi' ? 'ml' : m.category;
        categoryWinCounts[catKey] = (categoryWinCounts[catKey] || 0) + 1;
      }
    });

    let bestCategory = 'DSA';
    let maxWins = -1;
    for (const [cat, count] of Object.entries(categoryWinCounts)) {
      if (count > maxWins) {
        maxWins = count;
        bestCategory = cat;
      }
    }

    return res.status(200).json({
      success: true,
      profile: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        xp: user.xp,
        weeklyXP: user.weeklyXP,
        rank: calculateRank(user.xp || 0),
        globalPosition: globalRankPosition,
        currentTier,
        nextTier,
        xpToNextRank,
        rankProgressPercent,
        stats: {
          matchesPlayed: user.stats?.matchesPlayed || 0,
          matchesWon: user.stats?.matchesWon || 0,
          matchesLost: user.stats?.matchesLost || 0,
          matchesDrawn: user.stats?.matchesDrawn || 0,
          winRate:
            user.stats?.matchesPlayed > 0
              ? Math.round((user.stats.matchesWon / user.stats.matchesPlayed) * 100)
              : 0,
          bestCategory: bestCategory || 'DSA',
        },
        pagination: {
          page,
          limit,
          total: totalMatchesCount,
          totalPages: Math.ceil(totalMatchesCount / limit) || 1,
        },
        streak: {
          current: getActiveStreak(user.streak),
          highest: user.streak?.highest || 0,
          lastMatchDate: user.streak?.lastMatchDate || null,
        },
        badges: allBadgesWithStatus,
        recentMatches: recentMatches.map((m) => {
          if (m.players && m.players.length > 0) {
            const playerEntry = m.players.find((p) => p.userId?.toString() === user._id.toString());
            const opponentEntry = m.players.find((p) => p.userId?.toString() !== user._id.toString());
            const isWinner = m.winnerId
              ? m.winnerId.toString() === user._id.toString()
              : (playerEntry?.isWinner || false);
            const isForfeit = m.reason === 'opponent_forfeit' || m.reason === 'tab_switch_forfeit';
            
            // Reduced forfeit XP logic check
            let xp = playerEntry?.xpAwarded;
            if (xp === undefined || xp === null) {
              xp = isForfeit ? (isWinner ? 10 : 0) : (isWinner ? 50 : 15);
            }

            return {
              matchId: m.matchId || m._id.toString(),
              category: m.category || 'technical',
              myScore: playerEntry?.score || 0,
              opponentUsername: opponentEntry?.username || 'Opponent',
              opponentScore: opponentEntry?.score || 0,
              isWinner,
              isDraw: m.isDraw || (!m.winnerId && !m.winner),
              reason: m.reason || 'normal',
              isForfeit,
              xpAwarded: xp,
              totalQuestions: m.totalQuestions || 5,
              playedAt: m.createdAt,
            };
          } else {
            // Legacy schema compatibility
            const isP1 =
              m.player1?._id?.toString() === user._id.toString() ||
              m.player1?.toString() === user._id.toString();
            const opponentUser = isP1 ? m.player2 : m.player1;
            const myScore = isP1 ? m.player1Score || 0 : m.player2Score || 0;
            const opponentScore = isP1 ? m.player2Score || 0 : m.player1Score || 0;
            const isWinner = m.winner
              ? (m.winner._id || m.winner).toString() === user._id.toString()
              : false;
            const isForfeit = m.reason === 'opponent_forfeit' || m.reason === 'tab_switch_forfeit';
            return {
              matchId: m._id.toString(),
              category: m.category || 'technical',
              myScore,
              opponentUsername: opponentUser?.username || 'Opponent',
              opponentScore,
              isWinner,
              isDraw: !m.winner,
              reason: m.reason || 'normal',
              isForfeit,
              xpAwarded: isForfeit ? (isWinner ? 10 : 0) : (isWinner ? 50 : 15),
              totalQuestions: m.totalQuestions || 5,
              playedAt: m.createdAt,
            };
          }
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Public Top Leaderboard (FR-06, FR-07)
 *          Strictly returns public fields only: username, displayName, avatarUrl, tier, xp, rank.
 *          Never returns email, passwordHash, or role.
 * @route   GET /api/leaderboard/public
 * @access  Public
 */
const getPublicLeaderboard = async (req, res, next) => {
  try {
    const type = req.query.type === 'weekly' ? 'weekly' : 'global';
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const sortField = type === 'weekly' ? { weeklyXP: -1, xp: -1 } : { xp: -1, createdAt: 1 };

    const players = await User.find({ role: 'player' })
      .select('username displayName avatarUrl rank xp weeklyXP stats')
      .sort(sortField)
      .limit(limit)
      .lean();

    const publicList = players.map((player, idx) => ({
      position: idx + 1,
      id: player._id,
      username: player.username,
      displayName: player.displayName || player.username,
      avatarUrl: player.avatarUrl || '',
      xp: type === 'weekly' ? player.weeklyXP || 0 : player.xp || 0,
      rank: calculateRank(player.xp || 0),
      tier: calculateRank(player.xp || 0),
      winRate:
        player.stats?.matchesPlayed > 0
          ? Math.round((player.stats.matchesWon / player.stats.matchesPlayed) * 100)
          : 0,
      matchesWon: player.stats?.matchesWon || 0,
    }));

    return res.status(200).json({
      success: true,
      type,
      count: publicList.length,
      leaderboard: publicList,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGlobalLeaderboard,
  getWeeklyLeaderboard,
  getUserProgression,
  getPublicLeaderboard,
};
