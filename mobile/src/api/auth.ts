import api from './axios';
import {ApiResponse, AuthResponse} from '../types/api';
import {User} from '../types/user';

export const authAPI = {
  /**
   * Student login (name only - no password required)
   */
  studentLogin: async (name: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/student-login', {
      name,
    });
    return response.data;
  },

  /**
   * Teacher login (email + password)
   */
  teacherLogin: async (
    email: string,
    password: string,
  ): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Register new teacher account
   */
  register: async (data: {
    name: string;
    email: string;
    password: string;
    secretKey: string;
  }): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', {
      ...data,
      role: 'teacher',
    });
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<ApiResponse<{user: User}>> => {
    const response = await api.get<ApiResponse<{user: User}>>('/auth/me');
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<User>): Promise<ApiResponse<{user: User}>> => {
    const response = await api.put<ApiResponse<{user: User}>>('/auth/profile', data);
    return response.data;
  },
};
