const Question = require('../models/Question');
const Category = require('../models/Category');

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

    // 1. Validate required fields
    if (!text || !options || correctIndex === undefined || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide text, options array, correctIndex, and category ID',
      });
    }

    // 2. Validate options and correctIndex
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return res.status(400).json({
        success: false,
        message: 'Options must be an array with 2 to 6 choices',
      });
    }

    const cIdx = parseInt(correctIndex, 10);
    if (isNaN(cIdx) || cIdx < 0 || cIdx >= options.length) {
      return res.status(400).json({
        success: false,
        message: `correctIndex must be between 0 and ${options.length - 1}`,
      });
    }

    // 3. Verify category exists
    let catDoc;
    if (category.match(/^[0-9a-fA-F]{24}$/)) {
      catDoc = await Category.findById(category);
    } else {
      catDoc = await Category.findOne({ slug: category.toLowerCase() });
    }

    if (!catDoc) {
      return res.status(404).json({ success: false, message: 'Referenced category does not exist' });
    }

    // 4. Create and persist question
    const question = await Question.create({
      text: text.trim(),
      options: options.map((opt) => opt.trim()),
      correctIndex: cIdx,
      category: catDoc._id,
      difficulty: difficulty || 'medium',
      timeLimit: parseInt(timeLimit, 10) || 10,
      points: parseInt(points, 10) || 100,
      explanation: explanation?.trim() || '',
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

    if (text) question.text = text.trim();
    if (options && Array.isArray(options)) {
      question.options = options.map((o) => o.trim());
    }
    if (correctIndex !== undefined) {
      const cIdx = parseInt(correctIndex, 10);
      if (cIdx < 0 || cIdx >= (options ? options.length : question.options.length)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid correctIndex for provided options',
        });
      }
      question.correctIndex = cIdx;
    }
    if (category) {
      question.category = category;
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
 *          CRITICAL: Strips correctIndex so clients cannot cheat via inspection!
 * @route   GET /api/questions/random
 * @access  Public / Players
 */
const getRandomQuestions = async (req, res, next) => {
  try {
    const count = Math.min(20, Math.max(1, parseInt(req.query.count, 10) || 3));
    const matchQuery = { isActive: true };

    if (req.query.category) {
      if (req.query.category.match(/^[0-9a-fA-F]{24}$/)) {
        matchQuery.category = req.query.category;
      } else {
        const cat = await Category.findOne({ slug: req.query.category.toLowerCase() });
        if (cat) {
          matchQuery.category = cat._id;
        }
      }
    }

    // Use MongoDB $sample to select random questions
    const rawQuestions = await Question.aggregate([
      { $match: matchQuery },
      { $sample: { size: count } },
      {
        // Populate category details
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
      // Project out secret answer fields (NFR-03 Security)
      {
        $project: {
          _id: 1,
          id: '$_id',
          prompt: '$text',
          options: 1,
          difficulty: 1,
          timeLimit: 1,
          points: 100,
          category: '$categoryDetails.slug',
          categoryName: '$categoryDetails.name',
        },
      },
    ]);

    // Format with questionNumber and totalQuestions
    const questions = rawQuestions.map((q, index) => ({
      ...q,
      questionNumber: index + 1,
      totalQuestions: rawQuestions.length,
    }));

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
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
