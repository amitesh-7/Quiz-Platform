const { body } = require('express-validator');
const Question = require('../models/Question');
const Quiz = require('../models/Quiz');

// Validation rules for creating a question
const createQuestionValidation = [
  body('quizId')
    .notEmpty().withMessage('Quiz ID is required')
    .isMongoId().withMessage('Invalid Quiz ID'),
  body('questionText')
    .trim()
    .notEmpty().withMessage('Question text is required')
    .isLength({ min: 5, max: 1000 }).withMessage('Question must be 5-1000 characters'),
  body('options')
    .isArray({ min: 4, max: 4 }).withMessage('Exactly 4 options are required'),
  body('options.*')
    .trim()
    .notEmpty().withMessage('All options must have text'),
  body('correctOption')
    .notEmpty().withMessage('Correct option is required')
    .isInt({ min: 0, max: 3 }).withMessage('Correct option must be 0-3'),
  body('marks')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Marks must be 1-10')
];

// Validation rules for bulk creating questions
const bulkCreateValidation = [
  body('quizId')
    .notEmpty().withMessage('Quiz ID is required')
    .isMongoId().withMessage('Invalid Quiz ID'),
  body('questions')
    .isArray({ min: 1 }).withMessage('At least one question is required'),
  body('questions.*.questionText')
    .trim()
    .notEmpty().withMessage('Question text is required'),
  body('questions.*.options')
    .isArray({ min: 4, max: 4 }).withMessage('Exactly 4 options are required'),
  body('questions.*.correctOption')
    .isInt({ min: 0, max: 3 }).withMessage('Correct option must be 0-3'),
  body('questions.*.marks')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Marks must be 1-10')
];

// @desc    Create a new question
// @route   POST /api/questions
// @access  Private (Teacher only)
const createQuestion = async (req, res) => {
  try {
    const { quizId, questionText, options, correctOption, marks = 1 } = req.body;

    // Verify quiz exists and belongs to teacher
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add questions to this quiz'
      });
    }

    const question = await Question.create({
      quizId,
      questionText,
      options,
      correctOption,
      marks
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: { question }
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating question',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Bulk create questions (for Gemini generated questions)
// @route   POST /api/questions/bulk
// @access  Private (Teacher only)
const bulkCreateQuestions = async (req, res) => {
  try {
    const { quizId, questions } = req.body;

    // Verify quiz exists and belongs to teacher
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add questions to this quiz'
      });
    }

    // Add quizId to each question
    const questionsWithQuizId = questions.map(q => ({
      ...q,
      quizId,
      marks: q.marks || 1
    }));

    const createdQuestions = await Question.insertMany(questionsWithQuizId);

    // Update quiz total marks
    const totalMarks = await Question.aggregate([
      { $match: { quizId: quiz._id } },
      { $group: { _id: null, total: { $sum: '$marks' } } }
    ]);

    await Quiz.findByIdAndUpdate(quizId, {
      totalMarks: totalMarks[0]?.total || 0
    });

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions created successfully`,
      data: { questions: createdQuestions }
    });
  } catch (error) {
    console.error('Bulk create questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating questions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get questions for a quiz
// @route   GET /api/questions/:quizId
// @access  Private
const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({ quizId: req.params.quizId });

    res.status(200).json({
      success: true,
      data: { questions }
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching questions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update a question
// @route   PUT /api/questions/:id
// @access  Private (Teacher only - owner)
const updateQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Verify quiz ownership
    const quiz = await Quiz.findById(question.quizId);
    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this question'
      });
    }

    const { questionText, options, correctOption, marks } = req.body;

    question.questionText = questionText || question.questionText;
    question.options = options || question.options;
    question.correctOption = correctOption !== undefined ? correctOption : question.correctOption;
    question.marks = marks || question.marks;

    await question.save();

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: { question }
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating question',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete a question
// @route   DELETE /api/questions/:id
// @access  Private (Teacher only - owner)
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Verify quiz ownership
    const quiz = await Quiz.findById(question.quizId);
    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this question'
      });
    }

    await Question.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting question',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createQuestion,
  bulkCreateQuestions,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  createQuestionValidation,
  bulkCreateValidation
};
