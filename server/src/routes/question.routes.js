const express = require('express');
const router = express.Router();
const {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getRandomQuestions,
} = require('../controllers/question.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

// Public/Player match endpoint: returns random questions with correct answers stripped (AC-01, AC-06)
router.get('/random', getRandomQuestions);

// Admin-only management endpoints (FR-09, NFR-03)
router.get('/', authenticateToken, requireRole('admin'), getQuestions);
router.get('/:id', authenticateToken, requireRole('admin'), getQuestionById);
router.post('/', authenticateToken, requireRole('admin'), createQuestion);
router.put('/:id', authenticateToken, requireRole('admin'), updateQuestion);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteQuestion);

module.exports = router;
