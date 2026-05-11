import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('eduagent_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('eduagent_token');
      localStorage.removeItem('eduagent_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
