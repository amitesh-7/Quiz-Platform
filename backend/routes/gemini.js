const express = require('express');
const router = express.Router();
const { 
  generateQuestionsController,
  generateValidation 
} = require('../controllers/geminiController');
const { protect, teacherOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All routes require authentication and teacher role
router.use(protect);
router.use(teacherOnly);

// POST /api/gemini/generate - Generate questions using Gemini AI
router.post('/generate', generateValidation, validate, generateQuestionsController);

module.exports = router;
