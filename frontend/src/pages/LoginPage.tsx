import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch {
      setError('登录失败，请检查账号或后端服务是否启动。');
    }
  };

  return (
    <div className="login-page">
      <section className="login-hero">
        <span className="eyebrow">EduAgent v2</span>
        <h1>AI Agent + RAG 留学咨询工作台</h1>
        <p>
          从纯前端规则 Demo 升级为完整 AI 应用骨架，后续支持知识库、RAG 检索、Agent 工具调用和 Prompt 管理。
        </p>
        <div className="hero-points">
          <span>React + TypeScript</span>
          <span>NestJS Backend</span>
          <span>PostgreSQL + Redis</span>
        </div>
      </section>

      <form className="login-card" onSubmit={handleSubmit}>
        <h2>登录工作台</h2>
        <p>测试账号已预填：admin / admin123</p>
        <label>
          账号
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          密码
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? '登录中...' : '进入工作台'}
        </button>
      </form>
    </div>
  );
}
