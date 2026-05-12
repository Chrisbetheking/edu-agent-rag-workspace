import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { api } from '../api/client';

const RESUME_URL = 'https://chrisbetheking.github.io/WANGHONG-s-Resume-Website/';

const navs = [
  { to: '/workspace', label: '工作台', icon: '▦', desc: '业务总览' },
  { to: '/frontdesk', label: '前台增长', icon: '✍', desc: '小红书 / 视频脚本' },
  { to: '/chat', label: 'AI 对话', icon: '✦', desc: 'RAG 选校方案' },
  { to: '/applications', label: '申请后台', icon: '▣', desc: '文书与递交流程' },
  { to: '/knowledge', label: '知识库', icon: '▤', desc: '文档 / 批量切片' },
  { to: '/tools', label: 'Agent 工具', icon: '⌘', desc: '业务工具链' },
  { to: '/prompts', label: 'Prompt 管理', icon: '◇', desc: '模板运营' },
  { to: '/evaluation', label: 'RAG 评测', icon: '◎', desc: '质量验证' },
  { to: '/logs', label: '调用日志', icon: '◌', desc: '可观测性' },
  { to: '/architecture', label: '项目架构', icon: '↗', desc: '面试展示页' },
];

function pageLabel(pathname: string) {
  const current = navs.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  return current?.label || 'EduAgent';
}

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const isGuest = user?.role === 'guest';

  useEffect(() => {
    api.get('/auth/profile')
      .then(({ data }) => setUser(data))
      .catch(() => undefined);
  }, [location.pathname, setUser]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">E</div>
          <div>
            <strong>EduAgent</strong>
            <span>AI Agent + RAG Workspace</span>
          </div>
        </div>

        <div className="sidebar-status">
          <span className="pulse-dot" />
          <div>
            <strong>{isGuest ? 'Guest Safe Demo' : 'Production Demo'}</strong>
            <small>{isGuest ? `剩余 AI 次数 ${user?.quotaRemaining ?? '-'} / ${user?.quotaLimit ?? '-'}` : 'DeepSeek · Supabase · NestJS'}</small>
          </div>
        </div>

        <nav className="nav-list">
          {navs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav active' : 'nav')}
              end={item.to === '/workspace'}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.desc}</small>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a className="sidebar-resume" href={RESUME_URL} target="_blank" rel="noreferrer">Resume Website ↗</a>
          <div className="user-card">
            <div className="avatar">{(user?.displayName || user?.username || 'U').slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{user?.displayName || 'Demo Admin'}</strong>
              <small>{isGuest ? 'guest · 只读系统数据' : `${user?.role || 'admin'} · ${pageLabel(location.pathname)}`}</small>
            </div>
          </div>
          <button className="ghost-dark" onClick={() => { logout(); navigate('/login'); }}>退出登录</button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
