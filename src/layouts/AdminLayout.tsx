import { useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { authService } from '@/services';
import { adminNavItems } from '@/utils/adminNavigation';

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = authService.getCurrentUser();

  if (!authService.isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = () => {
    authService.logout('/admin');
  };

  const initials = (user?.name || 'A')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-900">
      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        <div
          className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity lg:hidden ${
            sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col bg-[#111318] transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.35)' }}
        >
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />

          {/* Brand header */}
          <div className="relative overflow-hidden border-b border-white/[0.07] px-6 py-6">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(48,149,248,0.15) 0%, transparent 70%)',
              }}
            />
            <p className="relative text-[9px] font-black uppercase tracking-[0.42em] text-primary">
              Admin Console
            </p>
            <h1 className="relative mt-2 text-[22px] font-black tracking-tight text-white">
              Operations Hub
            </h1>
            <p className="relative mt-1.5 text-[11px] leading-5 text-white/40">
              Catalog &amp; request management.
            </p>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-2xl px-4 py-3 text-[13px] font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-textMain shadow-[0_8px_20px_rgba(48,149,248,0.22)]'
                        : 'text-white/55 hover:bg-white/[0.06] hover:text-white'
                    }`
                  }
                >
                  <Icon size={17} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User card */}
          <div className="border-t border-white/[0.07] px-4 py-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-black text-textMain">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-white">
                  {user?.name || 'Admin User'}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-white/40">
                  {user?.email || 'admin@portal.local'}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top header */}
          <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/95 backdrop-blur-lg">
            <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((c) => !c)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 lg:hidden"
                  aria-label="Toggle admin navigation"
                >
                  {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                    Admin
                  </p>
                  <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">
                    Separate management experience
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900">{user?.name || 'Admin User'}</p>
                  <p className="text-[11px] capitalize text-slate-400">{user?.role ?? 'admin'}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-4"
                >
                  <LogOut size={15} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
            <div className="w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
