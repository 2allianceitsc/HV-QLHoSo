import { useNavigate, useLocation } from 'react-router-dom';
import { useCreateSubmission } from '@/hooks/useSubmission';
import { useToast } from '@/hooks/use-toast';
import { SubmissionForm } from '@/components/submission/SubmissionForm';
import { uploadApi } from '@/api/upload.api';
import type { ICreateSubmissionInput, ISubmission } from '@/api/submission.api';

async function uploadAttachments(submissionId: string, files: File[], signedContract: File | null) {
  await Promise.all(files.map((f) => uploadApi.uploadFile(f, 'attachment', submissionId)));
  if (signedContract) await uploadApi.uploadFile(signedContract, 'signed_contract', submissionId);
}

export function CreateSubmissionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const cloneFrom = (location.state as { cloneFrom?: ISubmission } | null)?.cloneFrom;
  const { mutateAsync: create, isPending } = useCreateSubmission();
  const { toast } = useToast();

  const cloneDefaults: Partial<ISubmission> | undefined = cloneFrom
    ? { ...cloneFrom, submittedDate: new Date().toISOString().slice(0, 10) }
    : undefined;

  const handleSubmit = async (data: ICreateSubmissionInput, files: File[], signedContract: File | null) => {
    try {
      const submission = await create({ ...data, action: 'submit' });
      await uploadAttachments(submission.id, files, signedContract);
      toast({ title: 'Đã gửi tờ trình' });
      navigate(`/submissions/${submission.id}`);
    } catch {
      toast({ title: 'Không thể gửi tờ trình', variant: 'destructive' });
    }
  };

  const handleSaveDraft = async (data: ICreateSubmissionInput, files: File[], signedContract: File | null) => {
    try {
      const submission = await create({ ...data, action: 'draft' });
      await uploadAttachments(submission.id, files, signedContract);
      toast({ title: 'Đã lưu nháp' });
      navigate(`/submissions/${submission.id}`);
    } catch {
      toast({ title: 'Không thể lưu nháp', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
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
