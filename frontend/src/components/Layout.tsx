import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const navs = [
  { to: '/', label: '工作台', icon: '▦', desc: '业务总览' },
  { to: '/chat', label: 'AI 对话', icon: '✦', desc: 'RAG 选校方案' },
  { to: '/knowledge', label: '知识库', icon: '▤', desc: '文档与切片' },
  { to: '/tools', label: 'Agent 工具', icon: '⌘', desc: '业务工具链' },
  { to: '/prompts', label: 'Prompt 管理', icon: '◇', desc: '模板运营' },
  { to: '/evaluation', label: 'RAG 评测', icon: '◎', desc: '质量验证' },
  { to: '/logs', label: '调用日志', icon: '◌', desc: '可观测性' },
];

function pageLabel(pathname: string) {
  const current = navs.find((item) => (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)));
  return current?.label || 'EduAgent';
}

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

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
            <strong>Production Demo</strong>
            <small>DeepSeek · Supabase · NestJS</small>
          </div>
        </div>

        <nav className="nav-list">
          {navs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav active' : 'nav')}
              end={item.to === '/'}
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
          <div className="user-card">
            <div className="avatar">{(user?.displayName || user?.username || 'U').slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{user?.displayName || 'Demo Admin'}</strong>
              <small>{user?.role || 'admin'} · {pageLabel(location.pathname)}</small>
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
