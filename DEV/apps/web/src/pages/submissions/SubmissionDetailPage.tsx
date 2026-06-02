import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, Copy, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubmissionStatusBadge } from '@/components/submission/SubmissionStatusBadge';
import { StepTimeline } from '@/components/submission/StepTimeline';
import { RejectDialog } from '@/components/submission/RejectDialog';
import { ReassignDialog } from '@/components/submission/ReassignDialog';
import {
  useSubmission,
  useSubmitSubmission,
  useApproveStep,
  useRejectStep,
  useReassignStep,
  useDeleteSubmission,
} from '@/hooks/useSubmission';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/hooks/use-toast';
import type { HvRole, ISubmissionApprovalStep } from '@/api/submission.api';

function fullName(s: { firstName: string; middleName?: string | null; surname: string }) {
  return [s.firstName, s.middleName, s.surname].filter(Boolean).join(' ');
}

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: submission, isLoading } = useSubmission(id ?? '');
  const currentUser = useAuthStore((s) => s.user);
  const hvRoles = (currentUser?.hvRoles ?? ['staff']) as HvRole[];
  const { toast } = useToast();

  const { mutateAsync: submit, isPending: submitting } = useSubmitSubmission();
  const { mutateAsync: approveStep } = useApproveStep();
  const { mutateAsync: rejectStep, isPending: rejecting } = useRejectStep();
  const { mutateAsync: reassignStep, isPending: reassigning } = useReassignStep();
  const { mutateAsync: del, isPending: deleting } = useDeleteSubmission();

  const [rejectStepTarget, setRejectStepTarget] = useState<ISubmissionApprovalStep | null>(null);
  const [reassignStepTarget, setReassignStepTarget] = useState<ISubmissionApprovalStep | null>(null);

  if (isLoading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;
  if (!submission) return <div className="p-6 text-muted-foreground">Không tìm thấy tờ trình.</div>;

  const isOwner = currentUser?.staffId === submission.submitter.id;
  const isAdmin = hvRoles.includes('admin');
  const canEdit = isOwner && submission.status === 'draft';
  const canSubmit = isOwner && submission.status === 'draft';
  const canDelete = isOwner && submission.status === 'draft';

  const handleSubmit = async () => {
    try {
      await submit(submission.id);
      toast({ title: 'Đã gửi tờ trình' });
    } catch {
      toast({ title: 'Không thể gửi tờ trình', variant: 'destructive' });
    }
  };

  const handleApproveStep = async (step: ISubmissionApprovalStep) => {
    try {
      await approveStep({ id: submission.id, stepId: step.id });
      toast({ title: 'Đã duyệt bước này' });
    } catch {
      toast({ title: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  const handleRejectStepSubmit = async (reason: string) => {
    if (!rejectStepTarget) return;
    try {
      await rejectStep({ id: submission.id, stepId: rejectStepTarget.id, comment: reason });
      toast({ title: 'Đã từ chối tờ trình' });
      setRejectStepTarget(null);
    } catch {
      toast({ title: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  const handleReassignSubmit = async (newApproverId: string, reason: string) => {
    if (!reassignStepTarget) return;
    try {
      await reassignStep({
        id: submission.id,
        stepId: reassignStepTarget.id,
        newApproverId,
        reason,
      });
      toast({ title: 'Đã đổi người duyệt' });
      setReassignStepTarget(null);
    } catch {
      toast({ title: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Xóa tờ trình này? Hành động không thể hoàn tác.')) return;
    try {
      await del(submission.id);
      toast({ title: 'Đã xóa tờ trình' });
      navigate('/submissions');
    } catch {
      toast({ title: 'Không thể xóa tờ trình', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/submissions')}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">{submission.code}</span>
            <SubmissionStatusBadge status={submission.status} />
          </div>
          <h1 className="text-xl font-semibold mt-0.5">{submission.title}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/submissions/new', { state: { cloneFrom: submission } })}>
          <Copy size={14} className="mr-1" /> Tạo lại
        </Button>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => navigate(`/submissions/${submission.id}/edit`)}>
            <Pencil size={14} className="mr-1" /> Sửa
          </Button>
        )}
        {canDelete && (
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 size={14} className="mr-1" /> Xóa
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border rounded-lg p-4 bg-muted/20">
        <div><span className="text-muted-foreground block">Loại</span><strong>{submission.type}</strong></div>
        <div><span className="text-muted-foreground block">Bộ phận</span><strong>{submission.department.name}</strong></div>
        <div><span className="text-muted-foreground block">Ngày lập</span><strong>{format(new Date(submission.submittedDate), 'dd/MM/yyyy')}</strong></div>
        <div><span className="text-muted-foreground block">Người lập</span><strong>{fullName(submission.submitter)}</strong></div>
        {submission.costCode && (
          <div><span className="text-muted-foreground block">Loại chi phí</span><strong>{submission.costCode.code} - {submission.costCode.name}</strong></div>
        )}
        {submission.approvedAt && <div><span className="text-muted-foreground block">Ngày phê duyệt</span><strong>{format(new Date(submission.approvedAt), 'dd/MM/yyyy HH:mm')}</strong></div>}
      </div>

      {submission.status === 'rejected' && submission.rejectionReason && (
        <div className="border border-destructive/40 rounded-md p-3 bg-destructive/5">
          <p className="text-sm font-medium text-destructive mb-1">Lý do từ chối</p>
          <p className="text-sm">{submission.rejectionReason}</p>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold">Nội dung</h2>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground border rounded-md p-3">
          {submission.content?.trim() || <em>Chưa có nội dung</em>}
        </p>
        {(() => {
          const contentAttachments = (submission.attachments ?? []).filter((a) => a.fileType !== 'signed_contract');
          if (!contentAttachments.length) return null;
          return (
            <ul className="space-y-1 mt-2">
              {contentAttachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {a.mimeType.startsWith('image/') ? (
                      <img src={a.publicUrl} alt={a.name} className="h-5 w-5 rounded object-cover border shrink-0" />
                    ) : (
                      <FileText size={14} className="shrink-0 text-muted-foreground" />
                    )}
                    {a.name}
                  </a>
                </li>
              ))}
            </ul>
          );
        })()}
      </div>

      {submission.type === 'MS' && submission.expenseLines && submission.expenseLines.length > 0 && (() => {
        const lines = submission.expenseLines!;
        const hasPurchasedFor = lines.some(l => l.purchasedFor);
        const hasPurpose = lines.some(l => l.purpose);
        const hasUsedBy = lines.some(l => l.usedBy);
        const optionalCols = (hasPurchasedFor ? 1 : 0) + (hasPurpose ? 1 : 0) + (hasUsedBy ? 1 : 0);
        return (
          <div className="space-y-2">
            <h2 className="font-semibold">Chi tiết chi phí</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Mã phí</th>
                    <th className="text-right p-2">VAT%</th>
                    <th className="text-right p-2">Chưa VAT</th>
                    <th className="text-right p-2">Đã VAT</th>
                    <th className="text-left p-2">Nhà cung cấp</th>
                    {hasPurchasedFor && <th className="text-left p-2">Mua cho</th>}
                    {hasPurpose && <th className="text-left p-2">Mục đích</th>}
                    {hasUsedBy && <th className="text-left p-2">Người dùng</th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((el, i) => (
                    <tr key={el.id} className="border-b">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2">{el.costCodeName}</td>
                      <td className="p-2 text-right">{el.vatRate ?? 10}%</td>
                      <td className="p-2 text-right">{formatVND(el.amountExVat)}</td>
                      <td className="p-2 text-right">{formatVND(el.amountIncVat)}</td>
                      <td className="p-2">{el.supplier || '—'}</td>
                      {hasPurchasedFor && <td className="p-2">{el.purchasedFor || '—'}</td>}
                      {hasPurpose && <td className="p-2">{el.purpose || '—'}</td>}
                      {hasUsedBy && <td className="p-2">{el.usedBy || '—'}</td>}
                    </tr>
                  ))}
                  <tr className="font-semibold bg-muted/20">
                    <td colSpan={3} className="p-2 text-right">Tổng</td>
                    <td className="p-2 text-right">{formatVND(lines.reduce((s, el) => s + el.amountExVat, 0))}</td>
                    <td className="p-2 text-right">{formatVND(lines.reduce((s, el) => s + el.amountIncVat, 0))}</td>
                    <td colSpan={1 + optionalCols} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {submission.type === 'NT' && (submission.supplier || submission.contractStartDate) && (
        <div className="space-y-2">
          <h2 className="font-semibold">Thông tin hợp đồng</h2>
          <div className="grid grid-cols-3 gap-4 text-sm border rounded-md p-3">
            {submission.supplier && <div><span className="text-muted-foreground block">Nhà cung cấp</span>{submission.supplier}</div>}
            {submission.contractStartDate && <div><span className="text-muted-foreground block">Từ ngày</span>{format(new Date(submission.contractStartDate), 'dd/MM/yyyy')}</div>}
            {submission.contractEndDate && <div><span className="text-muted-foreground block">Đến ngày</span>{format(new Date(submission.contractEndDate), 'dd/MM/yyyy')}</div>}
          </div>
        </div>
      )}

      {submission.type === 'NT' && (() => {
        const signedContract = submission.attachments?.find((a) => a.fileType === 'signed_contract');
        return (
          <div className="space-y-2">
            <h2 className="font-semibold">Hợp đồng đã ký kết</h2>
            <div className="border rounded-md p-3">
              {signedContract ? (
                <a href={signedContract.publicUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <FileText size={14} className="shrink-0" />
                  {signedContract.name}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có hợp đồng đã ký.</p>
              )}
            </div>
          </div>
        );
      })()}

      <div className="space-y-2">
        <h2 className="font-semibold">Tiến trình phê duyệt</h2>
        <StepTimeline
          steps={submission.approvalSteps ?? []}
          currentStaffId={currentUser?.staffId ?? null}
          isAdmin={isAdmin}
          onApprove={handleApproveStep}
          onReject={(s) => setRejectStepTarget(s)}
          onReassign={(s) => setReassignStepTarget(s)}
        />
      </div>

      {canSubmit && (
        <div className="flex gap-3 pt-2 border-t">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Đang gửi...' : 'Gửi tờ trình'}
          </Button>
        </div>
      )}

      <RejectDialog
        open={!!rejectStepTarget}
        onClose={() => setRejectStepTarget(null)}
        onConfirm={handleRejectStepSubmit}
        loading={rejecting}
      />
      {reassignStepTarget && (
        <ReassignDialog
          open
          currentApproverId={reassignStepTarget.approverId}
          currentApproverName={fullName(reassignStepTarget.approver)}
          onClose={() => setReassignStepTarget(null)}
          onConfirm={handleReassignSubmit}
          loading={reassigning}
        />
      )}
    </div>
  );
}
