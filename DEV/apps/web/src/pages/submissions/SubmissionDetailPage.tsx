import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, Copy, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubmissionStatusBadge } from '@/components/submission/SubmissionStatusBadge';
import { WorkflowTimeline } from '@/components/submission/WorkflowTimeline';
import { RejectDialog } from '@/components/submission/RejectDialog';
import { useSubmission, useSubmitSubmission, useReviewSubmission, useApproveSubmission, useRejectSubmission } from '@/hooks/useSubmission';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/hooks/use-toast';
import type { HvRole } from '@/api/submission.api';

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
  const hvRole = (currentUser?.hvRole ?? 'staff') as HvRole;
  const { toast } = useToast();

  const { mutateAsync: submit, isPending: submitting } = useSubmitSubmission();
  const { mutateAsync: review, isPending: reviewing } = useReviewSubmission();
  const { mutateAsync: approve, isPending: approving } = useApproveSubmission();
  const { mutateAsync: reject, isPending: rejecting } = useRejectSubmission();

  const [rejectOpen, setRejectOpen] = useState(false);

  if (isLoading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;
  if (!submission) return <div className="p-6 text-muted-foreground">Không tìm thấy tờ trình.</div>;

  const isOwner = currentUser?.staffId === submission.submitter.id;
  const canEdit = isOwner && ['draft', 'rejected'].includes(submission.status);
  const canSubmit = isOwner && ['draft', 'rejected'].includes(submission.status);
  const canReview = (hvRole === 'reviewer' || hvRole === 'admin') && submission.status === 'pending_review';
  const canApprove = (hvRole === 'approver' || hvRole === 'admin') && submission.status === 'in_review';
  const canReject = (canReview || canApprove);

  const handleSubmit = async () => {
    try {
      await submit(submission.id);
      toast({ title: 'Đã gửi tờ trình để thẩm định' });
    } catch {
      toast({ title: 'Không thể gửi tờ trình', variant: 'destructive' });
    }
  };

  const handleReview = async () => {
    try {
      await review(submission.id);
      toast({ title: 'Đã nhận thẩm định tờ trình' });
    } catch {
      toast({ title: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  const handleApprove = async () => {
    try {
      await approve(submission.id);
      toast({ title: 'Đã phê duyệt tờ trình' });
    } catch {
      toast({ title: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await reject({ id: submission.id, reason });
      toast({ title: 'Đã từ chối tờ trình' });
      setRejectOpen(false);
    } catch {
      toast({ title: 'Có lỗi xảy ra', variant: 'destructive' });
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border rounded-lg p-4 bg-muted/20">
        <div><span className="text-muted-foreground block">Loại</span><strong>{submission.type}</strong></div>
        <div><span className="text-muted-foreground block">Bộ phận</span><strong>{submission.department.name}</strong></div>
        <div><span className="text-muted-foreground block">Ngày lập</span><strong>{format(new Date(submission.submittedDate), 'dd/MM/yyyy')}</strong></div>
        <div><span className="text-muted-foreground block">Người lập</span><strong>{fullName(submission.submitter)}</strong></div>
        <div><span className="text-muted-foreground block">Người thẩm định</span><strong>{fullName(submission.reviewer)}</strong></div>
        <div><span className="text-muted-foreground block">Người phê duyệt</span><strong>{fullName(submission.approver)}</strong></div>
        {submission.reviewedAt && <div><span className="text-muted-foreground block">Ngày thẩm định</span><strong>{format(new Date(submission.reviewedAt), 'dd/MM/yyyy HH:mm')}</strong></div>}
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
        <WorkflowTimeline logs={submission.logs ?? []} />
      </div>

      {(canSubmit || canReview || canApprove || canReject) && (
        <div className="flex gap-3 pt-2 border-t">
          {canSubmit && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi tờ trình'}
            </Button>
          )}
          {canReview && (
            <Button onClick={handleReview} disabled={reviewing}>
              {reviewing ? 'Đang thẩm định...' : 'Thẩm định'}
            </Button>
          )}
          {canApprove && (
            <Button onClick={handleApprove} disabled={approving}>
              {approving ? 'Đang phê duyệt...' : 'Phê duyệt'}
            </Button>
          )}
          {canReject && (
            <Button variant="destructive" onClick={() => setRejectOpen(true)}>Từ chối</Button>
          )}
        </div>
      )}

      <RejectDialog open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={handleReject} loading={rejecting} />
    </div>
  );
}
