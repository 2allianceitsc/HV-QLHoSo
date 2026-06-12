import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, Copy, FileText, Trash2, Upload } from 'lucide-react';
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
import { uploadApi } from '@/api/upload.api';
import type { HvRole, ISubmissionApprovalStep } from '@/api/submission.api';

function fullName(s: { firstName: string; middleName?: string | null; surname: string }) {
  return [s.surname, s.middleName, s.firstName].filter(Boolean).join(' ');
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
  const [uploadingContract, setUploadingContract] = useState(false);
  const contractInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !submission) return;
    if (file.size > 20 * 1024 * 1024) { toast({ title: 'File không được vượt quá 20MB', variant: 'destructive' }); return; }
    setUploadingContract(true);
    try {
      await uploadApi.uploadFile(file, 'signed_contract', submission.id);
      await qc.invalidateQueries({ queryKey: ['submissions', submission.id] });
      toast({ title: 'Đã tải lên hợp đồng đã ký' });
    } catch {
      toast({ title: 'Không thể tải lên file', variant: 'destructive' });
    } finally {
      setUploadingContract(false);
    }
  };

  if (isLoading) return <div className="p-3 sm:p-6 text-muted-foreground">Đang tải...</div>;
  if (!submission) return <div className="p-3 sm:p-6 text-muted-foreground">Không tìm thấy tờ trình.</div>;

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
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="sm" className="shrink-0 mt-0.5" onClick={() => navigate('/submissions')}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{submission.code}</span>
            <SubmissionStatusBadge status={submission.status} />
            <div className="ml-auto flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => navigate('/submissions/new', { state: { cloneFrom: submission } })}>
                <Copy size={14} className="mr-1" />
                <span className="hidden xs:inline">Tạo lại</span>
              </Button>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/submissions/${submission.id}/edit`)}>
                  <Pencil size={14} className="mr-1" />
                  <span className="hidden xs:inline">Sửa</span>
                </Button>
              )}
              {canDelete && (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleting}>
                  <Trash2 size={14} className="mr-1" />
                  <span className="hidden xs:inline">Xóa</span>
                </Button>
              )}
            </div>
          </div>
          <h1 className="text-lg sm:text-xl font-semibold mt-0.5 leading-snug">{submission.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-sm border rounded-lg p-3 sm:p-4 bg-muted/20">
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

      {submission.type === 'MS' && (() => {
        const signedContract = submission.attachments?.find((a) => a.fileType === 'signed_contract');
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Hợp đồng đã ký kết</h2>
              <button
                type="button"
                disabled={uploadingContract}
                onClick={() => contractInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Upload size={12} /> {uploadingContract ? 'Đang tải...' : 'Tải lên'}
              </button>
            </div>
            <input ref={contractInputRef} type="file" className="hidden" onChange={handleContractUpload} />
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

      {submission.type === 'MS' && submission.expenseLines && submission.expenseLines.length > 0 && (() => {
        const lines = submission.expenseLines!;
        const hasPurchasedFor = lines.some(l => l.purchasedFor);
        const hasPurpose = lines.some(l => l.purpose);
        const hasUsedBy = lines.some(l => l.usedBy);
        const optionalCols = (hasPurchasedFor ? 1 : 0) + (hasPurpose ? 1 : 0) + (hasUsedBy ? 1 : 0);
        const totalExVat = lines.reduce((s, el) => s + el.amountExVat, 0);
        const totalIncVat = lines.reduce((s, el) => s + el.amountIncVat, 0);
        return (
          <div className="space-y-2">
            <h2 className="font-semibold">Chi tiết chi phí</h2>

            {/* Mobile: card list */}
            <div className="sm:hidden space-y-2">
              {lines.map((el, i) => (
                <div key={el.id} className="border rounded-md p-3 bg-background">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground mr-1.5">{i + 1}.</span>
                      <span className="text-sm font-medium">{el.costCodeName}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums shrink-0">{formatVND(el.amountIncVat)}</span>
                  </div>
                  {el.supplier && (
                    <p className="text-xs text-muted-foreground mb-1.5">{el.supplier}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Chưa VAT: <strong className="text-foreground">{formatVND(el.amountExVat)}</strong></span>
                    <span>VAT {el.vatRate ?? 10}%</span>
                  </div>
                  {(el.purchasedFor || el.purpose || el.usedBy) && (
                    <div className="mt-1.5 pt-1.5 border-t text-xs text-muted-foreground space-y-0.5">
                      {el.purchasedFor && <div><span className="font-medium">Mua cho:</span> {el.purchasedFor}</div>}
                      {el.purpose && <div><span className="font-medium">Mục đích:</span> {el.purpose}</div>}
                      {el.usedBy && <div><span className="font-medium">Người dùng:</span> {el.usedBy}</div>}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap justify-end gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                <span>Tổng chưa VAT: <strong className="text-foreground">{formatVND(totalExVat)}</strong></span>
                <span>Tổng có VAT: <strong className="text-foreground">{formatVND(totalIncVat)}</strong></span>
              </div>
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
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
                    <td className="p-2 text-right">{formatVND(totalExVat)}</td>
                    <td className="p-2 text-right">{formatVND(totalIncVat)}</td>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm border rounded-md p-3">
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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Hợp đồng đã ký kết</h2>
              <button
                type="button"
                disabled={uploadingContract}
                onClick={() => contractInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Upload size={12} /> {uploadingContract ? 'Đang tải...' : 'Tải lên'}
              </button>
            </div>
            <input ref={contractInputRef} type="file" className="hidden" onChange={handleContractUpload} />
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
        <div className="pt-2 border-t">
          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={submitting}>
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
