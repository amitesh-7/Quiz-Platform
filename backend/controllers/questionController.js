const { body } = require("express-validator");
const Question = require("../models/Question");
const Quiz = require("../models/Quiz");

// Validation rules for creating a question
const createQuestionValidation = [
  body("quizId")
    .notEmpty()
    .withMessage("Quiz ID is required")
    .isMongoId()
    .withMessage("Invalid Quiz ID"),
  body("questionText")
    .trim()
    .notEmpty()
    .withMessage("Question text is required")
    .isLength({ min: 5, max: 5000 })
    .withMessage("Question must be 5-5000 characters"),
  body("questionType")
    .optional()
    .isIn(["mcq", "written", "fillblank", "matching", "truefalse"])
    .withMessage("Invalid question type"),
  body("marks")
    .optional()
    .isInt({ min: 1, max: 70 })
    .withMessage("Marks must be 1-70"),
];

// Validation rules for bulk creating questions
const bulkCreateValidation = [
  body("quizId")
    .notEmpty()
    .withMessage("Quiz ID is required")
    .isMongoId()
    .withMessage("Invalid Quiz ID"),
  body("questions")
    .isArray({ min: 1 })
    .withMessage("At least one question is required"),
  body("questions.*.questionText")
    .trim()
    .notEmpty()
    .withMessage("Question text is required")
    .isLength({ min: 5, max: 5000 })
    .withMessage("Question must be 5-5000 characters"),
  body("questions.*.questionType")
    .optional()
    .isIn(["mcq", "written", "fillblank", "matching", "truefalse"])
    .withMessage("Invalid question type"),
  body("questions.*.marks")
    .optional()
    .isInt({ min: 1, max: 70 })
    .withMessage("Marks must be 1-70"),
];

// @desc    Create a new question
// @route   POST /api/questions
// @access  Private (Teacher only)
const createQuestion = async (req, res) => {
  try {
    const {
      quizId,
      questionText,
      options,
      correctOption,
      marks = 1,
    } = req.body;

    // Verify quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Any teacher can add questions to any quiz

    const question = await Question.create({
      quizId,
      questionText,
      options,
      correctOption,
      marks,
    });

    res.status(201).json({
      success: true,
      message: "Question created successfully",
      data: { question },
    });
  } catch (error) {
    console.error("Create question error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating question",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Bulk create questions (for Gemini generated questions)
// @route   POST /api/questions/bulk
// @access  Private (Teacher only)
const bulkCreateQuestions = async (req, res) => {
  try {
    const { quizId, questions } = req.body;

    console.log("Bulk Create Request:", {
      quizId,
      questionCount: questions?.length,
    });

    // Validate request body
    if (!quizId) {
      return res.status(400).json({
        success: false,
        message: "Quiz ID is required",
      });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Questions array is required and must not be empty",
      });
    }

    // Verify quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Any teacher can add questions to any quiz

    // Add quizId to each question
    const questionsWithQuizId = questions.map((q) => ({
      ...q,
      quizId,
      marks: q.marks || 1,
    }));

    const createdQuestions = await Question.insertMany(questionsWithQuizId);

    // Update quiz total marks
    const totalMarks = await Question.aggregate([
      { $match: { quizId: quiz._id } },
      { $group: { _id: null, total: { $sum: "$marks" } } },
    ]);

    await Quiz.findByIdAndUpdate(quizId, {
      totalMarks: totalMarks[0]?.total || 0,
    });

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions created successfully`,
      data: { questions: createdQuestions },
    });
  } catch (error) {
    console.error("Bulk create questions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating questions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get questions for a quiz
// @route   GET /api/questions/:quizId
// @access  Private (Teacher only)
const getQuestions = async (req, res) => {
  try {
    // Any teacher can view questions for any quiz
    const questions = await Question.find({ quizId: req.params.quizId });

    res.status(200).json({
      success: true,
      data: { questions },
    });
  } catch (error) {
    console.error("Get questions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching questions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Update a question
// @route   PUT /api/questions/:id
// @access  Private (Teacher only)
const updateQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Any teacher can update any question

    const { questionText, options, correctOption, marks } = req.body;

    question.questionText = questionText || question.questionText;
    question.options = options || question.options;
    question.correctOption =
      correctOption !== undefined ? correctOption : question.correctOption;
    question.marks = marks || question.marks;

    await question.save();

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: { question },
    });
  } catch (error) {
    console.error("Update question error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating question",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Delete a question
// @route   DELETE /api/questions/:id
// @access  Private (Teacher only)
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Any teacher can delete any question

    await Question.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Delete question error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting question",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
  bulkCreateValidation,
};
