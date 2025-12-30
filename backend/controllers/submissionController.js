const { body } = require('express-validator');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');

// Validation rules for submitting a quiz
const submitValidation = [
  body('quizId')
    .notEmpty().withMessage('Quiz ID is required')
    .isMongoId().withMessage('Invalid Quiz ID'),
  body('answers')
    .isArray().withMessage('Answers must be an array'),
  body('answers.*.questionId')
    .isMongoId().withMessage('Invalid Question ID'),
  body('answers.*.selectedOption')
    .isInt({ min: 0, max: 3 }).withMessage('Selected option must be 0-3')
];

// @desc    Submit a quiz
// @route   POST /api/submissions
// @access  Private (Student only)
const submitQuiz = async (req, res) => {
  try {
    const { quizId, answers } = req.body;

    // Check if quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check if quiz is active
    if (!quiz.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This quiz is no longer active'
      });
    }

    // Check if student has already submitted
    const existingSubmission = await Submission.findOne({
      quizId,
      studentId: req.user._id
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this quiz'
      });
    }

    // Get all questions for this quiz
    const questions = await Question.find({ quizId });

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This quiz has no questions'
      });
    }

    // Create a map for quick lookup
    const questionMap = new Map();
    questions.forEach(q => {
      questionMap.set(q._id.toString(), q);
    });

    // Calculate score
    let score = 0;
    const processedAnswers = [];

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (question) {
        processedAnswers.push({
          questionId: answer.questionId,
          selectedOption: answer.selectedOption
        });

        if (answer.selectedOption === question.correctOption) {
          score += question.marks;
        }
      }
    }

    // Create submission
    const submission = await Submission.create({
      quizId,
      studentId: req.user._id,
      answers: processedAnswers,
      score,
      submittedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        submission: {
          id: submission._id,
          quizId: submission.quizId,
          score: submission.score,
          totalMarks: quiz.totalMarks,
          percentage: quiz.totalMarks > 0 ? Math.round((score / quiz.totalMarks) * 100) : 0,
          submittedAt: submission.submittedAt
        }
      }
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    
    // Handle duplicate submission error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this quiz'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while submitting quiz',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get result for a specific quiz
// @route   GET /api/results/:quizId
// @access  Private (Student only)
const getResult = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Get submission
    const submission = await Submission.findOne({
      quizId,
      studentId: req.user._id
    }).populate('quizId', 'title totalMarks duration');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'No submission found for this quiz'
      });
    }

    // Get questions with correct answers for review
    const questions = await Question.find({ quizId });

    // Build detailed results
    const detailedResults = questions.map(question => {
      const studentAnswer = submission.answers.find(
        a => a.questionId.toString() === question._id.toString()
      );

      return {
        questionId: question._id,
        questionText: question.questionText,
        options: question.options,
        correctOption: question.correctOption,
        selectedOption: studentAnswer ? studentAnswer.selectedOption : null,
        isCorrect: studentAnswer ? studentAnswer.selectedOption === question.correctOption : false,
        marks: question.marks
      };
    });

    res.status(200).json({
      success: true,
      data: {
        quiz: submission.quizId,
        score: submission.score,
        totalMarks: submission.quizId.totalMarks,
        percentage: submission.quizId.totalMarks > 0 
          ? Math.round((submission.score / submission.quizId.totalMarks) * 100) 
          : 0,
        submittedAt: submission.submittedAt,
        detailedResults
      }
    });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching result',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all submissions for a student
// @route   GET /api/submissions/my
// @access  Private (Student only)
const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user._id })
      .populate('quizId', 'title totalMarks duration')
      .sort({ submittedAt: -1 });

    const formattedSubmissions = submissions.map(sub => ({
      id: sub._id,
      quiz: sub.quizId,
      score: sub.score,
      totalMarks: sub.quizId?.totalMarks || 0,
      percentage: sub.quizId?.totalMarks > 0 
        ? Math.round((sub.score / sub.quizId.totalMarks) * 100) 
        : 0,
      submittedAt: sub.submittedAt
    }));

    res.status(200).json({
      success: true,
      data: { submissions: formattedSubmissions }
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching submissions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all submissions for a quiz (Teacher view)
// @route   GET /api/submissions/quiz/:quizId
// @access  Private (Teacher only)
const getQuizSubmissions = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Verify quiz ownership
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
        message: 'Not authorized to view submissions for this quiz'
      });
    }

    const submissions = await Submission.find({ quizId })
      .populate('studentId', 'name email')
      .sort({ submittedAt: -1 });

    const formattedSubmissions = submissions.map(sub => ({
      id: sub._id,
      student: sub.studentId,
      score: sub.score,
      totalMarks: quiz.totalMarks,
      percentage: quiz.totalMarks > 0 
        ? Math.round((sub.score / quiz.totalMarks) * 100) 
        : 0,
      submittedAt: sub.submittedAt
    }));

    res.status(200).json({
      success: true,
      data: { 
        quiz: {
          id: quiz._id,
          title: quiz.title,
          totalMarks: quiz.totalMarks
        },
        submissions: formattedSubmissions 
      }
    });
  } catch (error) {
    console.error('Get quiz submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching submissions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  submitQuiz,
  getResult,
  getMySubmissions,
  getQuizSubmissions,
  submitValidation
};
