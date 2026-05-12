import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { api } from '../api/client';

const navs = [
  { to: '/workspace', label: '工作台', icon: '▦', desc: '概览' },
  { to: '/frontdesk', label: '客户线索', icon: '✍', desc: '内容与跟进' },
  { to: '/chat', label: 'AI 咨询', icon: '✦', desc: '选校问答' },
  { to: '/applications', label: '申请案卷', icon: '▣', desc: '文书与材料' },
  { to: '/knowledge', label: '知识库', icon: '▤', desc: '资料切片' },
  { to: '/tools', label: '方案引擎', icon: '⌘', desc: '评分与编排' },
  { to: '/evaluation', label: '检索评测', icon: '◎', desc: '命中验证' },
  { to: '/logs', label: '系统日志', icon: '◌', desc: '调用追踪' },
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
            <span>留学咨询工作台</span>
          </div>
        </div>

        <div className="sidebar-status">
          <span className="pulse-dot" />
          <div>
            <strong>{isGuest ? '访客体验' : '管理员'}</strong>
            <small>{isGuest ? `今日剩余 ${user?.quotaRemaining ?? '-'} / ${user?.quotaLimit ?? '-'}` : '后端服务在线'}</small>
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
          <div className="user-card">
            <div className="avatar">{(user?.displayName || user?.username || 'U').slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{user?.displayName || '用户'}</strong>
              <small>{isGuest ? '访客 · 部分操作受限' : `${user?.role || 'admin'} · ${pageLabel(location.pathname)}`}</small>
            </div>
          </div>
          <button className="ghost-dark" onClick={() => { logout(); navigate('/login'); }}>退出</button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
