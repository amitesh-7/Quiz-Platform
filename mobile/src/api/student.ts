import api from './axios';
import {ApiResponse} from '../types/api';
import {User} from '../types/user';
import {Submission} from '../types/quiz';

export interface StudentWithSubmissions extends User {
  submissions: Submission[];
  totalQuizzes: number;
  averageScore: number;
}

export const studentAPI = {
  /**
   * Get all students (teacher only)
   */
  getStudents: async (): Promise<ApiResponse<{students: User[]}>> => {
    const response = await api.get<ApiResponse<{students: User[]}>>('/auth/students');
    return response.data;
  },

  /**
   * Get student details with submissions (teacher only)
   */
  getStudentDetails: async (
    studentId: string,
  ): Promise<ApiResponse<{student: StudentWithSubmissions}>> => {
    const response = await api.get<ApiResponse<{student: StudentWithSubmissions}>>(
      `/auth/students/${studentId}`,
    );
    return response.data;
  },

  /**
   * Get submissions for a specific student (teacher only)
   */
  getStudentSubmissions: async (
    studentId: string,
  ): Promise<ApiResponse<{submissions: Submission[]}>> => {
    const response = await api.get<ApiResponse<{submissions: Submission[]}>>(
      `/submissions/student/${studentId}`,
    );
    return response.data;
  },

  /**
   * Delete student (teacher only)
   */
  deleteStudent: async (studentId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/auth/students/${studentId}`);
    return response.data;
  },
};
