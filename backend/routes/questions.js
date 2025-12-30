const express = require('express');
const router = express.Router();
const {
  createQuestion,
  bulkCreateQuestions,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  createQuestionValidation,
  bulkCreateValidation
} = require('../controllers/questionController');
const { protect, teacherOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All routes require authentication
router.use(protect);

// Teacher only routes
router.post('/', teacherOnly, createQuestionValidation, validate, createQuestion);
router.post('/bulk', teacherOnly, bulkCreateValidation, validate, bulkCreateQuestions);
router.get('/:quizId', teacherOnly, getQuestions);
router.put('/:id', teacherOnly, updateQuestion);
router.delete('/:id', teacherOnly, deleteQuestion);

module.exports = router;
