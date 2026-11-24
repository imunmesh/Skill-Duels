const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Question prompt text is required'],
      trim: true,
      minlength: [5, 'Question text must be at least 5 characters long'],
      maxlength: [500, 'Question text cannot exceed 500 characters'],
    },
    options: {
      type: [String],
      required: [true, 'Options array is required'],
      validate: {
        validator: function (opts) {
          return Array.isArray(opts) && opts.length >= 2 && opts.length <= 6 && opts.every((o) => typeof o === 'string' && o.trim().length > 0);
        },
        message: 'A question must provide between 2 and 6 non-empty options',
      },
    },
    correctIndex: {
      type: Number,
      required: [true, 'Correct option index is required'],
      min: [0, 'Correct index cannot be negative'],
      validate: {
        validator: function (val) {
          return !this.options || val < this.options.length;
        },
        message: 'Correct index must be a valid index in the options array',
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required'],
      index: true,
    },
    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: '{VALUE} is not a valid difficulty level (allowed: easy, medium, hard)',
      },
      default: 'medium',
      index: true,
    },
    timeLimit: {
      type: Number,
      default: 20, // seconds
      min: [5, 'Time limit must be at least 5 seconds'],
      max: [60, 'Time limit cannot exceed 60 seconds'],
    },
    points: {
      type: Number,
      default: 100,
      min: [10, 'Points must be at least 10'],
    },
    explanation: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for high-performance category query-level filtering
QuestionSchema.index({ category: 1, isActive: 1 });

// Method to sanitize question for clients (excludes correctIndex and explanation)
QuestionSchema.methods.toClientJSON = function (index = 0, total = 1) {
  return {
    _id: this._id,
    id: this._id.toString(),
    questionNumber: index + 1,
    totalQuestions: total,
    prompt: this.text,
    options: this.options,
    category: this.category,
    difficulty: this.difficulty,
    timeLimit: this.timeLimit,
    points: this.points,
  };
};

module.exports = mongoose.model('Question', QuestionSchema);
