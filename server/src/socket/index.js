const { Server } = require('socket.io');
const { authenticateSocket } = require('../middleware/auth.middleware');
const matchmaking = require('./matchmaking');
const matchManager = require('./matchManager');

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

    // Check if user has an ongoing match they can reconnect to
    const activeMatchId = matchManager.userToMatch.get(userId);
    if (activeMatchId) {
      socket.emit('reconnect_available', {
        matchId: activeMatchId,
        message: 'You have an active match in progress. Send reconnect_match to rejoin.',
      });
    }

    /**
     * Event: Join Matchmaking Queue (FR-03)
     * Payload: { category?: 'technical' | 'aptitude' | 'logical' }
     */
    socket.on('join_queue', ({ category = 'technical' } = {}) => {
      // Dequeue if already queued
      matchmaking.dequeue(socket.id);

      matchmaking.enqueue(
        {
          userId,
          username,
          socketId: socket.id,
          category,
        },
        (player1, player2, matchedCategory) => {
          // Pair players into room and start match
          matchManager.createMatch(io, player1, player2, matchedCategory);
        }
      );

      socket.emit('queue_joined', {
        category,
        message: `Searching for an opponent in '${category}'...`,
      });
    });

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
    });
  });

  return io;
};

module.exports = initSocketServer;
