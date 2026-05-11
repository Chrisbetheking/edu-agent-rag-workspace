import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuth(data.token, data.user);
      navigate('/');
    } catch {
      setError('登录失败，请使用 admin/admin123 或 demo/demo123');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <span className="eyebrow">AI Agent + RAG Portfolio Product</span>
        <h1>把留学咨询业务做成一个可演示、可追踪、可评测的 AI 工作台。</h1>
        <p>
          EduAgent 展示完整 AI 应用工程能力：真实大模型接入、RAG 知识库、Agent 工具链、Prompt 管理、质量评测和调用日志。
        </p>
        <div className="hero-points">
          <span>DeepSeek LLM</span>
          <span>Supabase PostgreSQL</span>
          <span>NestJS API</span>
          <span>React Dashboard</span>
        </div>
      </section>

      <form className="login-card" onSubmit={submit}>
        <div className="login-card-top">
          <div className="badge">EduAgent Console</div>
          <div className="mini-status"><span className="pulse-dot" /> Live Demo</div>
        </div>
        <h2>进入 AI 留学咨询工作台</h2>
        <p>建议面试展示时先进入工作台总览，再演示 AI 对话、知识库命中和日志追踪。</p>

        <label>账号<input value={username} onChange={(e) => setUsername(e.target.value)} /></label>
        <label>密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>

        {error && <div className="error">{error}</div>}

        <button className="primary" type="submit" disabled={loading}>{loading ? '登录中...' : '进入工作台'}</button>
        <small className="muted-text">测试账号：admin / admin123</small>
      </form>
    </div>
  );
}
