'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, LogOut, Moon, Sun, Menu, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { getInitials } from '@/lib/utils';

const NAV = [
  { href: '/to-trinh', label: 'Tờ trình', icon: FileText },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logout } = useStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-30 h-full flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: 240, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: 'var(--primary)' }}>
            HV
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>HV System</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Quy trình duyệt hồ sơ</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all"
                style={{
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                  background: active ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                }}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          {currentUser && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-2" style={{ background: 'var(--surface-2)' }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: currentUser.avatarColor }}
              >
                {getInitials(currentUser.hoTen)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{currentUser.hoTen}</div>
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{currentUser.boPhan}</div>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs transition-all"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Sáng' : 'Tối'}
            </button>
            <button
              onClick={() => { logout(); router.push('/login'); }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs transition-all"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}
            >
              <LogOut size={14} />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
