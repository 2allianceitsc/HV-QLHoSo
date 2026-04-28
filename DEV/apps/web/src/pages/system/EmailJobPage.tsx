import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Zap, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { getEmailJobStatus, triggerEmailJob, toggleEmailJob } from '@/api/email.api';
import { toast } from '@/hooks/use-toast';

const STAT_LABELS: Record<string, string> = {
  pending: 'Pending',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
};

const STAT_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  sending: 'bg-blue-50 border-blue-200 text-blue-700',
  sent: 'bg-green-50 border-green-200 text-green-700',
  failed: 'bg-red-50 border-red-200 text-red-700',
};

export function EmailJobPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['email-job-status'],
    queryFn: getEmailJobStatus,
    refetchInterval: 10_000,
  });

  const triggerMutation = useMutation({
    mutationFn: triggerEmailJob,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['email-job-status'] });
      toast({ title: 'Job triggered — processing queue now' });
    },
    onError: () => {
      toast({ title: 'Failed to trigger job', variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => toggleEmailJob(enabled),
    onSuccess: (_, enabled) => {
      void queryClient.invalidateQueries({ queryKey: ['email-job-status'] });
      toast({ title: enabled ? 'Email job resumed' : 'Email job paused' });
    },
    onError: () => {
      toast({ title: 'Failed to toggle job', variant: 'destructive' });
    },
  });

  const statsOrder = ['pending', 'sending', 'sent', 'failed'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Job</h1>
          <p className="text-sm text-muted-foreground">Background job that processes the outbound email queue</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : data ? (
        <>
          {/* Status + controls */}
          <div className="rounded-lg border border-border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <Badge
                variant={data.enabled ? 'default' : 'destructive'}
                className="text-base px-4 py-1.5 font-semibold pointer-events-none select-none"
              >
                {data.enabled ? 'RUNNING' : 'PAUSED'}
              </Badge>
              <div className="text-sm text-muted-foreground">
                {data.lastRunAt ? (
                  <>
                    Last run: <span className="font-mono text-foreground">
                      {format(new Date(data.lastRunAt), 'dd MMM HH:mm:ss')}
                    </span>
                    {' '}— <span className="font-semibold text-foreground">{data.lastRunCount}</span> email{data.lastRunCount !== 1 ? 's' : ''} processed
                  </>
                ) : (
                  <span>Never run</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              <Button
                size="sm"
                variant="outline"
                disabled={triggerMutation.isPending || !data.enabled}
                onClick={() => triggerMutation.mutate()}
                title={!data.enabled ? 'Resume job first to trigger' : undefined}
              >
                <Zap className="h-4 w-4 mr-1.5" />
                Trigger Now
              </Button>

              {data.enabled ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate(false)}
                >
                  <Pause className="h-4 w-4 mr-1.5" />
                  Pause
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate(true)}
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  Resume
                </Button>
              )}
            </div>
          </div>

          {/* Queue stats cards */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Queue Stats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statsOrder.map((key) => {
                const count = data.stats[key] ?? 0;
                const colorClass = STAT_COLORS[key] ?? 'bg-muted border-border text-foreground';
                return (
                  <div
                    key={key}
                    className={`rounded-lg border p-4 text-center ${colorClass}`}
                  >
                    <p className="text-3xl font-bold">{count}</p>
                    <p className="text-xs font-medium mt-1 uppercase tracking-wide">
                      {STAT_LABELS[key] ?? key}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="py-12 text-center text-muted-foreground">Unable to load job status.</div>
      )}
    </div>
  );
}
