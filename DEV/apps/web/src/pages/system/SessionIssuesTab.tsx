import { useState } from 'react';
import { RefreshCw, ShieldOff, CheckCircle2, AlertCircle, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionBlockedUsers, SESSION_BLOCKED_KEY } from '@/hooks/useSystem';
import { useClearSessionBlock } from '@/hooks/useEmployee';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import type { ISessionBlockedUser } from '@/api/system.api';

function ClearBlockButton({ user, onDone }: { user: ISessionBlockedUser; onDone: () => void }) {
  const { toast } = useToast();
  const mutation = useClearSessionBlock(user.staffId ?? user.userId);

  async function handleClear() {
    try {
      await mutation.mutateAsync();
      toast({ title: 'Session block cleared', description: `${user.fullName} can now log in.` });
      onDone();
    } catch {
      toast({ title: 'Failed to clear session block', variant: 'destructive' });
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => void handleClear()}
      disabled={mutation.isPending || !user.staffId}
      title={!user.staffId ? 'No staff record linked — clear via DB' : undefined}
    >
      <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
      {mutation.isPending ? 'Clearing...' : 'Clear Block'}
    </Button>
  );
}

export function SessionIssuesTab() {
  const qc = useQueryClient();
  const { data: users = [], isLoading, isFetching, isError } = useSessionBlockedUsers();
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

  const visible = users.filter((u) => !clearedIds.has(u.userId));

  function handleRefresh() {
    void qc.invalidateQueries({ queryKey: [SESSION_BLOCKED_KEY] });
  }

  function handleDone(userId: string) {
    setClearedIds((prev) => new Set([...prev, userId]));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Users whose session revocation timestamp is in the future — they can log in but are immediately rejected.
            Clearing the block restores access.
          </p>
          {!isLoading && !isError && (
            <p className="text-xs text-muted-foreground">
              {visible.length === 0
                ? 'No blocked users found.'
                : `${visible.length} user${visible.length !== 1 ? 's' : ''} currently blocked`}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Checking for blocked sessions…
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load. Try refreshing.
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-green-300/60 bg-green-50 dark:bg-green-950/20 px-4 py-8 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            No session-blocked users.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Revoked Until</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((user) => (
                <tr key={user.userId} className="bg-red-50/30 dark:bg-red-950/10 hover:brightness-95 transition-all">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-destructive shrink-0" />
                      <span className="font-medium">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{user.username}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <Badge variant="destructive" className="text-xs font-normal">
                        {format(new Date(user.allSessionsRevokedAt), 'yyyy-MM-dd HH:mm:ss')}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(user.allSessionsRevokedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ClearBlockButton user={user} onDone={() => handleDone(user.userId)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
