import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { TablePagination } from '@/components/ui/TablePagination';
import { formatDateTimeSeconds } from '@/lib/dateFormat';
import { getLoginOtps } from '@/api/system.api';
import type { ILoginOtpFilter } from '@/api/system.api';
import { usePersistentState } from '@/hooks/usePersistentState';
import { RefreshCw, ShieldAlert } from 'lucide-react';

const DEFAULT_LOGIN_OTP_FILTER: ILoginOtpFilter = { page: 1, limit: 50 };

function getActionLabel(actionType: 'LOGIN_2FA' | 'SETUP_2FA' | 'FORGOT_PASSWORD') {
  if (actionType === 'SETUP_2FA') return 'Setup 2FA';
  if (actionType === 'FORGOT_PASSWORD') return 'Forgot Password';
  return 'Login 2FA';
}

function isIsUsedFilter(value: unknown): value is 'all' | 'false' | 'true' {
  return value === 'all' || value === 'false' || value === 'true';
}

export function LoginOtpPage() {
  const [filter, setFilter] = usePersistentState<ILoginOtpFilter>('vibe365.login-otp.filter', DEFAULT_LOGIN_OTP_FILTER);
  const [emailInput, setEmailInput] = usePersistentState<string>('vibe365.login-otp.email', '');
  const [isUsedFilter, setIsUsedFilter] = usePersistentState<'all' | 'false' | 'true'>(
    'vibe365.login-otp.is-used',
    'all',
    isIsUsedFilter,
  );

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['login-otps', filter],
    queryFn: () => getLoginOtps(filter),
  });

  function applyFilter() {
    setFilter((prev) => ({
      ...prev,
      page: 1,
      email: emailInput || undefined,
      isUsed: isUsedFilter === 'all' ? undefined : isUsedFilter,
    }));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') applyFilter();
  }

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold leading-none">Login OTP (2FA)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            2FA one-time codes issued during login. Visible to SUPER_ADMIN only.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Email</span>
          <Input
            placeholder="Filter by email…"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 w-56 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Status</span>
          <div className="flex rounded-md border border-input overflow-hidden h-8">
            {(['all', 'false', 'true'] as const).map((v) => {
              const tooltipLabels = {
                all: 'Show all OTPs regardless of status',
                false: 'Show only unused OTPs (not yet verified)',
                true: 'Show only OTPs that have already been verified',
              };
              return (
                <Tip key={v} label={tooltipLabels[v]}>
                  <button
                    onClick={() => setIsUsedFilter(v)}
                    className={`px-3 text-xs font-medium transition-colors ${
                      isUsedFilter === v ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {v === 'all' ? 'All' : v === 'false' ? 'Unused' : 'Used'}
                  </button>
                </Tip>
              );
            })}
          </div>
        </div>

        <Tip label="Apply the current filters and reload the table">
          <Button size="sm" className="h-8" onClick={applyFilter}>Search</Button>
        </Tip>
        <Tip label="Reload the table to show newly issued OTPs (e.g. after a user requests a password reset or 2FA code)">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </Tip>

        {pagination && (
          <span className="ml-auto text-xs text-muted-foreground self-end">
            {pagination.total} record{pagination.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2.5 text-left">User</th>
              <th className="px-4 py-2.5 text-left">Email</th>
              <th className="px-4 py-2.5 text-left">Action</th>
              <th className="px-4 py-2.5 text-left font-mono">OTP</th>
              <th className="px-4 py-2.5 text-left">Expires</th>
              <th className="px-4 py-2.5 text-left">Created</th>
              <th className="px-4 py-2.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const expired = new Date(row.expiresAt) < now;
                return (
                  <tr key={row.id} className={`hover:bg-muted/30 transition-colors ${row.isUsed ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium">{row.userLogin?.username ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.userLogin?.email ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {row.actionType === 'FORGOT_PASSWORD' ? (
                        <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-700">{getActionLabel(row.actionType)}</Badge>
                      ) : row.actionType === 'SETUP_2FA' ? (
                        <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-700">{getActionLabel(row.actionType)}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-700">{getActionLabel(row.actionType)}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono tracking-widest font-semibold">{row.otp}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className={expired ? 'text-destructive' : 'text-green-600'}>
                        {formatDateTimeSeconds(row.expiresAt)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTimeSeconds(row.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      {row.isUsed ? (
                        <Badge variant="secondary" className="text-xs">Used</Badge>
                      ) : expired ? (
                        <Badge variant="destructive" className="text-xs">Expired</Badge>
                      ) : (
                        <Badge variant="default" className="text-xs bg-green-600">Active</Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => setFilter((prev) => ({ ...prev, page: p }))}
        />
      )}
    </div>
  );
}
