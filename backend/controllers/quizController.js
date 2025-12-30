const { body } = require("express-validator");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const { generateQuestions } = require("../config/gemini");

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
    const {
      title,
      description,
      duration,
      creationMode,
      language,
      aiData,
      assignedTo,
      subject,
      chapters,
    } = req.body;

    // Validate assignedTo
    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Student assignment is required",
      });
    }

    // Create the quiz with new fields
    const quizData = {
      title,
      description: description || "",
      duration,
      createdBy: req.user._id,
      assignedTo,
      totalMarks: 0,
      isActive: true,
      uniquePerStudent: true,
      creationMode: creationMode || "manual",
      language: language || "english",
      subject: subject || "",
      chapters: chapters || "",
      language: language || "english",
    };

    // Store AI settings if AI mode
    if (creationMode === "ai" && aiData) {
      quizData.aiSettings = {
        topic: aiData.topic,
        numberOfQuestions: aiData.numberOfQuestions,
        difficulty: aiData.difficulty || "medium",
      };
    }

    const quiz = await Quiz.create(quizData);

    // If AI mode, generate sample questions for preview (optional)
    if (creationMode === "ai" && aiData) {
      const { topic, numberOfQuestions, difficulty, questionTypes } = aiData;

      // Generate questions with Gemini API
      const generatedQuestions = await generateQuestions(
        topic,
        numberOfQuestions,
        difficulty,
        language,
        questionTypes || ["mcq"]
      );

      // Create questions in database as templates (won't be used directly by students)
      const questionsToCreate = generatedQuestions.map((q) => {
        const baseQuestion = {
          quizId: quiz._id,
          questionText: q.questionText,
          questionType: q.questionType || "mcq",
          marks: q.marks,
        };

        // Add type-specific fields
        switch (q.questionType) {
          case "mcq":
            baseQuestion.options = q.options;
            baseQuestion.correctOption = q.correctOption;
            break;
          case "written":
            baseQuestion.correctAnswer = q.correctAnswer;
            break;
          case "fillblank":
            baseQuestion.blanks = q.blanks;
            break;
          case "matching":
            baseQuestion.matchPairs = q.matchPairs;
            break;
        }

        return baseQuestion;
      });

      await Question.insertMany(questionsToCreate);

      // Update quiz total marks (average marks per question * number of questions)
      const avgMarks =
        generatedQuestions.reduce((sum, q) => sum + q.marks, 0) /
        generatedQuestions.length;
      quiz.totalMarks = Math.round(avgMarks * numberOfQuestions);
      await quiz.save();

      return res.status(201).json({
        success: true,
        message: `Quiz created! Each student will get ${aiData.numberOfQuestions} unique AI-generated questions`,
        data: { quiz },
      });
    }

    // Manual mode - just create empty quiz
    res.status(201).json({
      success: true,
      message: "Quiz created successfully. You can now add questions.",
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

// @desc    Get all quizzes (students see assigned only, teachers see all)
// @route   GET /api/quizzes
// @access  Private
const getQuizzes = async (req, res) => {
  try {
    let query = {};
    let populate = "createdBy";

    if (req.user.role === "teacher") {
      // Teachers see ALL quizzes
      // No filter - get all quizzes
    } else {
      // Students see only active quizzes assigned to them
      query.isActive = true;
      query.assignedTo = req.user._id;
    }

    const quizzes = await Quiz.find(query)
      .populate("createdBy", "name")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 });

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

    // Authorization check - only for students
    if (req.user.role === "student") {
      // Students can only access quizzes assigned to them
      if (quiz.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this quiz",
        });
      }
      // Students can only access active quizzes
      if (!quiz.isActive) {
        return res.status(403).json({
          success: false,
          message: "This quiz is no longer active",
        });
      }
    }
    // Teachers can access any quiz

    // Allow multiple attempts - no check for existing submission

    let questions;

    // Generate unique questions for each student if AI mode
    if (
      req.user.role === "student" &&
      quiz.uniquePerStudent &&
      quiz.creationMode === "ai" &&
      quiz.aiSettings
    ) {
      try {
        // Generate unique questions for this student using AI
        const generatedQuestions = await generateQuestions(
          quiz.aiSettings.topic,
          quiz.aiSettings.numberOfQuestions,
          quiz.aiSettings.difficulty,
          quiz.language,
          quiz.aiSettings.questionTypes || ["mcq"]
        );

        // Format questions without exposing correct answers
        questions = generatedQuestions.map((q, index) => {
          const baseQuestion = {
            _id: `temp_${index}`, // Temporary ID for frontend
            questionText: q.questionText,
            questionType: q.questionType || "mcq",
            marks: q.marks,
          };

          // Add type-specific fields (but not answers)
          switch (q.questionType) {
            case "mcq":
              baseQuestion.options = q.options;
              break;
            case "fillblank":
              baseQuestion.blanksCount = q.blanks.length;
              break;
            case "matching":
              // Shuffle right side for matching questions
              const shuffledRights = [...q.matchPairs.map((p) => p.right)].sort(
                () => Math.random() - 0.5
              );
              baseQuestion.leftItems = q.matchPairs.map((p) => p.left);
              baseQuestion.rightItems = shuffledRights;
              break;
          }

          return baseQuestion;
        });

        // Also send the original questions data in a secure way for submission validation
        const questionsData = generatedQuestions.map((q) => {
          const data = {
            questionText: q.questionText,
            questionType: q.questionType || "mcq",
            marks: q.marks,
          };

          // Add type-specific answer fields
          switch (q.questionType) {
            case "mcq":
              data.options = q.options;
              data.correctOption = q.correctOption;
              break;
            case "written":
              data.correctAnswer = q.correctAnswer;
              break;
            case "fillblank":
              data.blanks = q.blanks;
              break;
            case "matching":
              data.matchPairs = q.matchPairs;
              break;
          }

          return data;
        });

        return res.status(200).json({
          success: true,
          data: {
            quiz: {
              _id: quiz._id,
              title: quiz.title,
              description: quiz.description,
              duration: quiz.duration,
              totalMarks: quiz.totalMarks,
              createdBy: quiz.createdBy,
            },
            questions,
            questionsData: questionsData, // Send for submission validation
          },
        });
      } catch (error) {
        console.error("Error generating unique questions:", error);
        // Fall back to stored questions if generation fails
        questions = await Question.find({ quizId: quiz._id });
      }
    } else {
      // Get stored questions for manual quizzes or teacher view
      questions = await Question.find({ quizId: quiz._id });
    }

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
// @access  Private (Teacher only)
const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Any teacher can update any quiz

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
// @access  Private (Teacher only)
const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Any teacher can delete any quiz

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
