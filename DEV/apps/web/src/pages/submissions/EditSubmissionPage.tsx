import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubmissionForm } from '@/components/submission/SubmissionForm';
import { useSubmission, useUpdateSubmission, useSubmitSubmission } from '@/hooks/useSubmission';
import { useToast } from '@/hooks/use-toast';
import { uploadApi } from '@/api/upload.api';
import type { ICreateSubmissionInput } from '@/api/submission.api';

export function EditSubmissionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: submission, isLoading } = useSubmission(id ?? '');
  const { mutateAsync: update, isPending: saving } = useUpdateSubmission(id ?? '');
  const { mutateAsync: submit, isPending: submitting } = useSubmitSubmission();
  const { toast } = useToast();
  const isPending = saving || submitting;

  const uploadFiles = async (files: File[], signedContract: File | null) => {
    await Promise.all(files.map((f) => uploadApi.uploadFile(f, 'attachment', id ?? '')));
    if (signedContract) await uploadApi.uploadFile(signedContract, 'signed_contract', id ?? '');
  };

  const handleSave = async (data: ICreateSubmissionInput, files: File[], signedContract: File | null) => {
    try {
      await update(data);
      await uploadFiles(files, signedContract);
      toast({ title: 'Đã lưu thông tin' });
      navigate(`/submissions/${id}`);
    } catch {
      toast({ title: 'Không thể lưu thông tin', variant: 'destructive' });
    }
  };

  const handleSubmit = async (data: ICreateSubmissionInput, files: File[], signedContract: File | null) => {
    try {
      await update(data);
      await uploadFiles(files, signedContract);
      await submit(id ?? '');
      toast({ title: 'Đã gửi tờ trình để thẩm định' });
      navigate(`/submissions/${id}`);
    } catch {
      toast({ title: 'Không thể gửi tờ trình', variant: 'destructive' });
    }
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;
  if (!submission) return <div className="p-6 text-muted-foreground">Không tìm thấy tờ trình.</div>;
  if (!['draft', 'rejected'].includes(submission.status)) {
    return <div className="p-6 text-muted-foreground">Tờ trình không thể chỉnh sửa ở trạng thái hiện tại.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/submissions/${id}`)}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Sửa tờ trình</h1>
          <p className="text-sm text-muted-foreground font-mono">{submission.code}</p>
        </div>
      </div>
      <SubmissionForm
        defaultValues={submission}
        onSaveDraft={handleSave}
        saveDraftLabel="Lưu thông tin"
        onSubmit={handleSubmit}
        loading={isPending}
      />
    </div>
  );
}
