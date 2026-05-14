import axios from 'axios';
import { clearEduAgentAuth, useAuthStore } from '../store/auth';

const useEdgeProxy = import.meta.env.VITE_EDGEONE_PROXY === 'true' || import.meta.env.VITE_DEPLOY_TARGET === 'edgeone';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (useEdgeProxy ? '/api' : 'http://localhost:3000');
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || (useEdgeProxy ? 12000 : 180000));

export type RuntimeMode = 'live_api' | 'demo_fallback' | 'local' | string;

export interface DeploymentInfo {
  mode?: RuntimeMode;
  backend?: string;
  proxy?: string;
  fallback?: boolean;
  reason?: string | null;
  latencyMs?: number | null;
  target?: string | null;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
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

function isDemoFallbackPayload(payload: any) {
  return payload?.deployment?.mode === 'demo_fallback' || payload?.observability?.fallbackReason?.includes?.('render') || payload?.token === 'edgeone-demo-token';
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
    if (error.response?.status === 401 && !isDemoFallbackPayload(error.response?.data)) {
      clearEduAgentAuth();
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export function describeDeployment(info?: DeploymentInfo | null) {
  if (!info) return '本地 / 直连 API';
  if (info.mode === 'live_api') return `Live API · ${info.backend || '真实后端'}`;
  if (info.mode === 'demo_fallback') return `Demo Fallback · ${info.reason || '后端不可用'}`;
  return `${info.mode || 'unknown'} · ${info.backend || '-'}`;
}
