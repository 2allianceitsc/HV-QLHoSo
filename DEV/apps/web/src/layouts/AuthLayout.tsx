import { Outlet } from 'react-router-dom';
import { useBrandingUrl } from '@/hooks/useSystem';

export function AuthLayout() {
  const logoUrl = useBrandingUrl('/api/public/branding/logo');
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-shrink-0 auth-bg flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-48 h-48 rounded-full bg-indigo-400/10 blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="VIBE365" className="h-10 w-10 rounded-xl object-contain shadow-lg bg-white/20" />
            <span className="text-2xl font-extrabold text-white tracking-tight">VIBE365</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
              HR &amp; Attendance<br />
              <span className="text-indigo-300">Reimagined.</span>
            </h2>
            <p className="mt-4 text-indigo-200 text-lg leading-relaxed max-w-sm">
              Real-time status tracking, mood analytics, and team insights — all in one place.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex gap-8">
            {[
              { value: '5 Roles', label: 'Access levels' },
              { value: 'Real-time', label: 'Status updates' },
              { value: '100%', label: 'Audit trail' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-indigo-300 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Company info */}
        <div className="relative z-10">
          <p className="text-sm font-semibold text-white/80 tracking-wide uppercase">
            EZY SERVICE CENTRE CORPORATION
          </p>
          <p className="mt-1 text-xs text-indigo-300/70 leading-relaxed max-w-xs">
            20th Floor Robinsons Equitable Tower ADB Avenue Ortigas Center Pasig City, Philippines 1605
          </p>
        </div>

      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <img src={logoUrl} alt="VIBE365" className="h-9 w-9 rounded-xl object-contain shadow bg-white/20" />
          <span className="text-xl font-extrabold text-foreground">VIBE365</span>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="bg-card rounded-2xl border border-border card-elevated p-8 animate-scale-in">
            <Outlet />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            &copy; {new Date().getFullYear()} VIBE365. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
