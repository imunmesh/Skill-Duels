const mongoose = require('mongoose');

const MatchPlayerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    xpAwarded: {
      type: Number,
      default: 0,
    },
    isWinner: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const MatchSchema = new mongoose.Schema(
  {
    matchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    roomId: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      default: 'technical',
      index: true,
    },
    players: {
      type: [MatchPlayerSchema],
      default: [],
    },
    // Backwards compatibility for legacy match records
    player1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    player2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    player1Score: {
      type: Number,
      default: 0,
    },
    player2Score: {
      type: Number,
      default: 0,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    isDraw: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      enum: ['normal', 'opponent_forfeit', 'tab_switch_forfeit', 'draw'],
      default: 'normal',
    },
    totalQuestions: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying recent player matches (NFR-02)
MatchSchema.index({ 'players.userId': 1, createdAt: -1 });

module.exports = mongoose.model('Match', MatchSchema);
