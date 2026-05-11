import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

const RESUME_URL = 'https://chrisbetheking.github.io/WANGHONG-s-Resume-Website/';

export default function Login() {
  const [username, setUsername] = useState('CHRISWANG');
  const [password, setPassword] = useState('060712');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
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
    } catch (err: any) {
      setError(err?.response?.data?.message || '登录失败，请检查账号和密码。');
    } finally {
      setLoading(false);
    }
  }

  async function guestLogin() {
    setError('');
    setGuestLoading(true);
    try {
      const { data } = await api.post('/auth/guest');
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || '访客登录失败，请稍后重试。');
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <div className="login-page upgraded-login">
      <section className="login-hero">
        <span className="eyebrow">AI Agent + RAG Portfolio Product</span>
        <h1>一套能真实跑业务的留学 AI 工作台。</h1>
        <p>
          EduAgent 把留学咨询拆成前台获客、AI 选校、RAG 知识库、Agent 工具、申请后台、质量评测和调用日志，适合直接放进作品集和面试 Demo。
        </p>
        <div className="hero-points">
          <span>DeepSeek LLM</span>
          <span>Supabase pgvector</span>
          <span>NestJS API</span>
          <span>React SaaS Console</span>
        </div>
        <div className="login-showcase-grid">
          <div><strong>RAG</strong><span>文档自动切片、来源引用、命中追踪</span></div>
          <div><strong>Agent</strong><span>选校、文案、材料、申请流程一体编排</span></div>
          <div><strong>Safe Demo</strong><span>访客免账号进入，保护系统原始数据</span></div>
        </div>
      </section>

      <form className="login-card" onSubmit={submit}>
        <div className="login-card-top">
          <div className="badge">EduAgent Console</div>
          <div className="mini-status"><span className="pulse-dot" /> Live Demo</div>
        </div>
        <h2>进入 AI 留学咨询工作台</h2>
        <p>管理员用于完整展示；HR / 面试官可以直接使用访客模式体验，访客不能删除系统示例数据。</p>

        <label>账号<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label>
        <label>密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>

        {error && <div className="error">{error}</div>}

        <button className="primary" type="submit" disabled={loading}>{loading ? '登录中...' : '管理员进入'}</button>
        <button className="guest-login-button" type="button" onClick={guestLogin} disabled={guestLoading}>
          {guestLoading ? '创建访客环境中...' : '访客体验 · HR 免账号进入'}
        </button>
        <a className="resume-link" href={RESUME_URL} target="_blank" rel="noreferrer">查看 Chris Wang Resume Website →</a>
      </form>
    </div>
  );
}
