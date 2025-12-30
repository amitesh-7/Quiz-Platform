import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

// API service functions
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  getMe: () => api.get("/auth/me"),
};

export const quizAPI = {
  getAll: () => api.get("/quizzes"),
  getOne: (id) => api.get(`/quizzes/${id}`),
  create: (data) => api.post("/quizzes", data),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
};

export const questionAPI = {
  getByQuiz: (quizId) => api.get(`/questions/${quizId}`),
  create: (data) => api.post("/questions", data),
  bulkCreate: (data) => api.post("/questions/bulk", data),
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`),
};

export const geminiAPI = {
  generate: (data) => api.post("/gemini/generate", data),
  ocr: (imageBase64, mimeType) =>
    api.post("/gemini/ocr", { imageBase64, mimeType }),
  processQuestions: (data) => api.post("/gemini/process-questions", data),
  extractQuestionsFromImage: (data) =>
    api.post("/gemini/extract-questions-from-image", data),
};

export const submissionAPI = {
  submit: (data) => api.post("/submissions", data),
  getMy: () => api.get("/submissions/my"),
  getByQuiz: (quizId) => api.get(`/submissions/quiz/${quizId}`),
};

export const resultAPI = {
  get: (quizId) => api.get(`/results/${quizId}`),
};
