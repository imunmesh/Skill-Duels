const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BadgeSchema = new mongoose.Schema(
  {
    badgeId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: 'default-badge.png',
    },
    awardedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      default: '',
    },
    skills: {
      type: [String],
      default: [],
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Do not return passwordHash in standard queries
    },
    role: {
      type: String,
      enum: {
        values: ['player', 'admin'],
        message: '{VALUE} is not a valid role (allowed: player, admin)',
      },
      default: 'player',
      index: true,
    },
    xp: {
      type: Number,
      default: 0,
      min: [0, 'XP cannot be negative'],
      index: -1, // Descending index for global leaderboard queries (NFR-02)
    },
    weeklyXP: {
      type: Number,
      default: 0,
      min: [0, 'Weekly XP cannot be negative'],
      index: -1, // Descending index for weekly leaderboard queries (NFR-02)
    },
    rank: {
      type: String,
      default: 'Bronze',
      trim: true,
      index: true,
    },
    stats: {
      matchesPlayed: { type: Number, default: 0 },
      matchesWon: { type: Number, default: 0 },
      matchesLost: { type: Number, default: 0 },
      matchesDrawn: { type: Number, default: 0 },
    },
    streak: {
      current: { type: Number, default: 0 },
      highest: { type: Number, default: 0 },
      lastMatchDate: { type: Date, default: null },
    },
    badges: {
      type: [BadgeSchema],
      default: [],
    },
  },
  {
    timestamps: true, // Automatically provides createdAt and updatedAt
  }
);

// Compound index for role-filtered leaderboard queries (NFR-02)
UserSchema.index({ role: 1, xp: -1 });
UserSchema.index({ role: 1, weeklyXP: -1 });

/**
 * Compare plain text password against stored bcrypt passwordHash
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('Password hash is not loaded on user instance');
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Ensure sensitive fields are excluded when user document is serialized to JSON
 */
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
