const express = require("express");
const router = express.Router();
const { getResult } = require("../controllers/submissionController");
const { protect, studentOnly } = require("../middleware/auth");

// All routes require authentication and student role
router.use(protect);
router.use(studentOnly);

// GET /api/results/:quizId - Get result for a specific quiz
router.get("/:quizId", getResult);

module.exports = router;
