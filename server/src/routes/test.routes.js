const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

/**
 * @desc    Public test endpoint
 * @route   GET /api/test/public
 * @access  Public
 */
router.get('/public', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Public endpoint accessed successfully. No authentication required.',
  });
});

/**
 * @desc    Player-only (or admin) protected route
 * @route   GET /api/test/player-only
 * @access  Private (player or admin)
 */
router.get('/player-only', authenticateToken, requireRole('player', 'admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: `Welcome player ${req.user.username}! This route is secured for players and admins.`,
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role,
      xp: req.user.xp,
      rank: req.user.rank,
    },
  });
});

/**
 * @desc    Admin-only protected route (e.g. For Student 4 quiz management)
 * @route   GET /api/test/admin-only
 * @access  Private (admin only)
 */
router.get('/admin-only', authenticateToken, requireRole('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: `Admin access granted for ${req.user.username}. You have administrative privileges.`,
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

module.exports = router;
