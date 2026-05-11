import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/dashboard', label: '工作台' },
  { to: '/chat', label: 'AI 对话' },
  { to: '/knowledge-base', label: '知识库' },
  { to: '/agent-tools', label: 'Agent 工具' },
  { to: '/prompts', label: 'Prompt 管理' },
];

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">E</div>
          <div>
            <strong>EduAgent</strong>
            <span>AI 留学咨询工作台</span>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <span>{user?.displayName || 'Demo Admin'}</span>
            <small>{user?.role || 'admin'}</small>
          </div>
          <button className="ghost-button" onClick={handleLogout}>退出登录</button>
        </div>
      </aside>

      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
