const express = require("express");
const router = express.Router();
const {
  generateQuestionsController,
  generateValidation,
  ocrController,
  processQuestionsController,
  extractQuestionsFromImageController,
} = require("../controllers/geminiController");
const { protect, teacherOnly } = require("../middleware/auth");
const validate = require("../middleware/validate");

// All routes require authentication
router.use(protect);

// POST /api/gemini/generate - Generate questions using Gemini AI (Teacher only)
router.post(
  "/generate",
  teacherOnly,
  generateValidation,
  validate,
  generateQuestionsController
);

// POST /api/gemini/ocr - Extract text from image (Student or Teacher)
router.post("/ocr", ocrController);

// POST /api/gemini/process-questions - Process raw questions (Teacher only)
router.post("/process-questions", teacherOnly, processQuestionsController);

// POST /api/gemini/extract-questions-from-image - Extract questions from image (Teacher only)
router.post(
  "/extract-questions-from-image",
  teacherOnly,
  extractQuestionsFromImageController
);

module.exports = router;
