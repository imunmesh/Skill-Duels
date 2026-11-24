const { Server } = require('socket.io');
const { authenticateSocket } = require('../middleware/auth.middleware');
const matchmaking = require('./matchmaking');
const matchManager = require('./matchManager');
const { checkCategoryPlayable, QUESTIONS_PER_MATCH, ERROR_CODES } = require('./questionService');
const {
  registerRematchHandlers,
  handleSocketDisconnectRematch,
  cancelPendingRematchesForUser,
} = require('./rematch');

/**
 * Configure and initialize Socket.IO server (FR-03, FR-04, FR-05)
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Enforce JWT authentication on connection handshake (NFR-03)
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.user._id ? socket.user._id.toString() : socket.user.id;
    const username = socket.user.username;

    console.log(`[Socket.IO] Client connected: ${username} (Socket: ${socket.id}, User: ${userId})`);

    // Each socket joins a room named after its userId on connect (so targeted events can be emitted to user)
    socket.join(userId);

    // Register Rematch event handlers (rematchRequest, rematchDecline)
    registerRematchHandlers(io, socket);

    // Check if user has an ongoing match they can reconnect to
    const activeMatchId = matchManager.userToMatch.get(userId);
    if (activeMatchId) {
      socket.emit('reconnect_available', {
        matchId: activeMatchId,
        message: 'You have an active match in progress. Send reconnect_match to rejoin.',
      });
    }

    /**
     * Event: Join Matchmaking Queue / Find Opponent (FR-03)
     * Payload: { category?: 'technical' | 'aptitude' | 'logical' | 'dsa' | 'ml' | 'web-dev' }
     */
    const handleFindOpponent = async ({ category = 'technical' } = {}) => {
      // Cancel any pending rematch involving this user since they are queueing for another battle
      cancelPendingRematchesForUser(io, userId, 'left');

      // 1. Double-click prevention: do not enqueue if already queued or actively matching
      if (matchmaking.isQueued(socket.id) || matchmaking.isQueued(userId)) {
        console.warn(`[Matchmaking] Duplicate queue attempt prevented for ${username}`);
        return;
      }

      // 2. Prevent queueing if already in an active match
      const activeOngoingMatch = matchManager.userToMatch.get(userId);
      if (activeOngoingMatch) {
        socket.emit('matchError', {
          code: 'ACTIVE_MATCH_EXISTS',
          message: 'You already have a battle in progress. Please rejoin or finish it.',
          category,
        });
        return;
      }

      // 3. Check Point b): Verify that category has at least QUESTIONS_PER_MATCH (5) active questions
      const checkResult = await checkCategoryPlayable(category);
      if (!checkResult.playable) {
        console.warn(`[Matchmaking] Blocked queue join: ${checkResult.error?.message}`);
        const errorPayload = {
          code: checkResult.error?.code || (checkResult.questionCount === 0 ? ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS : ERROR_CODES.CATEGORY_NOT_ENOUGH_QUESTIONS),
          message: checkResult.error?.message || `Category ${category} does not have enough active questions.`,
          category: checkResult.categoryName || category,
          available: checkResult.questionCount,
          required: QUESTIONS_PER_MATCH,
        };

        // Emit matchError and queue_error ONLY to this player socket
        socket.emit('matchError', errorPayload);
        socket.emit('queue_error', errorPayload);
        return;
      }

      // 4. Edge Case: Check if player disconnected during the async validation
      if (!socket.connected) {
        matchmaking.dequeue(socket.id);
        matchmaking.dequeue(userId);
        return;
      }

      // 5. Add to queue and pair when opponent is found
      matchmaking.enqueue(
        {
          userId,
          username,
          socketId: socket.id,
          category,
        },
        (player1, player2, matchedCategory) => {
          // Pair players into room and start match (Check Point c runs inside createMatch)
          matchManager.createMatch(io, player1, player2, matchedCategory);
        }
      );

      socket.emit('queue_joined', {
        category,
        message: `Searching for an opponent in '${checkResult.categoryName}'...`,
      });
    };

    socket.on('findOpponent', handleFindOpponent);
    socket.on('join_queue', handleFindOpponent);

    /**
     * Event: Leave Matchmaking Queue
     */
    socket.on('leave_queue', () => {
      const removed = matchmaking.dequeue(socket.id);
      socket.emit('queue_left', { success: removed });
    });

    /**
     * Event: Submit Question Answer (FR-05, AC-02)
     * Payload: { matchId: string, questionIndex: number, selectedOptionIndex: number }
     */
    socket.on('submit_answer', (data, callback) => {
      const result = matchManager.submitAnswer(io, socket.id, data);
      if (typeof callback === 'function') {
        callback(result);
      }
    });

    /**
     * Event: Tab switch / Fair Play violation detected
     * Payload: { matchId: string }
     */
    socket.on('tab_switch_detected', ({ matchId } = {}) => {
      if (matchId) {
        matchManager.recordTabWarning(io, socket.id, matchId);
      }
    });

    /**
     * Event: Reconnect to active match (NFR-04)
     */
    socket.on('reconnect_match', (_data, callback) => {
      const result = matchManager.handleReconnect(io, socket, userId);
      if (typeof callback === 'function') {
        callback(result);
      }
    });

    /**
     * Event: Disconnect handler (NFR-04)
     */
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${username} (${socket.id}) - Reason: ${reason}`);
      matchmaking.dequeue(socket.id);
      matchManager.handleDisconnect(io, socket.id);
      handleSocketDisconnectRematch(io, socket, userId);
    });
  });

  return io;
};

module.exports = initSocketServer;
