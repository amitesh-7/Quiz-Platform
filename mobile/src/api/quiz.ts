import api from './axios';
import {ApiResponse, QuizzesResponse, QuizResponse, QuestionsResponse} from '../types/api';
import {Quiz, Question} from '../types/quiz';

export const quizAPI = {
  /**
   * Get all quizzes (filtered by user role on backend)
   */
  getQuizzes: async (): Promise<ApiResponse<QuizzesResponse>> => {
    const response = await api.get<ApiResponse<QuizzesResponse>>('/quizzes');
    return response.data;
  },

  /**
   * Get single quiz by ID
   */
  getQuiz: async (quizId: string): Promise<ApiResponse<QuizResponse>> => {
    const response = await api.get<ApiResponse<QuizResponse>>(`/quizzes/${quizId}`);
    return response.data;
  },

  /**
   * Get quiz by ID (alias for getQuiz)
   */
  getQuizById: async (quizId: string): Promise<ApiResponse<QuizResponse>> => {
    const response = await api.get<ApiResponse<QuizResponse>>(`/quizzes/${quizId}`);
    return response.data;
  },

  /**
   * Get questions for a quiz
   */
  getQuestions: async (quizId: string): Promise<ApiResponse<QuestionsResponse>> => {
    const response = await api.get<ApiResponse<QuestionsResponse>>(`/questions/${quizId}`);
    return response.data;
  },

  /**
   * Get quiz with all questions (combined)
   */
  getQuizWithQuestions: async (
    quizId: string,
  ): Promise<{quiz: Quiz; questions: Question[]}> => {
    const [quizRes, questionsRes] = await Promise.all([
      quizAPI.getQuiz(quizId),
      quizAPI.getQuestions(quizId),
    ]);
    return {
      quiz: quizRes.data.quiz,
      questions: questionsRes.data.questions,
    };
  },

  /**
   * Create new quiz (teacher only)
   */
  createQuiz: async (data: Partial<Quiz>): Promise<ApiResponse<QuizResponse>> => {
    const response = await api.post<ApiResponse<QuizResponse>>('/quizzes', data);
    return response.data;
  },

  /**
   * Update quiz (teacher only)
   */
  updateQuiz: async (
    quizId: string,
    data: Partial<Quiz>,
  ): Promise<ApiResponse<QuizResponse>> => {
    const response = await api.put<ApiResponse<QuizResponse>>(`/quizzes/${quizId}`, data);
    return response.data;
  },

  /**
   * Delete quiz (teacher only)
   */
  deleteQuiz: async (quizId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/quizzes/${quizId}`);
    return response.data;
  },

  /**
   * Toggle quiz active status (teacher only)
   */
  toggleQuizStatus: async (quizId: string): Promise<ApiResponse<QuizResponse>> => {
    const response = await api.patch<ApiResponse<QuizResponse>>(
      `/quizzes/${quizId}/toggle`,
    );
    return response.data;
  },

  /**
   * Create question for a quiz (teacher only)
   */
  createQuestion: async (
    quizId: string,
    question: Partial<Question>,
  ): Promise<ApiResponse<{question: Question}>> => {
    const response = await api.post<ApiResponse<{question: Question}>>(
      `/questions/${quizId}`,
      question,
    );
    return response.data;
  },

  /**
   * Update question (teacher only)
   */
  updateQuestion: async (
    questionId: string,
    data: Partial<Question>,
  ): Promise<ApiResponse<{question: Question}>> => {
    const response = await api.put<ApiResponse<{question: Question}>>(
      `/questions/question/${questionId}`,
      data,
    );
    return response.data;
  },

  /**
   * Delete question (teacher only)
   */
  deleteQuestion: async (questionId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(
      `/questions/question/${questionId}`,
    );
    return response.data;
  },
};
