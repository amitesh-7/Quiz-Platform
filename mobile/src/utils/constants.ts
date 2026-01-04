// Storage keys
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_data',
  THEME: 'theme_preference',
  ONBOARDING_COMPLETE: 'onboarding_complete',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  STUDENT_LOGIN: '/auth/student/login',
  TEACHER_LOGIN: '/auth/teacher/login',
  REGISTER: '/auth/register',
  PROFILE: '/auth/me',
  STUDENTS: '/auth/students',

  // Quizzes
  QUIZZES: '/quizzes',

  // Questions
  QUESTIONS: '/questions',

  // Submissions
  SUBMISSIONS: '/submissions',
} as const;

// App config
export const APP_CONFIG = {
  APP_NAME: 'Quiz Platform',
  VERSION: '1.0.0',
  DEFAULT_TIMEOUT: 30000,
  MAX_QUIZ_DURATION: 180, // minutes
  MIN_QUIZ_DURATION: 5, // minutes
} as const;

// Quiz constants
export const QUIZ_CONSTANTS = {
  QUESTION_TYPES: {
    MCQ: 'mcq',
    TEXT: 'text',
    TRUE_FALSE: 'true_false',
  },
  DEFAULT_DURATION: 30,
  DEFAULT_MARKS: 100,
} as const;

// Grade thresholds
export const GRADE_THRESHOLDS = {
  A_PLUS: 90,
  A: 80,
  B: 70,
  C: 60,
  D: 50,
  F: 0,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  REGISTER_SUCCESS: 'Registration successful!',
  QUIZ_CREATED: 'Quiz created successfully!',
  QUIZ_UPDATED: 'Quiz updated successfully!',
  QUIZ_DELETED: 'Quiz deleted successfully!',
  SUBMISSION_SUCCESS: 'Quiz submitted successfully!',
  MARKS_UPDATED: 'Marks updated successfully!',
} as const;
