import api from './axios';
import {ApiResponse, SubmissionsResponse, SubmissionResponse} from '../types/api';
import {Submission, Answer} from '../types/quiz';

export interface SubmitQuizData {
  quizId: string;
  answers: Answer[];
  questionsData?: any[];
}

export const submissionAPI = {
  /**
   * Submit quiz answers (student)
   */
  submit: async (data: SubmitQuizData): Promise<ApiResponse<SubmissionResponse>> => {
    const response = await api.post<ApiResponse<SubmissionResponse>>('/submissions', data);
    return response.data;
  },

  /**
   * Get student's own submissions
   */
  getMySubmissions: async (): Promise<ApiResponse<SubmissionsResponse>> => {
    const response = await api.get<ApiResponse<SubmissionsResponse>>('/submissions/my');
    return response.data;
  },

  /**
   * Get single submission details
   */
  getSubmission: async (submissionId: string): Promise<ApiResponse<SubmissionResponse>> => {
    const response = await api.get<ApiResponse<SubmissionResponse>>(
      `/submissions/${submissionId}`,
    );
    return response.data;
  },

  /**
   * Get submission by ID (alias for getSubmission)
   */
  getSubmissionById: async (submissionId: string): Promise<ApiResponse<SubmissionResponse>> => {
    const response = await api.get<ApiResponse<SubmissionResponse>>(
      `/submissions/${submissionId}`,
    );
    return response.data;
  },

  /**
   * Update submission marks (teacher only) - alternative format
   */
  updateSubmissionMarks: async (
    submissionId: string,
    data: {answers: Array<{questionId: string; marks: number}>},
  ): Promise<ApiResponse<SubmissionResponse>> => {
    const response = await api.patch<ApiResponse<SubmissionResponse>>(
      `/submissions/${submissionId}/marks`,
      {
        updatedAnswers: data.answers.map(a => ({
          questionId: a.questionId,
          marksObtained: a.marks,
        })),
      },
    );
    return response.data;
  },

  /**
   * Get all submissions for a quiz (teacher only)
   */
  getQuizSubmissions: async (quizId: string): Promise<ApiResponse<SubmissionsResponse>> => {
    const response = await api.get<ApiResponse<SubmissionsResponse>>(
      `/submissions/quiz/${quizId}`,
    );
    return response.data;
  },

  /**
   * Update marks for a submission (teacher only)
   */
  updateMarks: async (
    submissionId: string,
    updatedAnswers: Array<{
      questionId: string;
      marksObtained: number;
      maxMarks?: number;
      feedback?: string;
    }>,
  ): Promise<ApiResponse<SubmissionResponse>> => {
    const response = await api.patch<ApiResponse<SubmissionResponse>>(
      `/submissions/${submissionId}/marks`,
      {updatedAnswers},
    );
    return response.data;
  },

  /**
   * Update correct answer for a question in submission (teacher only)
   */
  updateCorrectAnswer: async (
    submissionId: string,
    questionId: string,
    correctAnswer: string,
  ): Promise<ApiResponse<SubmissionResponse>> => {
    const response = await api.patch<ApiResponse<SubmissionResponse>>(
      `/submissions/${submissionId}/correct-answer`,
      {questionId, correctAnswer},
    );
    return response.data;
  },

  /**
   * Get results for student (quiz results page)
   */
  getResult: async (quizId: string): Promise<ApiResponse<SubmissionResponse>> => {
    const response = await api.get<ApiResponse<SubmissionResponse>>(
      `/results/quiz/${quizId}`,
    );
    return response.data;
  },

  /**
   * Check if student has already submitted
   */
  checkSubmission: async (
    quizId: string,
  ): Promise<ApiResponse<{hasSubmitted: boolean; submission?: Submission}>> => {
    const response = await api.get<
      ApiResponse<{hasSubmitted: boolean; submission?: Submission}>
    >(`/submissions/check/${quizId}`);
    return response.data;
  },
};
