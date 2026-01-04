import {User} from './user';
import {Quiz, Question, Submission} from './quiz';

// Generic API Response
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// Auth Responses
export interface AuthResponse {
  token: string;
  user: User;
}

// Quiz Responses
export interface QuizzesResponse {
  quizzes: Quiz[];
}

export interface QuizResponse {
  quiz: Quiz;
}

export interface QuestionsResponse {
  questions: Question[];
}

// Submission Responses
export interface SubmissionsResponse {
  submissions: Submission[];
}

export interface SubmissionResponse {
  submission: Submission;
}

// Error Response
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
