const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe,
  registerValidation,
  loginValidation 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;
