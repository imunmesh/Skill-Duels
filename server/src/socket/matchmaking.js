/**
 * Matchmaking Queue & Lobby System (FR-03)
 * Manages player matchmaking pool and pairs players into duel rooms.
 */

class MatchmakingQueue {
  constructor() {
    // Map of category -> Array<{ userId, username, socketId, category, joinedAt }>
    this.queues = new Map();
  }

  /**
   * Add a player to the queue
   * @param {Object} player - { userId, username, socketId, category }
   * @param {Function} onMatchFound - Callback when two players are paired
   */
  enqueue(player, onMatchFound) {
    const category = player.category || 'technical';

    if (!this.queues.has(category)) {
      this.queues.set(category, []);
    }

    const queue = this.queues.get(category);

    // Prevent duplicate entry for same user or same socket
    const existingIndex = queue.findIndex(
      (p) => p.userId === player.userId || p.socketId === player.socketId
    );
    if (existingIndex !== -1) {
      queue.splice(existingIndex, 1);
    }

    // Check if another player is already waiting
    if (queue.length > 0) {
      const opponent = queue.shift();
      console.log(
        `[Matchmaking] Paired ${player.username} with ${opponent.username} for category '${category}'`
      );
      return onMatchFound(opponent, player, category);
    }

    // Otherwise, place player in queue
    queue.push({
      ...player,
      category,
      joinedAt: Date.now(),
    });

    console.log(`[Matchmaking] ${player.username} joined queue for category '${category}' (Queue size: ${queue.length})`);
    return null;
  }

  /**
   * Remove a player from all queues (e.g. On disconnect or cancel)
   * @param {string} socketIdOrUserId
   */
  dequeue(socketIdOrUserId) {
    let removed = false;
    for (const [category, queue] of this.queues.entries()) {
      const idx = queue.findIndex(
        (p) => p.socketId === socketIdOrUserId || p.userId === socketIdOrUserId
      );
      if (idx !== -1) {
        const [player] = queue.splice(idx, 1);
        console.log(`[Matchmaking] ${player.username} removed from queue '${category}'`);
        removed = true;
      }
    }
    return removed;
  }

  /**
   * Get queue length for a category
   */
  getQueueSize(category = 'technical') {
    return this.queues.get(category)?.length || 0;
  }
}

module.exports = new MatchmakingQueue();
