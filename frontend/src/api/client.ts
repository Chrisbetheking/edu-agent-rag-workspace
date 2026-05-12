import axios from 'axios';
import { clearEduAgentAuth, useAuthStore } from '../store/auth';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000,
});

function syncGuestQuota(payload: any) {
  const quota = payload?.quota;
  if (!quota) return;

  const { user, setUser } = useAuthStore.getState();
  if (user?.role !== 'guest') return;

  setUser({
    ...user,
    quotaLimit: quota.limit ?? user.quotaLimit,
    quotaRemaining: quota.remaining ?? user.quotaRemaining,
  });
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eduagent_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    syncGuestQuota(response.data);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      clearEduAgentAuth();
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
