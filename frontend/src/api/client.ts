import axios from 'axios';
import { clearEduAgentAuth, useAuthStore } from '../store/auth';

const useEdgeProxy = import.meta.env.VITE_EDGEONE_PROXY === 'true' || import.meta.env.VITE_DEPLOY_TARGET === 'edgeone';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (useEdgeProxy ? '/api' : 'http://localhost:3000');
export const DIRECT_API_BASE_URL = import.meta.env.VITE_DIRECT_API_BASE_URL || (useEdgeProxy ? 'https://edu-agent-backend.onrender.com' : '');
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

  // Keep auth, health, dashboard stats and log/overview reads on same-origin EdgeOne /api.
  // Only long-running AI / embedding requests go directly to Render to avoid EdgeOne Function
  // platform-level fetch timeouts. This prevents dashboard counters from showing 0 just
  // because Render is cold-starting or the browser blocks a cross-origin read.
  if (path.startsWith('/auth') || path.includes('/auth/')) return false;
  if (path.includes('/health')) return false;
  if (methodName === 'GET') return false;

  const longToolActions = new Set([
    '/tools/school-recommend',
    '/tools/copywriting',
    '/tools/growth-campaign',
    '/tools/application-plan',
    '/tools/advisor-suite',
  ]);

  return (
    (path === '/chat' && methodName === 'POST') ||
    longToolActions.has(path) ||
    path === '/eval/run' ||
    path === '/documents/upload' ||
    path === '/documents/bulk' ||
    path === '/documents/embeddings/rebuild' ||
    /^\/documents\/[^/]+\/reprocess$/.test(path)
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

  if (nextConfig.__eduagentRetriedViaEdgeOne) {
    nextConfig.baseURL = API_BASE_URL;
    nextConfig.__eduagentDirectRender = false;
  } else if (shouldUseDirectRender(config.url, config.method)) {
    nextConfig.baseURL = DIRECT_API_BASE_URL;
    nextConfig.__eduagentDirectRender = true;
  } else {
    nextConfig.baseURL = API_BASE_URL;
    nextConfig.__eduagentDirectRender = false;
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

export const AI_LOADING_HINT = '正在调用 AI。后端部署在海外 Render，首次唤醒或模型排队时可能会慢一些，请多等 30–60 秒。';

export function humanizeFallbackReason(reason?: unknown) {
  const text = String(reason || '').trim();
  if (!text) return '这次没等到完整的 AI 返回，先展示备用内容，稍后再点一次通常就能拿到真实结果。';
  if (/edgeone_demo|demo_fallback|render|timeout|network|unavailable|proxy/i.test(text)) {
    return '这次请求没有等到海外后端完整返回，页面先展示备用内容。Render 首次唤醒或模型排队会比较慢，稍后重新生成即可。';
  }
  if (/JSON|parse|合法/i.test(text)) {
    return '模型有返回，但结构不够稳定，系统先保留一份可编辑的备用稿。';
  }
  return text;
}

export function describeDeployment(info?: DeploymentInfo | null) {
  if (!info) return DIRECT_API_BASE_URL ? '后端直连已配置' : '本地接口';
  if (info.mode === 'live_api') return '后端已接通';
  if (info.mode === 'demo_fallback') return humanizeFallbackReason(info.reason || 'demo_fallback');
  return `${info.mode || '接口状态未知'}${info.backend ? ` · ${info.backend}` : ''}`;
}

export function explainApiFailure(message?: string) {
  const text = String(message || '');
  if (/timeout|network|net_exception|failed to fetch|exceeded/i.test(text)) {
    return '这次没有等到 AI 完整返回。后端在海外 Render，首次唤醒、模型排队或跨境网络抖动都会拉长等待时间；可以等一会儿重试，系统日志里如果出现 deepseek 调用，说明后端已经进模型链路。';
  }
  return '这次请求没有完成。可以先确认访客登录、Render 后端状态和模型 Key；页面会保留上一次结果，避免空白。';
}
