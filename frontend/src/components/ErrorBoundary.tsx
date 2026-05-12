import React from 'react';
import { API_BASE_URL } from '../api/client';
import { clearEduAgentAuth } from '../store/auth';

async function reportUiError(error: Error) {
  try {
    const token = localStorage.getItem('eduagent_token');
    await fetch(`${API_BASE_URL}/tools/client-error-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        toolName: '前端渲染异常',
        activeTool: 'ui-error-boundary',
        endpoint: window.location.pathname,
        message: error?.message || 'React render error',
        durationMs: 0,
      }),
    });
  } catch {
    // 不让日志失败影响页面恢复
  }
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('EduAgent UI crashed:', error);
    reportUiError(error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="fatal-page">
        <section className="fatal-card">
          <span className="eyebrow">前端保护</span>
          <h1>页面渲染异常，已记录日志。</h1>
          <p>{this.state.error.message || '未知前端错误'}</p>
          <div className="actions">
            <button className="primary" onClick={() => window.location.reload()}>刷新页面</button>
            <button className="ghost-button" onClick={() => { clearEduAgentAuth(); window.location.href = '/login'; }}>清除登录状态并回到登录页</button>
          </div>
        </section>
      </div>
    );
  }
}
