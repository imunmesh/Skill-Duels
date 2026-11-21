const Question = require('../models/Question');
const Category = require('../models/Category');
const matchManager = require('../socket/matchManager');
const { QUESTIONS_PER_MATCH, ERROR_CODES } = require('../config/constants');
const { getPlayableQuestions, sanitizeQuestionForClient } = require('../socket/questionService');

/**
 * @desc    Get questions with pagination and filters (FR-09)
 * @route   GET /api/questions
 * @access  Admin Only (NFR-03)
 */
const getQuestions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.category) {
      if (req.query.category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = req.query.category;
      } else {
        const cat = await Category.findOne({ slug: req.query.category.toLowerCase() });
        if (cat) query.category = cat._id;
      }
    }

    if (req.query.difficulty) {
      query.difficulty = req.query.difficulty.toLowerCase();
    }

    if (req.query.search) {
      query.text = { $regex: req.query.search, $options: 'i' };
    }

    const totalQuestions = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .populate('category', 'name slug icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: questions.length,
      totalQuestions,
      totalPages: Math.ceil(totalQuestions / limit),
      currentPage: page,
      questions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single question by ID (FR-09)
 * @route   GET /api/questions/:id
 * @access  Admin Only
 */
const getQuestionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id).populate('category', 'name slug');

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    return res.status(200).json({ success: true, question });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new question (FR-09, AC-06)
 * @route   POST /api/questions
 * @access  Admin Only
 */
const createQuestion = async (req, res, next) => {
  try {
    const { text, options, correctIndex, category, difficulty, timeLimit, points, explanation } = req.body;

    // 1. Validate category required
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category reference is required',
      });
    }

    // 2. Validate question prompt text required
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question prompt text is required',
      });
    }

    // 3. Validate exactly 4 options required
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Questions must have exactly 4 answer options',
      });
    }

    // 4. Validate non-empty options
    if (options.some((opt) => typeof opt !== 'string' || !opt.trim())) {
      return res.status(400).json({
        success: false,
        message: 'All 4 answer options must be non-empty strings',
      });
    }

    // 5. Validate NO duplicate options
    const normalizedOptions = options.map((opt) => opt.trim().toLowerCase());
    if (new Set(normalizedOptions).size !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Options must be unique. Duplicate answers are not permitted.',
      });
    }

    // 6. Validate correctIndex (0 to 3)
    const cIdx = parseInt(correctIndex, 10);
    if (isNaN(cIdx) || cIdx < 0 || cIdx > 3) {
      return res.status(400).json({
        success: false,
        message: 'correctIndex must be an integer between 0 and 3',
      });
    }

    // 7. Verify category exists in DB
    let catDoc;
    if (String(category).match(/^[0-9a-fA-F]{24}$/)) {
      catDoc = await Category.findById(category);
    } else {
      catDoc = await Category.findOne({ slug: String(category).toLowerCase() });
    }

    if (!catDoc) {
      return res.status(404).json({ success: false, message: 'Referenced category does not exist' });
    }

    // 8. Create and persist question
    const question = await Question.create({
      text: text.trim(),
      options: options.map((opt) => opt.trim()),
      correctIndex: cIdx,
      category: catDoc._id,
      difficulty: difficulty || 'medium',
      timeLimit: parseInt(timeLimit, 10) || 10,
      points: parseInt(points, 10) || 100,
      explanation: explanation?.trim() || '',
      isActive: true,
    });

    const populated = await Question.findById(question._id).populate('category', 'name slug');

    return res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update existing question (FR-09)
 * @route   PUT /api/questions/:id
 * @access  Admin Only
 */
const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, options, correctIndex, category, difficulty, timeLimit, points, explanation, isActive } = req.body;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Check if deactivating question while a match is in progress
    if (isActive === false && question.isActive === true) {
      const activeMatches = Array.from(matchManager.matches.values()).filter(
        (m) => m.state === 'in_progress' || m.state === 'starting'
      );
      const isMatchRunning = activeMatches.some(
        (m) => m.category === question.category.toString() || m.questions?.some((q) => q.id === id)
      );

      if (isMatchRunning) {
        const remainingActive = await Question.countDocuments({
          category: question.category,
          isActive: true,
          _id: { $ne: question._id },
        });

        if (remainingActive < QUESTIONS_PER_MATCH) {
          return res.status(400).json({
            success: false,
            message: `Cannot deactivate question: a battle in this category is currently in progress, and deactivating would drop questions below the required minimum (${QUESTIONS_PER_MATCH}).`,
          });
        }
      }
    }

    if (text !== undefined) {
      if (!text.trim()) return res.status(400).json({ success: false, message: 'Question prompt text cannot be empty' });
      question.text = text.trim();
    }

    if (options !== undefined) {
      if (!Array.isArray(options) || options.length !== 4) {
        return res.status(400).json({ success: false, message: 'Questions must have exactly 4 answer options' });
      }
      if (options.some((opt) => typeof opt !== 'string' || !opt.trim())) {
        return res.status(400).json({ success: false, message: 'All 4 answer options must be non-empty strings' });
      }
      const normalizedOptions = options.map((opt) => opt.trim().toLowerCase());
      if (new Set(normalizedOptions).size !== 4) {
        return res.status(400).json({ success: false, message: 'Options must be unique. Duplicate answers are not permitted.' });
      }
      question.options = options.map((o) => o.trim());
    }

    if (correctIndex !== undefined) {
      const cIdx = parseInt(correctIndex, 10);
      if (isNaN(cIdx) || cIdx < 0 || cIdx > 3) {
        return res.status(400).json({ success: false, message: 'correctIndex must be between 0 and 3' });
      }
      question.correctIndex = cIdx;
    }

    if (category) {
      let catDoc;
      if (String(category).match(/^[0-9a-fA-F]{24}$/)) {
        catDoc = await Category.findById(category);
      } else {
        catDoc = await Category.findOne({ slug: String(category).toLowerCase() });
      }
      if (!catDoc) {
        return res.status(404).json({ success: false, message: 'Referenced category does not exist' });
      }
      question.category = catDoc._id;
    }

    if (difficulty) question.difficulty = difficulty;
    if (timeLimit) question.timeLimit = parseInt(timeLimit, 10);
    if (points) question.points = parseInt(points, 10);
    if (explanation !== undefined) question.explanation = explanation.trim();
    if (isActive !== undefined) question.isActive = isActive;

    await question.save();
    const updated = await Question.findById(question._id).populate('category', 'name slug');

    return res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      question: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete question (FR-09)
 * @route   DELETE /api/questions/:id
 * @access  Admin Only
 */
const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Check if deleting would leave category below minimum while a match is in progress
    const activeMatches = Array.from(matchManager.matches.values()).filter(
      (m) => m.state === 'in_progress' || m.state === 'starting'
    );
    const isMatchRunning = activeMatches.some(
      (m) => m.category === question.category.toString() || m.questions?.some((q) => q.id === id)
    );

    if (isMatchRunning) {
      const remainingActive = await Question.countDocuments({
        category: question.category,
        isActive: true,
        _id: { $ne: question._id },
      });

      if (remainingActive < QUESTIONS_PER_MATCH) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete question: an active match in this category is currently in progress, and deleting would drop questions below the required minimum (${QUESTIONS_PER_MATCH}).`,
        });
      }
    }

    await Question.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get random questions by category for matches (Task 3, AC-01, AC-06)
 *          Strict rule: questions from requested category ONLY, minimum QUESTIONS_PER_MATCH required.
 *          Never falls back to other categories or external sources.
 * @route   GET /api/questions/random
 * @access  Public / Players
 */
const getRandomQuestions = async (req, res, next) => {
  try {
    if (!req.query.category) {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.CATEGORY_HAS_NO_QUESTIONS,
        message: 'Category parameter is required to fetch match questions.',
      });
    }

    try {
      const questions = await getPlayableQuestions(req.query.category);
      const sanitized = questions.map((q, idx) => sanitizeQuestionForClient(q, idx, questions.length));

      return res.status(200).json({
        success: true,
        count: sanitized.length,
        questions: sanitized,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        code: err.code || ERROR_CODES.CATEGORY_NOT_ENOUGH_QUESTIONS,
        message: err.message,
        available: err.available !== undefined ? err.available : 0,
        required: err.required !== undefined ? err.required : QUESTIONS_PER_MATCH,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getRandomQuestions,
};
