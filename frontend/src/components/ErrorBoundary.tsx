import React from 'react';
import { clearEduAgentAuth } from '../store/auth';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('EduAgent UI crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="fatal-page">
        <section className="fatal-card">
          <span className="eyebrow">UI Safety Boundary</span>
          <h1>页面遇到渲染异常，但系统没有白屏。</h1>
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
