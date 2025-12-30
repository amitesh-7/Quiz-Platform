const { body } = require("express-validator");
const { generateQuestions } = require("../config/gemini");

// Validation rules for generating questions
const generateValidation = [
  body("topic")
    .trim()
    .notEmpty()
    .withMessage("Topic is required")
    .isLength({ min: 2, max: 200 })
    .withMessage("Topic must be 2-200 characters"),
  body("numberOfQuestions")
    .notEmpty()
    .withMessage("Number of questions is required")
    .isInt({ min: 1, max: 20 })
    .withMessage("Number of questions must be 1-20"),
  body("difficulty")
    .optional()
    .isIn(["easy", "medium", "hard"])
    .withMessage("Difficulty must be easy, medium, or hard"),
];

// @desc    Generate questions using Gemini API
// @route   POST /api/gemini/generate
// @access  Private (Teacher only)
const generateQuestionsController = async (req, res) => {
  try {
    const { topic, numberOfQuestions, difficulty = "medium" } = req.body;

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Gemini API is not configured. Please contact administrator.",
      });
    }

    // Generate questions using Gemini
    const questions = await generateQuestions(
      topic,
      numberOfQuestions,
      difficulty
    );

    res.status(200).json({
      success: true,
      message: `Generated ${questions.length} questions successfully`,
      data: { questions },
    });
  } catch (error) {
    console.error("Gemini generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate questions. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  generateQuestionsController,
  generateValidation,
};
