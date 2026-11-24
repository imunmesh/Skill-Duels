const mongoose = require('mongoose');
const Category = require('../models/Category');
const Question = require('../models/Question');
const { QUESTIONS_PER_MATCH, DEFAULT_QUESTION_TIME_LIMIT, ERROR_CODES } = require('../config/constants');

/**
 * Custom Typed Error for Question Validation
 */
class CategoryQuestionError extends Error {
  constructor(code, message, category, available = 0, required = QUESTIONS_PER_MATCH) {
    super(message);
    this.name = 'CategoryQuestionError';
    this.code = code;
    this.category = category;
    this.available = available;
    this.required = required;
  }
}

/**
 * Resolve category identifier (ObjectId string or slug) to Category document
 *
 * @param {string|mongoose.Types.ObjectId} categoryIdentifier
 * @returns {Promise<{ catId: mongoose.Types.ObjectId|null, categoryName: string, slug: string }>}
 */
const resolveCategory = async (categoryIdentifier) => {
  if (!categoryIdentifier) {
    return { catId: null, categoryName: 'Unknown', slug: '' };
  }

  let catDoc = null;
  const strId = String(categoryIdentifier).trim();

  if (strId.match(/^[0-9a-fA-F]{24}$/)) {
    catDoc = await Category.findById(strId);
  } else {
    catDoc = await Category.findOne({ slug: strId.toLowerCase() });
  }

  if (catDoc) {
    return {
      catId: catDoc._id,
      categoryName: catDoc.name,
      slug: catDoc.slug,
    };
  }

  return {
    catId: null,
    categoryName: strId,
    slug: strId.toLowerCase(),
  };
};

/**
 * Check if a category has enough active questions to start a match
 *
 * @param {string|mongoose.Types.ObjectId} categoryIdentifier
 * @returns {Promise<{ playable: boolean, questionCount: number, categoryName: string, categoryId: string|null, error?: CategoryQuestionError }>}
 */
const checkCategoryPlayable = async (categoryIdentifier) => {
  const { catId, categoryName } = await resolveCategory(categoryIdentifier);

  if (!catId) {
    const error = new CategoryQuestionError(
      ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS,
      `No questions found for ${categoryName}. Please choose another category or check back later.`,
      categoryName,
      0,
      QUESTIONS_PER_MATCH
    );
    return {
      playable: false,
      questionCount: 0,
      categoryName,
      categoryId: null,
      error,
    };
  }

  // Count active questions strictly for this category in MongoDB
  const count = await Question.countDocuments({ category: catId, isActive: true });

  if (count === 0) {
    const error = new CategoryQuestionError(
      ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS,
      `No questions found for ${categoryName}. Please choose another category or check back later.`,
      categoryName,
      0,
      QUESTIONS_PER_MATCH
    );
    return {
      playable: false,
      questionCount: 0,
      categoryName,
      categoryId: catId.toString(),
      error,
    };
  }

  if (count < QUESTIONS_PER_MATCH) {
    const error = new CategoryQuestionError(
      ERROR_CODES.CATEGORY_NOT_ENOUGH_QUESTIONS,
      `${categoryName} doesn't have enough questions yet (${count} of ${QUESTIONS_PER_MATCH}).`,
      categoryName,
      count,
      QUESTIONS_PER_MATCH
    );
    return {
      playable: false,
      questionCount: count,
      categoryName,
      categoryId: catId.toString(),
      error,
    };
  }

  return {
    playable: true,
    questionCount: count,
    categoryName,
    categoryId: catId.toString(),
  };
};

/**
 * Fetch playable questions for a category (Rule 1, Rule 2, Rule 3)
 * Queries ONLY { category: categoryId, isActive: true }
 * Returns random sample of QUESTIONS_PER_MATCH using $sample
 *
 * Throws typed errors:
 * - CATEGORY_HAS_NO_QUESTIONS (count 0)
 * - CATEGORY_NOT_ENOUGH_QUESTIONS (count 1 to 4)
 *
 * @param {string|mongoose.Types.ObjectId} categoryIdentifier
 * @returns {Promise<Array>} Array of QUESTIONS_PER_MATCH questions
 */
const getPlayableQuestions = async (categoryIdentifier) => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('[Question Service] Database is not connected. Live MongoDB connection required.');
  }

  const { catId, categoryName } = await resolveCategory(categoryIdentifier);

  if (!catId) {
    throw new CategoryQuestionError(
      ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS,
      `No questions found for ${categoryName}. Please choose another category or check back later.`,
      categoryName,
      0,
      QUESTIONS_PER_MATCH
    );
  }

  const matchFilter = { category: catId, isActive: true };

  // 1. Verify active question count at query level
  const totalAvailable = await Question.countDocuments(matchFilter);

  if (totalAvailable === 0) {
    throw new CategoryQuestionError(
      ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS,
      `No questions found for ${categoryName}. Please choose another category or check back later.`,
      categoryName,
      0,
      QUESTIONS_PER_MATCH
    );
  }

  if (totalAvailable < QUESTIONS_PER_MATCH) {
    throw new CategoryQuestionError(
      ERROR_CODES.CATEGORY_NOT_ENOUGH_QUESTIONS,
      `${categoryName} doesn't have enough questions yet (${totalAvailable} of ${QUESTIONS_PER_MATCH}).`,
      categoryName,
      totalAvailable,
      QUESTIONS_PER_MATCH
    );
  }

  // 2. Sample QUESTIONS_PER_MATCH questions strictly matching this category
  const dbQuestions = await Question.aggregate([
    { $match: matchFilter },
    { $sample: { size: QUESTIONS_PER_MATCH } },
  ]);

  if (!dbQuestions || dbQuestions.length < QUESTIONS_PER_MATCH) {
    throw new CategoryQuestionError(
      ERROR_CODES.CATEGORY_NOT_ENOUGH_QUESTIONS,
      `${categoryName} doesn't have enough questions yet (${dbQuestions ? dbQuestions.length : 0} of ${QUESTIONS_PER_MATCH}).`,
      categoryName,
      dbQuestions ? dbQuestions.length : 0,
      QUESTIONS_PER_MATCH
    );
  }

  // Double check that all sampled questions strictly belong to the selected category (Rule 2)
  const nonMatching = dbQuestions.filter((q) => q.category.toString() !== catId.toString());
  if (nonMatching.length > 0) {
    throw new Error(`[Question Service Isolation Breach] Sampled questions contain items outside category ${categoryName}`);
  }

  return dbQuestions.map((q) => ({
    id: q._id.toString(),
    category: categoryName,
    categoryId: catId.toString(),
    prompt: q.text,
    options: q.options,
    correctOptionIndex: q.correctIndex,
    timeLimit: q.timeLimit || DEFAULT_QUESTION_TIME_LIMIT,
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

/**
 * Backward-compatible helper for existing callers
 */
const fetchMatchQuestions = async (category, _count = QUESTIONS_PER_MATCH) => {
  return getPlayableQuestions(category);
};

const hasQuestionsForCategory = async (category) => {
  const result = await checkCategoryPlayable(category);
  return result.playable;
};

module.exports = {
  QUESTIONS_PER_MATCH,
  DEFAULT_QUESTION_TIME_LIMIT,
  ERROR_CODES,
  CategoryQuestionError,
  getPlayableQuestions,
  checkCategoryPlayable,
  fetchMatchQuestions,
  sanitizeQuestionForClient,
  hasQuestionsForCategory,
};
