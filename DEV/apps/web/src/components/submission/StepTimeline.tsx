import { format } from 'date-fns';
import { Check, Clock, RotateCw, SkipForward, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ISubmissionApprovalStep, StepStatus } from '@/api/submission.api';

function fullName(s: { firstName: string; middleName?: string | null; surname: string }) {
  return [s.firstName, s.middleName, s.surname].filter(Boolean).join(' ');
}

const statusIcon: Record<StepStatus, JSX.Element> = {
  pending: <Clock size={14} className="text-muted-foreground" />,
  in_progress: <Clock size={14} className="text-amber-600 animate-pulse" />,
  approved: <Check size={14} className="text-green-600" />,
  rejected: <X size={14} className="text-destructive" />,
  skipped: <SkipForward size={14} className="text-muted-foreground" />,
};

const statusLabel: Record<StepStatus, string> = {
  pending: 'Chờ',
  in_progress: 'Đang xử lý',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  skipped: 'Bỏ qua',
};

interface Props {
  steps: ISubmissionApprovalStep[];
  currentStaffId: string | null;
  isAdmin: boolean;
  onApprove: (step: ISubmissionApprovalStep) => void;
  onReject: (step: ISubmissionApprovalStep) => void;
  onReassign: (step: ISubmissionApprovalStep) => void;
}

export function StepTimeline({ steps, currentStaffId, isAdmin, onApprove, onReject, onReassign }: Props) {
  if (!steps.length) {
    return <p className="text-sm text-muted-foreground italic">Tờ trình chưa được gửi đi duyệt.</p>;
  }

  // Group by stepOrder for visual grouping (multi-approver per step).
  const grouped: Record<number, ISubmissionApprovalStep[]> = {};
  for (const s of steps) (grouped[s.stepOrder] ??= []).push(s);
  const orders = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <ol className="space-y-3">
      {orders.map((order) => {
        const group = grouped[order];
        const first = group[0];
        return (
          <li key={order} className="border rounded-md p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs text-muted-foreground">Bước {order}</span>
              <span className="font-medium text-sm">
                {first.stepLabel ?? (first.stepType === 'REVIEW' ? 'Thẩm định' : 'Phê duyệt')}
              </span>
              {first.mode === 'ALL' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">ALL</span>
              )}
            </div>
            <ul className="space-y-1.5">
              {group.map((s) => {
                const isYou = currentStaffId === s.approverId;
                const canDecide = isYou && s.status === 'in_progress';
                const canReassign = isAdmin && (s.status === 'in_progress' || s.status === 'pending');
                const reassigned = !!s.reassignedAt;
                return (
                  <li key={s.id} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 mt-0.5">{statusIcon[s.status]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{fullName(s.approver)}</span>
                        {isYou && <span className="text-xs px-1 py-0.5 rounded bg-primary/10 text-primary">Bạn</span>}
                        {reassigned && (
                          <span
                            className="text-xs px-1 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200"
                            title={s.reassignReason ?? ''}
                          >
                            ⚠️ chuyển từ {fullName(s.originalApprover)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">— {statusLabel[s.status]}</span>
                        {s.decidedAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(s.decidedAt), 'dd/MM HH:mm')}
                          </span>
                        )}
                      </div>
                      {s.comment && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">"{s.comment}"</p>
                      )}
                      {(canDecide || canReassign) && (
                        <div className="flex gap-2 mt-1.5">
                          {canDecide && (
                            <>
                              <Button size="sm" onClick={() => onApprove(s)}>
                                <Check size={12} className="mr-1" /> Duyệt
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => onReject(s)}>
                                <X size={12} className="mr-1" /> Từ chối
                              </Button>
                            </>
                          )}
                          {canReassign && (
                            <Button size="sm" variant="outline" onClick={() => onReassign(s)}>
                              <RotateCw size={12} className="mr-1" /> Đổi người duyệt
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
