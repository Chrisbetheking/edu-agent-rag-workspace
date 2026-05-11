import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
  quotaLimit?: number | null;
  quotaRemaining?: number | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

function loadUser() {
  try {
    const raw = localStorage.getItem('eduagent_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('eduagent_token'),
  user: loadUser(),
  setAuth: (token, user) => {
    localStorage.setItem('eduagent_token', token);
    localStorage.setItem('eduagent_user', JSON.stringify(user));
    set({ token, user });
  },
  setUser: (user) => {
    localStorage.setItem('eduagent_user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('eduagent_token');
    localStorage.removeItem('eduagent_user');
    set({ token: null, user: null });
  },
}));
