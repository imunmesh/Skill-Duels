const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/category.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

// Public route to view categories
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin-only protected routes (FR-09, NFR-03)
router.post('/', authenticateToken, requireRole('admin'), createCategory);
router.put('/:id', authenticateToken, requireRole('admin'), updateCategory);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteCategory);

module.exports = router;
