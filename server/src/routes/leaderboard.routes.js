const express = require('express');
const router = express.Router();
const {
  getGlobalLeaderboard,
  getWeeklyLeaderboard,
  getUserProgression,
  getPublicLeaderboard,
} = require('../controllers/leaderboard.controller');

// Public Top Leaderboard for Landing/Login page (Never returns sensitive fields)
router.get('/public', getPublicLeaderboard);

// Global Leaderboard sorted by XP (FR-06, AC-05)
router.get('/global', getGlobalLeaderboard);

// Weekly Leaderboard (FR-07)
router.get('/weekly', getWeeklyLeaderboard);

// User profile progression, badges, and match breakdown (FR-02, FR-10)
router.get('/user/:id', getUserProgression);

module.exports = router;
