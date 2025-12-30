const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');
const questionRoutes = require('./routes/questions');
const geminiRoutes = require('./routes/gemini');
const submissionRoutes = require('./routes/submissions');
const resultRoutes = require('./routes/results');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Quiz Platform API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/results', resultRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
