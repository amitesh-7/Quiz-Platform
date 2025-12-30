const express = require("express");
const router = express.Router();
const {
  createQuiz,
  getQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  createQuizValidation,
} = require("../controllers/quizController");
const { protect, teacherOnly } = require("../middleware/auth");
const validate = require("../middleware/validate");

// All routes require authentication
router.use(protect);

// GET /api/quizzes - Get all quizzes (accessible by both teachers and students)
router.get("/", getQuizzes);

// GET /api/quizzes/:id - Get single quiz with questions
router.get("/:id", getQuiz);

// Teacher only routes
router.post("/", teacherOnly, createQuizValidation, validate, createQuiz);
router.put("/:id", teacherOnly, updateQuiz);
router.delete("/:id", teacherOnly, deleteQuiz);

module.exports = router;
