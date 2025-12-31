const { body } = require("express-validator");
const {
  generateQuestions,
  extractTextFromImage,
  processRawQuestions,
  extractQuestionsFromImage,
} = require("../config/gemini");

// Validation rules for generating questions
const generateValidation = [
  body("topic")
    .trim()
    .notEmpty()
    .withMessage("Topic is required")
    .isLength({ min: 2, max: 500 })
    .withMessage("Topic must be 2-500 characters"),
  body("numberOfQuestions")
    .notEmpty()
    .withMessage("Number of questions is required")
    .isInt({ min: 1, max: 50 })
    .withMessage("Number of questions must be 1-50"),
  body("difficulty")
    .optional()
    .isIn(["easy", "medium", "hard"])
    .withMessage("Difficulty must be easy, medium, or hard"),
  body("language")
    .optional()
    .isIn(["english", "hindi", "bilingual", "sanskrit", "spanish", "french", "german"])
    .withMessage("Invalid language selection"),
  body("questionTypes")
    .optional()
    .isArray()
    .withMessage("Question types must be an array"),
  body("questionTypes.*")
    .optional()
    .isIn(["mcq", "written", "fillblank", "matching", "truefalse"])
    .withMessage("Invalid question type"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),
  body("examFormat")
    .optional()
    .isIn(["general", "upboard_science"])
    .withMessage("Invalid exam format"),
];

// @desc    Generate questions using Gemini API
// @route   POST /api/gemini/generate
// @access  Private (Teacher only)
const generateQuestionsController = async (req, res) => {
  try {
    const {
      topic,
      numberOfQuestions,
      difficulty = "medium",
      language = "english",
      questionTypes = ["mcq"],
      description = "",
      examFormat = "general",
    } = req.body;

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Gemini API is not configured. Please contact administrator.",
      });
    }

    // Generate questions using Gemini with all parameters
    const questions = await generateQuestions(
      topic,
      numberOfQuestions,
      difficulty,
      language,
      questionTypes,
      description,
      examFormat
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

// @desc    Extract text from image using OCR
// @route   POST /api/gemini/ocr
// @access  Private (Student or Teacher)
const ocrController = async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: "Image data is required",
      });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Gemini API is not configured. Please contact administrator.",
      });
    }

    // Extract text from image
    const extractedText = await extractTextFromImage(
      imageBase64,
      mimeType || "image/jpeg"
    );

    res.status(200).json({
      success: true,
      message: "Text extracted successfully",
      data: { text: extractedText },
    });
  } catch (error) {
    console.error("OCR error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extract text from image. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Process raw questions and convert to quiz format
// @route   POST /api/gemini/process-questions
// @access  Private (Teacher only)
const processQuestionsController = async (req, res) => {
  try {
    const {
      rawQuestions,
      maxMarks,
      marksDistribution,
      language,
      numberOfQuestions,
    } = req.body;

    if (!rawQuestions || !rawQuestions.trim()) {
      return res.status(400).json({
        success: false,
        message: "Raw questions are required",
      });
    }

    if (!maxMarks || maxMarks < 1) {
      return res.status(400).json({
        success: false,
        message: "Maximum marks must be at least 1",
      });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Gemini API is not configured. Please contact administrator.",
      });
    }

    // Process raw questions
    const questions = await processRawQuestions(
      rawQuestions,
      maxMarks,
      marksDistribution || "Distribute marks evenly across questions",
      language || "english",
      numberOfQuestions || null
    );

    res.status(200).json({
      success: true,
      message: `Processed ${questions.length} questions successfully`,
      data: { questions },
    });
  } catch (error) {
    console.error("Process questions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process questions. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Extract questions from uploaded image
// @route   POST /api/gemini/extract-questions-from-image
// @access  Private (Teacher only)
const extractQuestionsFromImageController = async (req, res) => {
  try {
    const {
      image,
      maxMarks,
      marksDistribution,
      additionalInstructions,
      language,
    } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    if (!maxMarks || maxMarks < 1) {
      return res.status(400).json({
        success: false,
        message: "Maximum marks must be at least 1",
      });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Gemini API is not configured. Please contact administrator.",
      });
    }

    // Parse image data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const mimeType =
      image.match(/data:(image\/\w+);base64,/)?.[1] || "image/jpeg";

    // Extract questions from image
    const questions = await extractQuestionsFromImage(
      base64Data,
      mimeType,
      maxMarks,
      marksDistribution || "Distribute marks based on question difficulty",
      additionalInstructions || "",
      language || "english"
    );

    res.status(200).json({
      success: true,
      message: `Extracted ${questions.length} questions from image`,
      data: { questions },
    });
  } catch (error) {
    console.error("Extract questions from image error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extract questions from image. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  generateQuestionsController,
  generateValidation,
  ocrController,
  processQuestionsController,
  extractQuestionsFromImageController,
};
