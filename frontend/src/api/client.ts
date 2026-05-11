import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eduagent_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
