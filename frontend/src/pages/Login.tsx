import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuth(data.token, data.user);
      navigate('/');
    } catch {
      setError('登录失败，请使用 admin/admin123 或 demo/demo123');
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="badge">AI Agent + RAG</div>
        <h1>EduAgent 留学咨询工作台</h1>
        <p>用于展示 AI 应用研发能力：RAG、Agent 工具、Prompt 管理、评测与日志。</p>
        <label>账号<input value={username} onChange={(e) => setUsername(e.target.value)} /></label>
        <label>密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit">进入工作台</button>
        <small>测试账号：admin / admin123</small>
      </form>
    </div>
  );
}
