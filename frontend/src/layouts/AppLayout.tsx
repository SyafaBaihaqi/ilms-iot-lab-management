import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { RoleName, ROLE_ADMIN, ROLE_DOSEN, ROLE_MAHASISWA, ROLE_USER, roleLabel } from '../constants/roles';

const STAFF: RoleName[] = [ROLE_ADMIN, ROLE_DOSEN];
const ALL: RoleName[] = [ROLE_ADMIN, ROLE_DOSEN, ROLE_MAHASISWA, ROLE_USER];

const navItems: { to: string; label: string; icon: string; roles: RoleName[] }[] = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ALL },
  { to: '/inventory', label: 'Inventori', icon: '📦', roles: ALL },
  { to: '/categories', label: 'Kategori', icon: '🗂️', roles: STAFF },
  { to: '/loans', label: 'Peminjaman', icon: '🔁', roles: ALL },
  { to: '/devices', label: 'Perangkat IoT', icon: '📡', roles: STAFF },
  { to: '/sensors', label: 'Monitoring Sensor', icon: '📈', roles: STAFF },
  { to: '/reports', label: 'Laporan', icon: '📄', roles: STAFF },
  { to: '/audit-logs', label: 'Log Audit', icon: '🕵️', roles: [ROLE_ADMIN] },
  { to: '/projects', label: 'Proyek', icon: '🚀', roles: ALL },
  { to: '/showcase', label: 'Showcase', icon: '🌐', roles: ALL },
  { to: '/support', label: 'Customer Service', icon: '🎧', roles: ALL },
  { to: '/users', label: 'Pengguna', icon: '👥', roles: [ROLE_ADMIN] }
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = navItems.filter((item) => !user || item.roles.includes(user.role));

  const showLabels = !collapsed || mobileOpen;
  const sidebarWidth = mobileOpen || !collapsed ? 'w-60' : 'w-[72px]';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-200 shadow-xl transition-all duration-300 ease-in-out ${sidebarWidth} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center border-b border-slate-800">
          {showLabels ? (
            <div className="flex w-full items-center gap-2 px-4">
              <span className="text-xl">🔬</span>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight text-white">ILMS</h1>
                <p className="truncate text-[10px] leading-none text-slate-400">IoT Lab Management</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <span className="text-xl">🔬</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center rounded-lg text-sm font-medium transition-colors ${
                  showLabels ? 'h-10 gap-3 px-3' : 'mx-auto h-10 w-10 justify-center'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {showLabels && <span className="truncate">{item.label}</span>}
              {!showLabels && (
                <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="shrink-0 border-t border-slate-800 px-2 py-3">
          <button
            className={`hidden h-10 items-center rounded-lg text-sm font-medium transition-colors text-slate-300 hover:bg-slate-800 hover:text-white lg:flex ${
              showLabels ? 'w-full gap-3 px-3' : 'mx-auto w-10 justify-center'
            }`}
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Perluas menu' : 'Ciutkan menu'}
          >
            <span className="text-base leading-none">{collapsed ? '»' : '«'}</span>
            {showLabels && <span className="truncate">{collapsed ? 'Perluas' : 'Ciutkan'}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Content column (auto-adjusts to sidebar width) */}
      <div
        className={`w-full transition-[padding-left] duration-300 ease-in-out ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-60'
        }`}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-slate-900 text-white shadow">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <button
                className="text-xl lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Menu"
              >
                ☰
              </button>
              <div className="flex items-center gap-2 lg:hidden">
                <span className="text-xl">🔬</span>
                <div>
                  <h1 className="text-sm font-bold leading-tight">ILMS</h1>
                  <p className="text-[10px] leading-none text-slate-400">IoT Lab Management</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NavLink
                to="/profile"
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-800"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold">
                  {user?.fullName?.charAt(0) || 'U'}
                </span>
                <span className="hidden sm:block">
                  <span className="block text-xs font-medium">{user?.fullName}</span>
                  <span className="block text-[10px] text-slate-400">{roleLabel(user?.role)}</span>
                </span>
              </NavLink>
              <button
                onClick={handleLogout}
                className="btn btn-secondary !bg-slate-800 !border-slate-700 text-white text-xs px-3 py-1.5"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="space-y-6 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}