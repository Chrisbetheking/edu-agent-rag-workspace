import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const resumeUrl = 'https://chrisbetheking.github.io/WANGHONG-s-Resume-Website/';
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuth(data.token, data.user);
      navigate('/workspace');
    } catch (err: any) {
      setError(err?.response?.data?.message || '账号或密码错误');
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
      navigate('/workspace');
    } catch (err: any) {
      setError(err?.response?.data?.message || '访客通道暂时不可用');
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <div className="login-page clean-login">
      <section className="login-hero compact-login-hero">
        <div className="brand login-brand">
          <div className="brand-icon">E</div>
          <div>
            <strong>EduAgent</strong>
            <span>留学咨询工作台</span>
          </div>
        </div>
        <h1>登录工作台</h1>
        <p>学生背景、知识库检索、选校方案、申请文书和跟进记录集中处理。</p>
        <div className="login-showcase-grid simple-showcase">
          <div><strong>RAG 知识库</strong><span>资料导入、切片、来源引用</span></div>
          <div><strong>方案引擎</strong><span>评分、选校、材料流程</span></div>
          <div><strong>系统日志</strong><span>调用耗时、结果状态、错误追踪</span></div>
        </div>
      </section>

      <form className="login-card clean-login-card" onSubmit={submit}>
        <div className="login-card-top">
          <div className="badge">Console</div>
          <div className="mini-status"><span className="pulse-dot" /> Online</div>
        </div>
        <h2>管理员登录</h2>
        <p>管理员账号由后端环境变量维护，前端不保存任何测试密码。</p>

        <label>账号<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="请输入账号" /></label>
        <label>密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="请输入密码" /></label>

        {error && <div className="error">{error}</div>}

        <button className="primary" type="submit" disabled={loading || !username || !password}>{loading ? '登录中...' : '登录'}</button>
        <button className="guest-login-button" type="button" onClick={guestLogin} disabled={guestLoading}>
          {guestLoading ? '正在进入...' : '访客体验'}
        </button>
        <a className="guest-resume-link" href={resumeUrl} target="_blank" rel="noreferrer">查看我的 Resume Web ↗</a>
        <small className="login-footnote">访客模式有每日 AI 调用额度，不能删除系统示例资料。</small>
      </form>
    </div>
  );
}
