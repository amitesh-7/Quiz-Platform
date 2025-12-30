const express = require("express");
const router = express.Router();
const {
  submitQuiz,
  getResult,
  getMySubmissions,
  getQuizSubmissions,
  submitValidation,
} = require("../controllers/submissionController");
const { protect, studentOnly, teacherOnly } = require("../middleware/auth");
const validate = require("../middleware/validate");

// All routes require authentication
router.use(protect);

// Student routes
router.post("/", studentOnly, submitValidation, validate, submitQuiz);
router.get("/my", studentOnly, getMySubmissions);

// Teacher routes
router.get("/quiz/:quizId", teacherOnly, getQuizSubmissions);

module.exports = router;
