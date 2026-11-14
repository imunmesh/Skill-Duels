const { processMatchProgression } = require('../services/progressionService');

/**
 * Service hook to calculate and update player XP upon match completion (FR-02, Student 5 hook)
 *
 * @param {Object} params
 * @param {string} params.matchId
 * @param {string} [params.category]
 * @param {Object} params.player1 - { userId, username, score }
 * @param {Object} params.player2 - { userId, username, score }
 * @param {string|null} params.winnerId - ID of winning user or null for draw
 * @param {string} params.reason - 'normal' | 'opponent_forfeit' | 'draw'
 * @returns {Promise<Object>} Summary of XP awarded to each player
 */
const awardMatchXP = async (params) => {
  return await processMatchProgression(params);
};

module.exports = {
  awardMatchXP,
};
