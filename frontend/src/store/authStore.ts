import { create } from 'zustand';
import { authApi, LoginResponse } from '../api/auth';

interface AuthState {
  user: LoginResponse['user'] | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  hydrate: () => {
    const token = localStorage.getItem('edu_agent_token');
    const rawUser = localStorage.getItem('edu_agent_user');
    if (token && rawUser) {
      set({ token, user: JSON.parse(rawUser) });
    }
  },
  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login({ username, password });
      localStorage.setItem('edu_agent_token', data.accessToken);
      localStorage.setItem('edu_agent_user', JSON.stringify(data.user));
      set({ token: data.accessToken, user: data.user });
    } finally {
      set({ isLoading: false });
    }
  },
  logout: () => {
    localStorage.removeItem('edu_agent_token');
    localStorage.removeItem('edu_agent_user');
    set({ token: null, user: null });
  },
}));
