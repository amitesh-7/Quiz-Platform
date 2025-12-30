const { body } = require("express-validator");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Submission = require("../models/Submission");

// Validation rules for creating a quiz
const createQuizValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be 3-100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  body("duration")
    .notEmpty()
    .withMessage("Duration is required")
    .isInt({ min: 1, max: 180 })
    .withMessage("Duration must be 1-180 minutes"),
];

// @desc    Create a new quiz
// @route   POST /api/quizzes
// @access  Private (Teacher only)
const createQuiz = async (req, res) => {
  try {
    const { title, description, duration } = req.body;

    const quiz = await Quiz.create({
      title,
      description: description || "",
      duration,
      createdBy: req.user._id,
      totalMarks: 0,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: { quiz },
    });
  } catch (error) {
    console.error("Create quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating quiz",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get all quizzes (students see active only, teachers see their own)
// @route   GET /api/quizzes
// @access  Private
const getQuizzes = async (req, res) => {
  try {
    let query = {};
    let populate = "";

    if (req.user.role === "teacher") {
      // Teachers see their own quizzes
      query.createdBy = req.user._id;
    } else {
      // Students see only active quizzes
      query.isActive = true;
      populate = "createdBy";
    }

    let quizzesQuery = Quiz.find(query).sort({ createdAt: -1 });

    if (populate) {
      quizzesQuery = quizzesQuery.populate("createdBy", "name");
    }

    const quizzes = await quizzesQuery;

    // For students, check if they have already submitted each quiz
    if (req.user.role === "student") {
      const submissions = await Submission.find({
        studentId: req.user._id,
      }).select("quizId");
      const submittedQuizIds = submissions.map((s) => s.quizId.toString());

      const quizzesWithStatus = quizzes.map((quiz) => ({
        ...quiz.toObject(),
        hasSubmitted: submittedQuizIds.includes(quiz._id.toString()),
      }));

      return res.status(200).json({
        success: true,
        data: { quizzes: quizzesWithStatus },
      });
    }

    res.status(200).json({
      success: true,
      data: { quizzes },
    });
  } catch (error) {
    console.error("Get quizzes error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching quizzes",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get single quiz with questions
// @route   GET /api/quizzes/:id
// @access  Private
const getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate(
      "createdBy",
      "name"
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if student has already submitted
    if (req.user.role === "student") {
      const existingSubmission = await Submission.findOne({
        quizId: quiz._id,
        studentId: req.user._id,
      });

      if (existingSubmission) {
        return res.status(400).json({
          success: false,
          message: "You have already submitted this quiz",
        });
      }
    }

    // Get questions (hide correct answers for students)
    let questions = await Question.find({ quizId: quiz._id });

    if (req.user.role === "student") {
      // Hide correct answers from students
      questions = questions.map((q) => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        marks: q.marks,
      }));
    }

    res.status(200).json({
      success: true,
      data: {
        quiz,
        questions,
      },
    });
  } catch (error) {
    console.error("Get quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching quiz",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private (Teacher only - owner)
const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check ownership
    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this quiz",
      });
    }

    const { title, description, duration, isActive } = req.body;

    quiz.title = title || quiz.title;
    quiz.description =
      description !== undefined ? description : quiz.description;
    quiz.duration = duration || quiz.duration;
    quiz.isActive = isActive !== undefined ? isActive : quiz.isActive;

    await quiz.save();

    res.status(200).json({
      success: true,
      message: "Quiz updated successfully",
      data: { quiz },
    });
  } catch (error) {
    console.error("Update quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating quiz",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (Teacher only - owner)
const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check ownership
    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this quiz",
      });
    }

    // Delete all related questions and submissions
    await Question.deleteMany({ quizId: quiz._id });
    await Submission.deleteMany({ quizId: quiz._id });
    await Quiz.findByIdAndDelete(quiz._id);

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error("Delete quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting quiz",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  createQuiz,
  getQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  createQuizValidation,
};
