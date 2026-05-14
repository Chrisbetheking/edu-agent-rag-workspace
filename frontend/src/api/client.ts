import axios from 'axios';
import { clearEduAgentAuth, useAuthStore } from '../store/auth';

const useEdgeProxy = import.meta.env.VITE_EDGEONE_PROXY === 'true' || import.meta.env.VITE_DEPLOY_TARGET === 'edgeone';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (useEdgeProxy ? '/api' : 'http://localhost:3000');
export const DIRECT_API_BASE_URL = import.meta.env.VITE_DIRECT_API_BASE_URL || '';
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || (useEdgeProxy ? 120000 : 180000));

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

function getRequestPath(url?: string) {
  const value = String(url || '');
  if (!value) return '';
  try {
    if (/^https?:\/\//i.test(value)) return new URL(value).pathname;
  } catch {}
  return value.startsWith('/') ? value : `/${value}`;
}

function shouldUseDirectRender(url?: string) {
  if (!DIRECT_API_BASE_URL) return false;
  const path = getRequestPath(url);

  // EdgeOne Functions can hit platform-level net_exception_timeout on long LLM calls.
  // Keep login/guest/health on same-domain /api, but send long AI/business calls
  // directly to Render so the browser can wait for DeepSeek/SiliconFlow results.
  return (
    path === '/chat' ||
    path.startsWith('/chat/') ||
    path.startsWith('/tools/') ||
    path.startsWith('/eval') ||
    path.startsWith('/documents')
  );
}

api.interceptors.request.use((config) => {
  if (shouldUseDirectRender(config.url)) {
    config.baseURL = DIRECT_API_BASE_URL;
  }

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
