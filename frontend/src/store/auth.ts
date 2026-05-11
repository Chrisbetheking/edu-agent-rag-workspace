import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('eduagent_token'),
  user: localStorage.getItem('eduagent_user') ? JSON.parse(localStorage.getItem('eduagent_user')!) : null,
  setAuth: (token, user) => {
    localStorage.setItem('eduagent_token', token);
    localStorage.setItem('eduagent_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('eduagent_token');
    localStorage.removeItem('eduagent_user');
    set({ token: null, user: null });
  },
}));
