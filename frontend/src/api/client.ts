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

function shouldUseDirectRender(url?: string, method?: string) {
  if (!DIRECT_API_BASE_URL) return false;
  const path = getRequestPath(url);
  const methodName = String(method || 'GET').toUpperCase();

  // Keep auth and health checks on same-origin EdgeOne /api.
  // Long LLM/RAG/tool requests go directly to Render to avoid EdgeOne Function platform-level fetch timeout.
  if (path.startsWith('/auth') || path.includes('/auth/')) return false;
  if (path.includes('/health')) return false;

  return (
    (path === '/chat' && methodName === 'POST') ||
    path.startsWith('/tools/') ||
    path.startsWith('/eval') ||
    path.startsWith('/documents')
  );
}

function shouldRetryThroughEdgeOne(error: any) {
  const config = error?.config as any;
  if (!config?.__eduagentDirectRender) return false;
  if (config?.__eduagentRetriedViaEdgeOne) return false;
  const message = String(error?.message || '').toLowerCase();
  const status = Number(error?.response?.status || 0);
  return !status || status >= 500 || message.includes('network') || message.includes('timeout');
}

api.interceptors.request.use((config) => {
  const nextConfig = config as any;
  if (shouldUseDirectRender(config.url, config.method)) {
    nextConfig.baseURL = DIRECT_API_BASE_URL;
    nextConfig.__eduagentDirectRender = true;
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
  async (error) => {
    if (shouldRetryThroughEdgeOne(error)) {
      const retryConfig = { ...(error.config || {}) } as any;
      retryConfig.baseURL = API_BASE_URL;
      retryConfig.__eduagentDirectRender = false;
      retryConfig.__eduagentRetriedViaEdgeOne = true;
      return api.request(retryConfig);
    }

    if (error.response?.status === 401 && !isDemoFallbackPayload(error.response?.data)) {
      clearEduAgentAuth();
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export function describeDeployment(info?: DeploymentInfo | null) {
  if (!info) return DIRECT_API_BASE_URL ? 'Live API · Render Direct / EdgeOne Auth' : '本地 / 直连 API';
  if (info.mode === 'live_api') return `Live API · ${info.backend || '真实后端'}`;
  if (info.mode === 'demo_fallback') return `Demo Fallback · ${info.reason || '后端不可用'}`;
  return `${info.mode || 'unknown'} · ${info.backend || '-'}`;
}

export function explainApiFailure(message?: string) {
  const text = String(message || '');
  if (/timeout|network|net_exception|failed to fetch|exceeded/i.test(text)) {
    return '当前请求已进入真实后端链路，但 Render 海外后端、DeepSeek / SiliconFlow 海外模型服务或 EdgeOne 边缘节点之间可能出现冷启动、跨境链路抖动或模型排队，导致本次等待超时。系统会保留兜底演示，不代表项目功能不可用；可稍后重试或查看系统日志确认真实后端调用记录。';
  }
  return '请求未完成。请检查访客登录状态、Render 后端健康状态和模型 API Key；系统会保留兜底演示，避免页面白屏。';
}
