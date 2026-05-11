import { http } from './http';

export type UserRole = 'admin' | 'consultant' | 'viewer';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    role: UserRole;
  };
}

export const authApi = {
  login: async (payload: LoginRequest) => {
    const { data } = await http.post<LoginResponse>('/auth/login', payload);
    return data;
  },
  profile: async () => {
    const { data } = await http.get<LoginResponse['user']>('/auth/profile');
    return data;
  },
};
