const mongoose = require('mongoose');
const Category = require('../models/Category');
const Question = require('../models/Question');

/**
 * Fetch a shared question set for both players from MongoDB (AC-01, AC-06)
 *
 * @param {string} category - Skill category slug or ObjectId
 * @param {number} count - Number of questions per duel (default: 3)
 * @returns {Promise<Array>} Array of full question objects (including correct answer for server use)
 */
const fetchMatchQuestions = async (category = 'technical', count = 3) => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('[Question Service] Database is not connected. Live MongoDB connection required.');
  }

  let catId = null;
  if (typeof category === 'string' && category.match(/^[0-9a-fA-F]{24}$/)) {
    catId = new mongoose.Types.ObjectId(category);
  } else if (typeof category === 'string') {
    const catDoc = await Category.findOne({ slug: category.toLowerCase().trim() });
    if (catDoc) catId = catDoc._id;
  }

  const matchFilter = { isActive: true };
  if (catId) {
    matchFilter.category = catId;
  }

  // Randomize from database via MongoDB $sample aggregation pipeline
  let dbQuestions = await Question.aggregate([
    { $match: matchFilter },
    { $sample: { size: count } },
  ]);

  // If specific category has fewer questions than requested, supplement with any active questions
  if (!dbQuestions || dbQuestions.length === 0) {
    console.warn(`[Question Service] No questions found for category '${category}'. Falling back to any active questions.`);
    dbQuestions = await Question.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: count } },
    ]);
  }

  if (!dbQuestions || dbQuestions.length === 0) {
    throw new Error('[Question Service] No active quiz questions found in database. Please run \'npm run seed\' in server.');
  }

  return dbQuestions.map((q) => ({
    id: q._id.toString(),
    category: category,
    prompt: q.text,
    options: q.options,
    correctOptionIndex: q.correctIndex,
    timeLimit: q.timeLimit || 10,
    points: q.points || 100,
  }));
};

/**
 * Strip server-only secret answers before sending to clients
 * Prevents client-side network inspection cheating.
 *
 * @param {Object} question
 * @param {number} index
 * @param {number} total
 * @returns {Object} Sanitized question
 */
const sanitizeQuestionForClient = (question, index, total) => {
  return {
    id: question.id,
    questionNumber: index + 1,
    totalQuestions: total,
    category: question.category,
    prompt: question.prompt,
    options: question.options,
    timeLimit: question.timeLimit,
    points: question.points,
  };
};

module.exports = {
  fetchMatchQuestions,
  sanitizeQuestionForClient,
};
