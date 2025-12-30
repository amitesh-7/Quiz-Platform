const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  studentLogin,
  addStudent,
  getStudents,
  deleteStudent,
  registerValidation,
  loginValidation,
} = require("../controllers/authController");
const { protect, teacherOnly } = require("../middleware/auth");
const validate = require("../middleware/validate");

// Public routes
router.post("/register", registerValidation, validate, register);
router.post("/login", loginValidation, validate, login);
router.post("/student-login", studentLogin);

// Protected routes
router.get("/me", protect, getMe);

// Teacher-only routes for student management
router.post("/add-student", protect, teacherOnly, addStudent);
router.get("/students", protect, teacherOnly, getStudents);
router.delete("/students/:id", protect, teacherOnly, deleteStudent);

module.exports = router;
