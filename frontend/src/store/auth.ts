import { create } from 'zustand';

const TOKEN_KEY = 'eduagent_token';
const USER_KEY = 'eduagent_user';
const VERSION_KEY = 'eduagent_auth_version';
const AUTH_VERSION = 'v2-no-hardcoded-demo-password';

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

function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function loadInitialAuth() {
  if (localStorage.getItem(VERSION_KEY) !== AUTH_VERSION) {
    clearAuthStorage();
    localStorage.setItem(VERSION_KEY, AUTH_VERSION);
    return { token: null, user: null };
  }

  try {
    const raw = localStorage.getItem(USER_KEY);
    return {
      token: localStorage.getItem(TOKEN_KEY),
      user: raw ? JSON.parse(raw) : null,
    };
  } catch {
    clearAuthStorage();
    return { token: null, user: null };
  }
}

const initial = loadInitialAuth();

export const useAuthStore = create<AuthState>((set) => ({
  token: initial.token,
  user: initial.user,
  setAuth: (token, user) => {
    localStorage.setItem(VERSION_KEY, AUTH_VERSION);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },
  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    clearAuthStorage();
    set({ token: null, user: null });
  },
}));

export function clearEduAgentAuth() {
  clearAuthStorage();
}
