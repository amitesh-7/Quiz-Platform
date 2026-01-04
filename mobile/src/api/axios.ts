import axios, {AxiosError, InternalAxiosRequestConfig, AxiosResponse} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@quiz_platform_token';

// API URL configuration
const DEV_API_URL = 'http://10.0.2.2:5000/api'; // Android emulator localhost
const PROD_API_URL = 'https://your-api.vercel.app/api';

const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth
      await AsyncStorage.multiRemove([TOKEN_KEY, '@quiz_platform_user']);
      // Navigation to login should be handled by AuthContext
    }

    // Format error message
    const message =
      (error.response?.data as {message?: string})?.message ||
      error.message ||
      'An error occurred';

    return Promise.reject(new Error(message));
  },
);

export default api;

// Helper for multipart form data (image uploads)
export const uploadApi = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

uploadApi.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);
