const { fetchMatchQuestions, sanitizeQuestionForClient } = require('./questionService');
const { awardMatchXP } = require('./xpService');

/**
 * Match Manager
 * Handles real-time duel state machine, server timers, scoring, and reconnects.
 */
class MatchManager {
  constructor() {
    // Map of matchId -> MatchState
    this.matches = new Map();
    // Map of userId -> matchId (for reconnection)
    this.userToMatch = new Map();
    // Map of socketId -> matchId
    this.socketToMatch = new Map();
  }

  /**
   * Initialize a new 1v1 duel match (FR-03, AC-01)
   */
  async createMatch(io, player1, player2, category = 'technical') {
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const questions = await fetchMatchQuestions(category, 5);

    const matchState = {
      id: matchId,
      category,
      room: matchId,
      questions,
      currentQuestionIndex: 0,
      state: 'starting', // 'starting' | 'in_progress' | 'intermission' | 'finished'
      timer: null,
      remainingSeconds: 0,
      forfeitTimer: null,
      players: {
        [player1.userId]: {
          userId: player1.userId,
          username: player1.username,
          socketId: player1.socketId,
          score: 0,
          tabWarnings: 0,
          connected: true,
          answers: {}, // questionIndex -> { optionIndex, correct, points, responseTime }
        },
        [player2.userId]: {
          userId: player2.userId,
          username: player2.username,
          socketId: player2.socketId,
          score: 0,
          tabWarnings: 0,
          connected: true,
          answers: {},
        },
      },
    };

    this.matches.set(matchId, matchState);
    this.userToMatch.set(player1.userId, matchId);
    this.userToMatch.set(player2.userId, matchId);
    this.socketToMatch.set(player1.socketId, matchId);
    this.socketToMatch.set(player2.socketId, matchId);

    // Join both player sockets to room
    const s1 = io.sockets.sockets.get(player1.socketId);
    const s2 = io.sockets.sockets.get(player2.socketId);

    if (s1) s1.join(matchId);
    if (s2) s2.join(matchId);

    console.log(`[Match Engine] Match created: ${matchId} (${player1.username} vs ${player2.username})`);

    // Emit match_start to both players with opponent info
    io.to(player1.socketId).emit('match_start', {
      matchId,
      category,
      opponent: {
        userId: player2.userId,
        username: player2.username,
      },
      totalQuestions: questions.length,
    });

    io.to(player2.socketId).emit('match_start', {
      matchId,
      category,
      opponent: {
        userId: player1.userId,
        username: player1.username,
      },
      totalQuestions: questions.length,
    });

    // Start 3-second countdown before first question
    setTimeout(() => {
      this.startQuestion(io, matchId);
    }, 2500);

    return matchState;
  }

  /**
   * Broadcast next question and start server-authoritative countdown (FR-04, AC-03)
   */
  startQuestion(io, matchId) {
    const match = this.matches.get(matchId);
    if (!match || match.state === 'finished') return;

    if (match.timer) {
      clearInterval(match.timer);
      match.timer = null;
    }

    const currentQuestion = match.questions[match.currentQuestionIndex];
    if (!currentQuestion) {
      return this.endMatch(io, matchId, 'normal');
    }

    match.state = 'in_progress';
    match.remainingSeconds = currentQuestion.timeLimit || 10;

    const sanitized = sanitizeQuestionForClient(
      currentQuestion,
      match.currentQuestionIndex,
      match.questions.length
    );

    // Emit same question set to both players (AC-01)
    io.to(match.room).emit('new_question', {
      ...sanitized,
      remainingSeconds: match.remainingSeconds,
    });

    // Start 1-second server countdown timer (FR-04)
    match.timer = setInterval(() => {
      match.remainingSeconds -= 1;

      io.to(match.room).emit('timer_tick', {
        questionIndex: match.currentQuestionIndex,
        remainingSeconds: match.remainingSeconds,
      });

      // Countdown reached zero -> Close question and advance (AC-03)
      if (match.remainingSeconds <= 0) {
        clearInterval(match.timer);
        match.timer = null;
        this.handleQuestionTimeout(io, matchId);
      }
    }, 1000);
  }

  /**
   * Process a player's answer submission (FR-05, AC-02)
   */
  submitAnswer(io, socketId, { matchId, questionIndex, selectedOptionIndex }) {
    const match = this.matches.get(matchId);
    if (!match || match.state !== 'in_progress') {
      return { success: false, message: 'Match is not in active question phase.' };
    }

    if (match.currentQuestionIndex !== questionIndex) {
      return { success: false, message: 'Question expired or index mismatch.' };
    }

    const playerEntry = Object.values(match.players).find((p) => p.socketId === socketId);
    if (!playerEntry) {
      return { success: false, message: 'Player not recognized in this match.' };
    }

    // Prevent answering twice for the same question
    if (playerEntry.answers[questionIndex] !== undefined) {
      return { success: false, message: 'Answer already submitted for this question.' };
    }

    const currentQuestion = match.questions[questionIndex];
    const isCorrect = selectedOptionIndex === currentQuestion.correctOptionIndex;

    // Scoring formula: Base points + speed bonus based on remaining seconds
    let pointsEarned = 0;
    if (isCorrect) {
      const speedBonus = Math.max(0, match.remainingSeconds * 5);
      pointsEarned = (currentQuestion.points || 100) + speedBonus;
      playerEntry.score += pointsEarned;
    }

    playerEntry.answers[questionIndex] = {
      selectedOptionIndex,
      isCorrect,
      pointsEarned,
      answeredAtSecondsRemaining: match.remainingSeconds,
    };

    console.log(
      `[Match Engine] ${playerEntry.username} answered Q${questionIndex + 1}: ${
        isCorrect ? 'CORRECT' : 'WRONG'
      } (+${pointsEarned} pts, Total: ${playerEntry.score})`
    );

    // Broadcast live score update immediately to both players (FR-05, AC-02)
    io.to(match.room).emit('score_update', {
      matchId,
      scores: this.getScores(match),
      lastAnsweredBy: {
        userId: playerEntry.userId,
        username: playerEntry.username,
        hasAnswered: true,
      },
    });

    // Check if both players have submitted answers
    const bothAnswered = Object.values(match.players).every(
      (p) => p.answers[questionIndex] !== undefined
    );

    if (bothAnswered) {
      if (match.timer) {
        clearInterval(match.timer);
        match.timer = null;
      }
      // Brief 1-second pause then close question
      setTimeout(() => {
        this.closeQuestionAndAdvance(io, matchId);
      }, 500);
    }

    return { success: true, isCorrect, pointsEarned, totalScore: playerEntry.score };
  }

  /**
   * Handle timer hitting zero (FR-04, AC-03)
   */
  handleQuestionTimeout(io, matchId) {
    this.closeQuestionAndAdvance(io, matchId);
  }

  /**
   * Conclude current question, reveal correct answer, and advance
   */
  closeQuestionAndAdvance(io, matchId) {
    const match = this.matches.get(matchId);
    if (!match || match.state === 'finished') return;

    match.state = 'intermission';
    const qIndex = match.currentQuestionIndex;
    const currentQuestion = match.questions[qIndex];

    // For any player who didn't submit an answer in time, record missed answer
    for (const player of Object.values(match.players)) {
      if (player.answers[qIndex] === undefined) {
        player.answers[qIndex] = {
          selectedOptionIndex: -1,
          isCorrect: false,
          pointsEarned: 0,
          answeredAtSecondsRemaining: 0,
        };
      }
    }

    // Broadcast question conclusion with revealed answer and round recap
    io.to(match.room).emit('question_ended', {
      questionIndex: qIndex,
      correctOptionIndex: currentQuestion.correctOptionIndex,
      correctOptionText: currentQuestion.options[currentQuestion.correctOptionIndex],
      scores: this.getScores(match),
      playerResults: Object.values(match.players).map((p) => ({
        userId: p.userId,
        username: p.username,
        selectedOption: p.answers[qIndex].selectedOptionIndex,
        isCorrect: p.answers[qIndex].isCorrect,
        pointsEarned: p.answers[qIndex].pointsEarned,
      })),
      nextInSeconds: 3,
    });

    // Advance to next question or complete match after intermission
    setTimeout(() => {
      match.currentQuestionIndex += 1;
      if (match.currentQuestionIndex < match.questions.length) {
        this.startQuestion(io, matchId);
      } else {
        this.endMatch(io, matchId, 'normal');
      }
    }, 3000);
  }

  /**
   * Fair Play / Anti-Cheat: Record tab switch warning for player
   * Warning on strikes 1 and 2; disqualification + forfeit win on strike 3
   */
  recordTabWarning(io, socketId, matchId) {
    const match = this.matches.get(matchId);
    if (!match || match.state === 'finished') return;

    const player = Object.values(match.players).find((p) => p.socketId === socketId);
    if (!player) return;

    player.tabWarnings = (player.tabWarnings || 0) + 1;
    const opponent = Object.values(match.players).find((p) => p.userId !== player.userId);

    console.warn(
      `[Anti-Cheat] Player ${player.username} switched tab (${player.tabWarnings}/3) in match ${matchId}`
    );

    if (player.tabWarnings >= 3) {
      // 3 strikes -> Disqualify player immediately and award win to opponent
      io.to(player.socketId).emit('tab_warning', {
        strikeCount: player.tabWarnings,
        maxStrikes: 3,
        kicked: true,
        message: 'Disqualified! You exceeded the maximum allowed tab switches (3/3 strikes).',
      });

      if (opponent) {
        io.to(opponent.socketId).emit('opponent_tab_warning', {
          strikeCount: player.tabWarnings,
          maxStrikes: 3,
          opponentUsername: player.username,
          opponentKicked: true,
          message: `${player.username} was disqualified for repeated tab switching. You win by default!`,
        });
      }

      return this.endMatch(io, matchId, 'tab_switch_forfeit', opponent ? opponent.userId : null);
    } else {
      // Strikes 1 or 2 -> Warn user and notify opponent
      const remaining = 3 - player.tabWarnings;
      io.to(player.socketId).emit('tab_warning', {
        strikeCount: player.tabWarnings,
        maxStrikes: 3,
        remaining,
        kicked: false,
        message: `Fair Play Warning (${player.tabWarnings}/3 strikes): Do not switch tabs during a duel! ${remaining} more strike(s) will result in immediate disqualification.`,
      });

      if (opponent) {
        io.to(opponent.socketId).emit('opponent_tab_warning', {
          strikeCount: player.tabWarnings,
          maxStrikes: 3,
          opponentUsername: player.username,
          opponentKicked: false,
          message: `Fair play notice: ${player.username} switched away from the quiz window (Strike ${player.tabWarnings}/3).`,
        });
      }
    }
  }

  /**
   * Conclude the match and calculate final results (FR-02, Student 5 hook)
   */
  async endMatch(io, matchId, reason = 'normal', forfeitWinnerId = null) {
    const match = this.matches.get(matchId);
    if (!match || match.state === 'finished') return;

    match.state = 'finished';
    if (match.timer) clearInterval(match.timer);
    if (match.forfeitTimer) clearTimeout(match.forfeitTimer);

    const playersList = Object.values(match.players);
    const p1 = playersList[0];
    const p2 = playersList[1];

    let winnerId = forfeitWinnerId;
    if (reason === 'normal') {
      if (p1.score > p2.score) winnerId = p1.userId;
      else if (p2.score > p1.score) winnerId = p2.userId;
      else winnerId = null; // Draw
    }

    // Call XP Hook for Student 5
    const xpAwards = await awardMatchXP({
      matchId,
      category: match.category,
      player1: p1,
      player2: p2,
      winnerId,
      reason,
      totalQuestions: match.questions.length,
    });

    const finalPayload = {
      matchId,
      reason,
      winnerId,
      isDraw: winnerId === null,
      finalScores: this.getScores(match),
      players: playersList.map((p) => {
        const uId = p.userId?.toString();
        const award = xpAwards[p.userId] || (uId && xpAwards[uId]) || {};
        return {
          userId: p.userId,
          username: p.username,
          score: p.score,
          isWinner: p.userId === winnerId,
          xpAwarded: award.totalXpGain || award.xpAwarded || 0,
          newTotalXP: award.newTotalXP,
          oldRank: award.oldRank,
          newRank: award.rank,
          isRankUp: Boolean(award.isRankUp),
          newBadges: award.newBadges || [],
        };
      }),
    };

    io.to(match.room).emit('match_ended', finalPayload);
    console.log(`[Match Engine] Match ${matchId} concluded. Winner: ${winnerId || 'Draw'}`);

    // Cleanup mappings after a retention window
    setTimeout(() => {
      this.cleanupMatch(matchId);
    }, 30000);
  }

  /**
   * Handle unexpected player disconnection (NFR-04)
   */
  handleDisconnect(io, socketId) {
    const matchId = this.socketToMatch.get(socketId);
    if (!matchId) return;

    const match = this.matches.get(matchId);
    if (!match || match.state === 'finished') return;

    const disconnectedPlayer = Object.values(match.players).find(
      (p) => p.socketId === socketId
    );
    if (!disconnectedPlayer) return;

    disconnectedPlayer.connected = false;
    const opponent = Object.values(match.players).find(
      (p) => p.userId !== disconnectedPlayer.userId
    );

    console.log(
      `[Match Engine] Player ${disconnectedPlayer.username} disconnected from ${matchId}. Starting 20s reconnect grace period.`
    );

    // Notify opponent of disconnect and grace timer
    io.to(match.room).emit('opponent_disconnected', {
      disconnectedUserId: disconnectedPlayer.userId,
      disconnectedUsername: disconnectedPlayer.username,
      gracePeriodSeconds: 20,
    });

    // Start 20-second forfeit countdown (NFR-04)
    match.forfeitTimer = setTimeout(() => {
      if (!disconnectedPlayer.connected && match.state !== 'finished') {
        console.log(
          `[Match Engine] Grace period expired. Forfeiting match in favor of ${opponent.username}.`
        );
        this.endMatch(io, matchId, 'opponent_forfeit', opponent.userId);
      }
    }, 20000);
  }

  /**
   * Handle player reconnection and state synchronization (NFR-04)
   */
  handleReconnect(io, socket, userId) {
    const matchId = this.userToMatch.get(userId);
    if (!matchId) {
      return { success: false, message: 'No active match found for this user.' };
    }

    const match = this.matches.get(matchId);
    if (!match || match.state === 'finished') {
      return { success: false, message: 'Match has already ended.' };
    }

    const player = match.players[userId];
    if (!player) {
      return { success: false, message: 'User does not belong to this match.' };
    }

    // Cancel forfeit timer
    if (match.forfeitTimer) {
      clearTimeout(match.forfeitTimer);
      match.forfeitTimer = null;
    }

    // Update socket mapping
    this.socketToMatch.delete(player.socketId);
    player.socketId = socket.id;
    player.connected = true;
    this.socketToMatch.set(socket.id, matchId);

    socket.join(match.room);

    // Notify opponent of reconnection
    socket.to(match.room).emit('opponent_reconnected', {
      userId: player.userId,
      username: player.username,
    });

    const currentQuestion = match.questions[match.currentQuestionIndex];
    const sanitizedQuestion = currentQuestion
      ? sanitizeQuestionForClient(
          currentQuestion,
          match.currentQuestionIndex,
          match.questions.length
        )
      : null;

    const opponentPlayer = Object.values(match.players).find((p) => p.userId !== userId);

    // Send complete match synchronization snapshot
    const syncPayload = {
      matchId: match.id,
      state: match.state,
      currentQuestionIndex: match.currentQuestionIndex,
      totalQuestions: match.questions.length,
      currentQuestion: sanitizedQuestion,
      remainingSeconds: match.remainingSeconds,
      scores: this.getScores(match),
      hasAnsweredCurrent: player.answers[match.currentQuestionIndex] !== undefined,
      opponent: opponentPlayer
        ? { userId: opponentPlayer.userId, username: opponentPlayer.username }
        : null,
    };

    socket.emit('match_sync', syncPayload);
    console.log(`[Match Engine] Player ${player.username} reconnected to ${matchId}`);

    return { success: true, matchId };
  }

  getScores(match) {
    const scores = {};
    for (const p of Object.values(match.players)) {
      scores[p.userId] = p.score;
    }
    return scores;
  }

  cleanupMatch(matchId) {
    const match = this.matches.get(matchId);
    if (!match) return;

    for (const p of Object.values(match.players)) {
      this.userToMatch.delete(p.userId);
      this.socketToMatch.delete(p.socketId);
    }
    this.matches.delete(matchId);
  }
}

module.exports = new MatchManager();
