import { useNavigate, useLocation } from 'react-router-dom';
import { useCreateSubmission, useDeleteSubmission, useSubmission } from '@/hooks/useSubmission';
import { useToast } from '@/hooks/use-toast';
import { SubmissionForm } from '@/components/submission/SubmissionForm';
import { uploadApi } from '@/api/upload.api';
import { submissionApi } from '@/api/submission.api';
import type { ICreateSubmissionInput, ISubmission } from '@/api/submission.api';

async function uploadAttachments(submissionId: string, files: File[], signedContracts: File[]) {
  await Promise.all(files.map((f) => uploadApi.uploadFile(f, 'attachment', submissionId)));
  await Promise.all(signedContracts.map((f) => uploadApi.uploadFile(f, 'signed_contract', submissionId)));
}

export function CreateSubmissionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const cloneFrom = (location.state as { cloneFrom?: ISubmission } | null)?.cloneFrom;
  const { mutateAsync: create, isPending } = useCreateSubmission();
  const { mutateAsync: del } = useDeleteSubmission();
  const { toast } = useToast();

  // Fetch full detail to get complete expenseLines — list API only returns amountIncVat per line.
  const { data: cloneDetail, isLoading: cloneLoading } = useSubmission(cloneFrom?.id ?? '');

  const cloneDefaults: Partial<ISubmission> | undefined = cloneDetail
    ? { ...cloneDetail, submittedDate: new Date().toISOString().slice(0, 10) }
    : undefined;

  const handleSubmit = async (data: ICreateSubmissionInput, files: File[], signedContracts: File[]) => {
    const hasFiles = files.length > 0 || signedContracts.length > 0;
    try {
      // Create as draft first when there are files so we can roll back on upload failure.
      // A pending_review submission cannot be deleted, so we must not commit that status
      // until all files are confirmed uploaded.
      const submission = await create({ ...data, action: hasFiles ? 'draft' : 'submit' });
      if (hasFiles) {
        try {
          await uploadAttachments(submission.id, files, signedContracts);
        } catch (uploadErr) {
          await del(submission.id).catch(() => {});
          throw uploadErr;
        }
        await submissionApi.submit(submission.id);
      }
      toast({ title: 'Đã gửi tờ trình' });
      navigate(`/submissions/${submission.id}`);
    } catch {
      toast({ title: 'Không thể gửi tờ trình', variant: 'destructive' });
    }
  };

  const handleSaveDraft = async (data: ICreateSubmissionInput, files: File[], signedContracts: File[]) => {
    try {
      const submission = await create({ ...data, action: 'draft' });
      if (files.length > 0 || signedContracts.length > 0) {
        try {
          await uploadAttachments(submission.id, files, signedContracts);
        } catch (uploadErr) {
          await del(submission.id).catch(() => {});
          throw uploadErr;
        }
      }
      toast({ title: 'Đã lưu nháp' });
      navigate(`/submissions/${submission.id}`);
    } catch {
      toast({ title: 'Không thể lưu nháp', variant: 'destructive' });
    }
  };

  if (cloneFrom && cloneLoading) {
    return <div className="max-w-3xl mx-auto p-3 sm:p-6 text-sm text-muted-foreground">Đang tải dữ liệu tờ trình gốc…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{cloneFrom ? 'Tạo lại tờ trình' : 'Tạo tờ trình'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {cloneFrom
            ? `Tạo lại từ ${cloneFrom.code} — kiểm tra và chỉnh sửa trước khi gửi.`
            : 'Điền thông tin và gửi tờ trình để phê duyệt.'}
        </p>
      </div>
      <SubmissionForm defaultValues={cloneDefaults} onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} loading={isPending} />
    </div>
  );
}
