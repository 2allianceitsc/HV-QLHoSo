import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { getHealth } from '@/api/health.api';
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  KeyRound,
  ChevronDown,
  ChevronRight,
  User,
  Sun,
  Moon,
  Waves,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { ChangePasswordModal } from '@/components/modals/ChangePasswordModal';
import { MoodLogoutModal } from '@/components/modals/MoodLogoutModal';
import { OverBreakModal } from '@/components/modals/OverBreakModal';
import { UserAvatar } from '@/components/UserAvatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Toaster } from '@/components/ui/toaster';
import { useLogoutFlow } from '@/hooks/useLogoutFlow';
import { FloatingWidget } from '@/components/floating-widget/FloatingWidget';
import { ClockSkewWarningBanner } from '@/components/ClockSkewWarningBanner';
import { NAV_GROUPS, type INavGroupConfig } from '@/config/nav.config';
import { useBrandingUrl, usePublicConfig } from '@/hooks/useSystem';

interface INavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  end?: boolean;
}

interface INavGroup {
  label?: string;
  items: INavItem[];
}

import type { IUserPermissionPayload } from '@/api/permissions.api';

function isItemVisible(
  item: INavGroupConfig['items'][number],
  roles: string[],
  permissions: IUserPermissionPayload | null,
): boolean {
  // Phase 3+: if the item declares `screen` AND permissions are loaded, the
  // matrix is the authoritative source. No fall-through to roles — a missing
  // entry means default-deny.
  if (item.screen && permissions) {
    if (permissions.isSuperAdmin) return true;
    const entries = permissions.permissions.filter((p) => p.screen === item.screen);
    const screenEntry = entries.find((e) => e.tab === null);
    return screenEntry?.actions.includes('VIEW') ?? false;
  }
  // Pre-load window OR item has no `screen`: legacy role filter.
  if (!item.roles) return true;
  return item.roles.some((r) => roles.includes(r));
}

function buildNavGroups(
  roles: string[],
  permissions: IUserPermissionPayload | null,
): INavGroup[] {
  return NAV_GROUPS
    .filter((group) => !group.roles || group.roles.some((r) => roles.includes(r)))
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => isItemVisible(item, roles, permissions)),
    }))
    .filter((group) => group.items.length > 0);
}

const ROLE_PRIORITY: Record<string, number> = {
  SUPER_ADMIN: 4,
  HR_ADMIN: 3,
  MANAGER: 2,
  EMPLOYEE: 1,
};

function getHighestRole(roles: string[]): string {
  if (!roles?.length) return '';
  return roles.reduce((best, role) =>
    (ROLE_PRIORITY[role] ?? -1) > (ROLE_PRIORITY[best] ?? -1) ? role : best,
  roles[0]);
}

function HeaderClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-[12px] font-mono text-muted-foreground tabular-nums select-none">
      {time.toLocaleTimeString()}
    </span>
  );
}

const COLLAPSED_GROUPS_KEY = 'hvflow-sidebar-collapsed';
const SIDEBAR_OPEN_KEY = 'hvflow-sidebar-open';

function readCollapsedGroups(): Set<number> {
  try {
    const stored = localStorage.getItem(COLLAPSED_GROUPS_KEY);
    if (stored) return new Set(JSON.parse(stored) as number[]);
  } catch { /* ignore */ }
  return new Set();
}

function readSidebarOpen(): boolean {
  // Mobile always starts closed — prevents backdrop covering content on first render
  if (window.innerWidth < 1024) return false;
  try {
    const stored = localStorage.getItem(SIDEBAR_OPEN_KEY);
    if (stored !== null) return stored === 'true';
  } catch { /* ignore */ }
  return true;
}

export function AppLayout() {
  const logoUrl = useBrandingUrl('/api/public/branding/logo');
  const { data: publicConfig } = usePublicConfig();
  const showHeaderClock = publicConfig?.['display.show_header_clock'] === 'true';
  const [isSidebarOpen, setIsSidebarOpen] = useState(readSidebarOpen);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(readCollapsedGroups);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permissions } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navGroups = buildNavGroups(user?.roles ?? [], permissions);

  function toggleGroup(gi: number) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(gi)) { next.delete(gi); } else { next.add(gi); }
      try { localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }
  const {
    isMoodLogoutOpen,
    isLogoutOverbreakOpen,
    overbreakBreakContext,
    startLogout: handleLogout,
    cancelLogoutOverbreak,
    closeMoodLogout,
    confirmMoodLogout: handleMoodLogoutConfirm,
    confirmLogoutOverbreak: handleLogoutOverbreakConfirm,
  } = useLogoutFlow();

  const allNavItems = useMemo(() => {
    const flat: Record<string, { label: string; icon: React.ReactNode }> = {};
    for (const group of navGroups) {
      for (const item of group.items) {
        flat[item.path] = { label: item.label, icon: item.icon };
      }
    }
    return flat;
  }, [navGroups]);

  useEffect(() => {
    setRecentPaths((prev) => {
      const filtered = prev.filter((p) => p !== location.pathname);
      return [location.pathname, ...filtered].slice(0, 4);
    });
  }, [location.pathname]);

  // Auto-close sidebar when resizing below lg breakpoint to prevent backdrop blocking content
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const recentLinks = recentPaths
    .filter((p) => p !== location.pathname)
    .slice(0, 3)
    .flatMap((p) => {
      const item = allNavItems[p];
      return item ? [{ path: p, label: item.label, icon: item.icon }] : [];
    });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
          'fixed inset-y-0 left-0 z-50 lg:relative',
          isSidebarOpen ? 'w-60 translate-x-0' : 'w-[60px] -translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo — click to go home */}
        <button
          onClick={() => void navigate('/')}
          className={cn(
            'flex items-center h-16 border-b border-sidebar-border flex-shrink-0 w-full hover:bg-sidebar-hover/40 transition-colors',
            isSidebarOpen ? 'px-5 gap-3' : 'px-4 justify-center',
          )}
        >
          <img src={logoUrl} alt="HVFlow" className="h-8 w-8 rounded-lg flex-shrink-0 object-contain bg-white/20" />
          {isSidebarOpen && (
            <span className="font-extrabold text-[15px] text-white tracking-tight animate-fade-in">
              HVFlow
            </span>
          )}
        </button>

        {/* Nav */}
        <nav data-testid="app-nav" className="flex-1 py-4 overflow-y-auto space-y-1 px-2">
          {navGroups.map((group, gi) => {
            const isCollapsed = isSidebarOpen && !!group.label && collapsedGroups.has(gi);
            return (
              <div key={gi} className={gi > 0 ? 'pt-3' : ''}>
                {isSidebarOpen && group.label && (
                  <button
                    onClick={() => toggleGroup(gi)}
                    className="w-full flex items-center justify-between px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-text/50 hover:text-sidebar-text/80 select-none transition-colors"
                  >
                    <span>{group.label}</span>
                    {isCollapsed
                      ? <ChevronRight className="h-3 w-3" />
                      : <ChevronDown className="h-3 w-3" />
                    }
                  </button>
                )}
                {!isCollapsed && group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    title={!isSidebarOpen ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 cursor-pointer',
                        isActive
                          ? 'bg-sidebar-active text-sidebar-text-active shadow-sm'
                          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active',
                        !isSidebarOpen && 'justify-center px-2',
                      )
                    }
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {isSidebarOpen && <span className="truncate animate-fade-in">{item.label}</span>}
                  </NavLink>
                ))}
                {isSidebarOpen && gi < navGroups.length - 1 && (
                  <div className="mt-3 border-t border-sidebar-border/40" />
                )}
              </div>
            );
          })}
        </nav>

        {/* Version strip — SUPER_ADMIN only */}
        {isSidebarOpen && user?.roles?.includes('SUPER_ADMIN') && (
          <div className="px-3 py-2 border-t border-sidebar-border/40 space-y-0.5">
            <p className="text-[11px] text-sidebar-text/70 font-mono leading-tight">
              FE: {__BUILD_TIME__ === 'dev' ? 'dev' : new Date(__BUILD_TIME__).toLocaleString('sv').slice(0, 16)}
            </p>
            <p className="text-[11px] text-sidebar-text/70 font-mono leading-tight">
              BE: {health ? `${new Date(health.startedAt).toLocaleString('sv').slice(0, 16)} (${health.commit})` : '…'}
            </p>
          </div>
        )}

        {/* User footer */}
        <div className={cn(
          'border-t border-sidebar-border p-3 flex items-center gap-3',
          !isSidebarOpen && 'justify-center',
        )}>
          {user ? (
            <UserAvatar
              src={user.photoBusiness}
              firstName={user.fullName.split(' ')[0] ?? 'U'}
              surname={user.fullName.split(' ').slice(-1)[0] ?? 'N'}
              size="sm"
            />
          ) : (
            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-sidebar-hover flex items-center justify-center">
              <User size={14} className="text-sidebar-text" />
            </div>
          )}
          {isSidebarOpen && (
            <>
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-[13px] font-semibold text-white truncate leading-tight">
                  {user?.fullName ?? 'User'}
                </p>
                <p className="text-[11px] text-sidebar-text/60 truncate">
                  {getHighestRole(user?.roles ?? []).replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-sidebar-text/60 hover:text-white hover:bg-sidebar-hover transition-colors"
                aria-label="Log out"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header data-testid="app-header" className="flex items-center h-16 px-5 border-b border-border bg-card gap-4 flex-shrink-0">
          <button
            onClick={() => setIsSidebarOpen((p) => {
              const next = !p;
              try { localStorage.setItem(SIDEBAR_OPEN_KEY, String(next)); } catch { /* ignore */ }
              return next;
            })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>

          {recentLinks.length > 0 && (
            <div className="hidden md:flex items-center gap-0.5">
              <span className="text-[11px] font-medium text-muted-foreground/60 px-1 select-none">Recent:</span>
              {recentLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <span className="opacity-60 [&>svg]:size-3.5">{link.icon}</span>
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
          )}

          <div className="flex-1" />

          {showHeaderClock && <HeaderClock />}

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to Vibe theme' : theme === 'vibe' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Waves size={18} /> : theme === 'vibe' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <NotificationBell />

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen((p) => !p)}
              className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-lg hover:bg-accent transition-colors text-sm"
            >
              {user ? (
                <UserAvatar
                  src={user.photoBusiness}
                  firstName={user.fullName.split(' ')[0] ?? 'U'}
                  surname={user.fullName.split(' ').slice(-1)[0] ?? 'N'}
                  size="sm"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={14} className="text-primary" />
                </div>
              )}
              <div className="text-left hidden sm:block max-w-[10rem]">
                <p className="text-[13px] font-semibold text-foreground leading-tight truncate">{user?.fullName ?? 'User'}</p>
                <p className="text-[11px] text-muted-foreground truncate">{getHighestRole(user?.roles ?? []).replace('_', ' ')}</p>
              </div>
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 w-52 bg-card border border-border rounded-xl shadow-lg py-1.5 animate-scale-in">
                  <button
                    onClick={() => { setIsDropdownOpen(false); void navigate('/profile'); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-foreground hover:bg-accent transition-colors"
                  >
                    <User size={14} className="text-muted-foreground" />
                    View Profile
                  </button>
                  <button
                    onClick={() => { setIsDropdownOpen(false); setIsChangePasswordOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-foreground hover:bg-accent transition-colors"
                  >
                    <KeyRound size={14} className="text-muted-foreground" />
                    Change Password
                  </button>
                  <div className="my-1.5 border-t border-border" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut size={14} />
                    Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Clock skew warning — shown when client clock diverges from server beyond threshold */}
        <ClockSkewWarningBanner />

        {/* Content */}
        <main data-testid="page-content" className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20">
          <Outlet />
        </main>
      </div>

      <FloatingWidget startLogout={handleLogout} />
      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
      <OverBreakModal
        isOpen={isLogoutOverbreakOpen}
        breakContext={overbreakBreakContext}
        onConfirm={handleLogoutOverbreakConfirm}
        onCancel={cancelLogoutOverbreak}
      />
      <MoodLogoutModal
        isOpen={isMoodLogoutOpen}
        onClose={closeMoodLogout}
        onConfirm={handleMoodLogoutConfirm}
      />
      <Toaster />
    </div>
  );
}
