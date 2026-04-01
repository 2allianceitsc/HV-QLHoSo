'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, LogOut, Moon, Sun, Menu, X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { getInitials } from '@/lib/utils';

const NAV = [
  { href: '/to-trinh', label: 'Tờ trình', icon: FileText },
  { href: '/introduce', label: 'Giới thiệu', icon: BookOpen },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logout } = useStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-30 h-full flex flex-col transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: sidebarWidth, background: 'var(--surface)', borderRight: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 relative" style={{ borderBottom: '1px solid var(--border)', minHeight: 60 }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: 'var(--primary)', boxShadow: '0 2px 8px color-mix(in srgb, var(--primary) 40%, transparent)' }}
          >
            HV
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>HV System</div>
              <div className="text-xs leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>Quy trình duyệt hồ sơ</div>
            </div>
          )}
          {/* Mobile close */}
          <button className="lg:hidden p-1 rounded-lg hover:opacity-70 transition-opacity ml-auto" onClick={() => setSidebarOpen(false)}>
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
          {/* Desktop collapse toggle */}
          <button
            className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full items-center justify-center transition-all hover:opacity-90 z-10"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', color: 'var(--text-muted)' }}
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2">
          {!collapsed && (
            <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: 'var(--text-muted)' }}>Menu</p>
          )}
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all relative"
                style={{
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--primary-muted)' : 'transparent',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
                title={collapsed ? label : undefined}
              >
                {active && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ background: 'var(--primary)' }} />
                )}
                <Icon size={17} />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-2 pb-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          {currentUser && !collapsed && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: currentUser.avatarColor }}
              >
                {getInitials(currentUser.hoTen)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{currentUser.hoTen}</div>
                <div className="text-xs truncate leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>{currentUser.boPhan}</div>
              </div>
            </div>
          )}
          {currentUser && collapsed && (
            <div className="flex justify-center mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: currentUser.avatarColor }}
                title={currentUser.hoTen}
              >
                {getInitials(currentUser.hoTen)}
              </div>
            </div>
          )}
          {!collapsed ? (
            <div className="flex gap-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                {theme === 'dark' ? 'Sáng' : 'Tối'}
              </button>
              <button
                onClick={() => { logout(); router.push('/login'); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ color: 'var(--danger)', background: 'var(--danger-muted)', border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)' }}
              >
                <LogOut size={13} />
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-all hover:opacity-80"
                style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button
                onClick={() => { logout(); router.push('/login'); }}
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-all hover:opacity-80"
                style={{ color: 'var(--danger)', background: 'var(--danger-muted)', border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)' }}
                title="Đăng xuất"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <span className="ml-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>HV System</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
