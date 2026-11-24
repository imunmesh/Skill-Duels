const mongoose = require('mongoose');
const Match = require('../models/Match');
const matchManager = require('./matchManager');
const matchmaking = require('./matchmaking');
const { REMATCH_TTL_MS, MAX_REMATCHES_PER_PAIR_PER_DAY, ERROR_CODES } = require('../config/constants');

/**
 * In-memory map of pending rematch offers
 * Map<finishedMatchId, {
 *   matchId: string,
 *   category: string,
 *   players: [{ userId: string, username: string, socketId: string }],
 *   ready: Set<string>, // userIds that have agreed to rematch
 *   timer: NodeJS.Timeout,
 *   createdAt: number
 * }>
 */
const pendingRematches = new Map();

/**
 * Query the Matches collection to check how many matches the two players
 * have played against each other in the last 24 hours (anti-XP-farming cap).
 *
 * @param {string} userId1
 * @param {string} userId2
 * @returns {Promise<number>}
 */
const getDailyPairMatchCount = async (userId1, userId2) => {
  if (mongoose.connection.readyState !== 1) {
    return 0;
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const u1 = mongoose.Types.ObjectId.isValid(userId1) ? new mongoose.Types.ObjectId(userId1) : userId1;
    const u2 = mongoose.Types.ObjectId.isValid(userId2) ? new mongoose.Types.ObjectId(userId2) : userId2;

    const count = await Match.countDocuments({
      createdAt: { $gte: since },
      $or: [
        { $and: [{ 'players.userId': u1 }, { 'players.userId': u2 }] },
        {
          $and: [
            { $or: [{ player1: u1 }, { player2: u1 }] },
            { $or: [{ player1: u2 }, { player2: u2 }] },
          ],
        },
      ],
    });

    return count;
  } catch (err) {
    console.warn('[Rematch] Error querying daily pair match count:', err.message);
    return 0;
  }
};

/**
 * Handle TTL timeout for a pending rematch offer
 *
 * @param {import('socket.io').Server} io
 * @param {string} matchId
 */
const handleRematchTimeout = (io, matchId) => {
  const pending = pendingRematches.get(matchId);
  if (!pending) return;

  clearTimeout(pending.timer);
  pendingRematches.delete(matchId);

  pending.players.forEach((p) => {
    io.to(p.userId).emit('rematchCancelled', { matchId, reason: 'expired' });
  });

  console.log(`[Rematch] Offer for match ${matchId} expired after ${REMATCH_TTL_MS}ms`);
};

/**
 * Cancel any pending rematches involving a specific user (e.g. On queue join or leave)
 *
 * @param {import('socket.io').Server} io
 * @param {string} userId
 * @param {'declined'|'expired'|'left'|'limit'|'unavailable'} reason
 */
const cancelPendingRematchesForUser = (io, userId, reason = 'left') => {
  for (const [matchId, pending] of pendingRematches.entries()) {
    const isPlayer = pending.players.some((p) => p.userId?.toString() === userId?.toString());
    if (isPlayer) {
      clearTimeout(pending.timer);
      pendingRematches.delete(matchId);

      pending.players.forEach((p) => {
        io.to(p.userId).emit('rematchCancelled', { matchId, reason });
      });

      console.log(`[Rematch] Pending offer for match ${matchId} cancelled (${reason}) due to user ${userId}`);
    }
  }
};

/**
 * Handle socket disconnect for rematch offers
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {string} userId
 */
const handleSocketDisconnectRematch = (io, socket, userId) => {
  if (!userId) return;

  for (const [matchId, pending] of pendingRematches.entries()) {
    const isPlayer = pending.players.some((p) => p.userId?.toString() === userId?.toString());
    if (isPlayer) {
      clearTimeout(pending.timer);
      pendingRematches.delete(matchId);

      const opponent = pending.players.find((p) => p.userId?.toString() !== userId?.toString());
      if (opponent) {
        io.to(opponent.userId).emit('rematchCancelled', { matchId, reason: 'left' });
      }

      console.log(`[Rematch] Match ${matchId} rematch cancelled because player ${userId} disconnected`);
    }
  }
};

/**
 * Register Rematch socket handlers for a connected client
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
const registerRematchHandlers = (io, socket) => {
  const userId = socket.user?._id ? socket.user._id.toString() : socket.user?.id;
  const username = socket.user?.username || 'Player';

  /**
   * Event: rematchRequest
   * Payload: { matchId: string }
   */
  socket.on('rematchRequest', async ({ matchId } = {}) => {
    if (!matchId) return;

    // a) Validate match exists and state === 'finished'
    let match = matchManager.matches.get(matchId);
    let category;
    let playersList = [];
    let isForfeit = false;

    if (match) {
      category = match.category;
      playersList = Object.values(match.players || {});
      isForfeit = match.reason === 'opponent_forfeit' || match.reason === 'tab_switch_forfeit';

      if (match.state !== 'finished') {
        socket.emit('rematchCancelled', { matchId, reason: 'unavailable' });
        return;
      }
    } else {
      // Check MongoDB if match in-memory state was already cleaned up
      try {
        const dbMatch = await Match.findOne({ matchId });
        if (dbMatch) {
          category = dbMatch.category;
          playersList = dbMatch.players.map((p) => ({
            userId: p.userId.toString(),
            username: p.username,
          }));
          isForfeit = dbMatch.reason === 'opponent_forfeit' || dbMatch.reason === 'tab_switch_forfeit';
        }
      } catch (err) {
        console.warn('[Rematch] DB lookup error:', err.message);
      }
    }

    if (!playersList || playersList.length < 2) {
      socket.emit('rematchCancelled', { matchId, reason: 'unavailable' });
      return;
    }

    // Rule 1: Never offer one after a forfeit or disconnect ending
    if (isForfeit) {
      socket.emit('rematchCancelled', { matchId, reason: 'unavailable' });
      return;
    }

    // Validate: requesting user is one of the players in this match
    const userIsPlayer = playersList.some((p) => p.userId?.toString() === userId?.toString());
    if (!userIsPlayer) {
      socket.emit('rematchCancelled', { matchId, reason: 'unavailable' });
      return;
    }

    // Rule 6: Player cannot request a rematch while already in an active match or queue
    if (matchmaking.isQueued(userId) || matchmaking.isQueued(socket.id)) {
      socket.emit('rematchCancelled', { matchId, reason: 'unavailable' });
      return;
    }

    const ongoingMatchId = matchManager.userToMatch.get(userId);
    if (ongoingMatchId && ongoingMatchId !== matchId) {
      const ongoingMatch = matchManager.matches.get(ongoingMatchId);
      if (ongoingMatch && ongoingMatch.state !== 'finished') {
        socket.emit('rematchCancelled', { matchId, reason: 'unavailable' });
        return;
      }
    }

    // Identify opponent player
    const opponent = playersList.find((p) => p.userId?.toString() !== userId?.toString());
    if (!opponent) {
      socket.emit('rematchCancelled', { matchId, reason: 'unavailable' });
      return;
    }

    // Edge case: Opponent already left or disconnected
    const opponentRoom = io.sockets.adapter.rooms.get(opponent.userId);
    const hasOpponentConnected = opponentRoom && opponentRoom.size > 0;
    if (!hasOpponentConnected) {
      socket.emit('rematchCancelled', { matchId, reason: 'left' });
      return;
    }

    // Opponent already in an active queue or match
    if (matchmaking.isQueued(opponent.userId)) {
      socket.emit('rematchCancelled', { matchId, reason: 'left' });
      return;
    }

    const oppOngoingMatchId = matchManager.userToMatch.get(opponent.userId);
    if (oppOngoingMatchId && oppOngoingMatchId !== matchId) {
      const oppOngoingMatch = matchManager.matches.get(oppOngoingMatchId);
      if (oppOngoingMatch && oppOngoingMatch.state !== 'finished') {
        socket.emit('rematchCancelled', { matchId, reason: 'left' });
        return;
      }
    }

    // b) Check daily pair cap using Matches collection (last 24 hours)
    const matchesCount = await getDailyPairMatchCount(userId, opponent.userId);
    if (matchesCount >= MAX_REMATCHES_PER_PAIR_PER_DAY) {
      socket.emit('rematchCancelled', { matchId, reason: 'limit' });
      return;
    }

    // c) Create or update pending rematch entry
    let pending = pendingRematches.get(matchId);

    if (!pending) {
      // First click: create entry and start TTL timer
      const timer = setTimeout(() => {
        handleRematchTimeout(io, matchId);
      }, REMATCH_TTL_MS);

      pending = {
        matchId,
        category,
        players: [
          { userId, username, socketId: socket.id },
          {
            userId: opponent.userId,
            username: opponent.username,
            socketId: Array.from(opponentRoom || [])[0] || opponent.socketId,
          },
        ],
        ready: new Set([userId]),
        timer,
        createdAt: Date.now(),
      };

      pendingRematches.set(matchId, pending);

      // e) Emit rematchWaiting to requester and rematchOffered to opponent only
      socket.emit('rematchWaiting', { matchId });
      io.to(opponent.userId).emit('rematchOffered', {
        matchId,
        from: username,
        expiresInMs: REMATCH_TTL_MS,
      });

      console.log(`[Rematch] ${username} requested rematch for match ${matchId}. Waiting for opponent.`);
    } else {
      // Pending entry already exists
      // Prevent double clicks by same user
      if (pending.ready.has(userId)) {
        return;
      }

      // Add user to ready set
      pending.ready.add(userId);

      // d) If ready.size === 2: clear timer, DELETE entry FIRST, then call createMatch
      if (pending.ready.size === 2) {
        clearTimeout(pending.timer);
        pendingRematches.delete(matchId); // DELETE pending entry FIRST so it can never run twice

        // Resolve current active socket IDs for both players
        const p1Room = io.sockets.adapter.rooms.get(pending.players[0].userId);
        const p2Room = io.sockets.adapter.rooms.get(pending.players[1].userId);

        const player1 = {
          userId: pending.players[0].userId,
          username: pending.players[0].username,
          socketId: (p1Room && Array.from(p1Room)[0]) || pending.players[0].socketId,
        };
        const player2 = {
          userId: pending.players[1].userId,
          username: pending.players[1].username,
          socketId: (p2Room && Array.from(p2Room)[0]) || pending.players[1].socketId,
        };

        console.log(`[Rematch] Both players agreed to rematch for match ${matchId}. Creating match in category '${pending.category}'...`);

        // Create new match using normal createMatch path (enforcing getPlayableQuestions from SAME category)
        try {
          await matchManager.createMatch(io, player1, player2, pending.category);
        } catch (err) {
          console.error('[Rematch] Error launching rematch battle:', err);
          const errorPayload = {
            code: err.code || ERROR_CODES.CATEGORY_NOT_ENOUGH_QUESTIONS,
            message: err.message || 'Failed to start rematch.',
            category: pending.category,
          };
          io.to(player1.userId).emit('matchError', errorPayload);
          io.to(player2.userId).emit('matchError', errorPayload);
        }
      }
    }
  });

  /**
   * Event: rematchDecline
   * Payload: { matchId: string }
   */
  socket.on('rematchDecline', ({ matchId } = {}) => {
    if (!matchId) return;

    const pending = pendingRematches.get(matchId);
    if (pending) {
      clearTimeout(pending.timer);
      pendingRematches.delete(matchId);

      pending.players.forEach((p) => {
        io.to(p.userId).emit('rematchCancelled', { matchId, reason: 'declined' });
      });

      console.log(`[Rematch] Rematch for match ${matchId} declined by user ${userId}`);
    }
  });
};

module.exports = {
  registerRematchHandlers,
  handleSocketDisconnectRematch,
  cancelPendingRematchesForUser,
  getDailyPairMatchCount,
  pendingRematches,
  REMATCH_TTL_MS,
  MAX_REMATCHES_PER_PAIR_PER_DAY,
};
