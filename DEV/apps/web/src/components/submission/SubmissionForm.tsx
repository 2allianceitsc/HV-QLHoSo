import { useForm, FormProvider, Controller, type Resolver, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Paperclip, X, FileText, Image, Upload } from 'lucide-react';
import { ExpenseLineTable } from '@/components/submission/ExpenseLineTable';
import { DateInput } from '@/components/ui/DateInput';
import { useSubmissionDepartments } from '@/hooks/useSubmission';
import { useCostCodes } from '@/hooks/useCostCode';
import { usePreviewApproval } from '@/hooks/useApprovalRules';
import { useAuthStore } from '@/stores/auth.store';
import type { ICreateSubmissionInput, ISubmission } from '@/api/submission.api';
import { uploadApi } from '@/api/upload.api';
import { useEffect } from 'react';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const expenseLineSchema = z.object({
  costCodeId: z.string(),
  costCodeName: z.string(),
  amountExVat: z.number().min(0),
  vatRate: z.number().int().min(1).max(100).default(10),
  supplier: z.string().optional(),
  purchasedFor: z.string().optional(),
  purpose: z.string().optional(),
  usedBy: z.string().optional(),
  sortOrder: z.number().optional(),
});

const schema = z.object({
  type: z.enum(['MS', 'NT']),
  departmentId: z.string().min(1, 'Vui lòng chọn bộ phận'),
  costCodeId: z.string().optional(),
  submittedDate: z.string().min(1, 'Bắt buộc'),
  title: z.string().min(1, 'Tiêu đề bắt buộc').max(200),
  content: z.string().optional(),
  supplier: z.string().optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  expenseLines: z.array(expenseLineSchema).optional(),
  existingInventory: z.array(z.any()).optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'MS' && !data.costCodeId) {
    ctx.addIssue({ code: 'custom', path: ['costCodeId'], message: 'Vui lòng chọn loại chi phí' });
  }
  if (data.type === 'NT') {
    if (!data.supplier?.trim()) ctx.addIssue({ code: 'custom', path: ['supplier'], message: 'Bắt buộc' });
    if (!data.contractStartDate) ctx.addIssue({ code: 'custom', path: ['contractStartDate'], message: 'Bắt buộc' });
    if (!data.contractEndDate) ctx.addIssue({ code: 'custom', path: ['contractEndDate'], message: 'Bắt buộc' });
  }
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<ISubmission>;
  onSubmit: (data: ICreateSubmissionInput, files: File[], signedContract: File | null) => void;
  onSaveDraft?: (data: ICreateSubmissionInput, files: File[], signedContract: File | null) => void;
  saveDraftLabel?: string;
  loading?: boolean;
}

export function SubmissionForm({ defaultValues, onSubmit, onSaveDraft, saveDraftLabel = 'Lưu nháp', loading }: Props) {
  const { data: departments = [] } = useSubmissionDepartments();
  const userDepartmentId = useAuthStore((s) => s.user?.departmentId ?? null);

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      type: defaultValues?.type ?? 'MS',
      departmentId: defaultValues?.department?.id ?? userDepartmentId ?? '',
      costCodeId: defaultValues?.costCodeId ?? '',
      submittedDate: defaultValues?.submittedDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      title: defaultValues?.title ?? '',
      content: defaultValues?.content ?? '',
      supplier: defaultValues?.supplier ?? '',
      contractStartDate: defaultValues?.contractStartDate?.slice(0, 10) ?? '',
      contractEndDate: defaultValues?.contractEndDate?.slice(0, 10) ?? '',
      expenseLines: defaultValues?.expenseLines?.map((el) => ({
        costCodeId: el.costCodeId ?? '',
        costCodeName: el.costCodeName ?? '',
        amountExVat: Number(el.amountExVat ?? 0),
        vatRate: el.vatRate ?? 10,
        supplier: el.supplier ?? '',
        purchasedFor: el.purchasedFor ?? '',
        purpose: el.purpose ?? '',
        usedBy: el.usedBy ?? '',
      })) ?? [],
      existingInventory: [],
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = methods;

  const type = watch('type');
  const departmentId = watch('departmentId');
  const costCodeId = watch('costCodeId');
  const expenseLines = watch('expenseLines') ?? [];
  const { data: allCostCodes = [] } = useCostCodes(departmentId || undefined);

  // BA §7.2: changing cost code after lines are entered clears them (with confirm).
  const handleCostCodeChange = (newId: string) => {
    if (costCodeId && newId !== costCodeId && expenseLines.length > 0) {
      const ok = window.confirm('Đổi loại chi phí sẽ xóa các dòng chi phí đang nhập. Tiếp tục?');
      if (!ok) return;
      methods.setValue('expenseLines', []);
    }
    setValue('costCodeId', newId);
  };

  // Workflow preview: re-run when costCode or total changes (MS), or once for NT.
  const { mutate: preview, data: previewResult, isPending: previewing, reset: resetPreview } = usePreviewApproval();
  const totalIncVat = expenseLines.reduce(
    (s, l) => s + Math.round((l.amountExVat ?? 0) * (1 + (l.vatRate ?? 10) / 100)),
    0,
  );

  useEffect(() => {
    if (type === 'NT') {
      preview({ submissionType: 'NT' });
      return;
    }
    if (!costCodeId) { resetPreview(); return; }
    // Exploratory mode (no lines yet): show every threshold branch so user sees all approvers.
    // Once lines exist, send total → server returns the single matching branch per step.
    preview({
      submissionType: 'MS',
      costCodeId,
      ...(expenseLines.length > 0 ? { total: totalIncVat } : {}),
    });
  }, [type, costCodeId, totalIncVat, expenseLines.length, preview, resetPreview]);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [signedContractFile, setSignedContractFile] = useState<File | null>(null);
  const signedContractInputRef = useRef<HTMLInputElement>(null);
  const existingSignedContract = defaultValues?.attachments?.find((a) => a.fileType === 'signed_contract') ?? null;
  const existingAttachments = defaultValues?.attachments?.filter((a) => a.fileType !== 'signed_contract') ?? [];
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<Set<string>>(new Set());
  const visibleExistingAttachments = existingAttachments.filter((a) => !deletedAttachmentIds.has(a.id));

  const handleDeleteExisting = async (id: string) => {
    try {
      await uploadApi.deleteUpload(id);
      setDeletedAttachmentIds((prev) => new Set([...prev, id]));
    } catch {
      alert('Không thể xóa file. Vui lòng thử lại.');
    }
  };

  const handleSignedContractChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { alert('File không được vượt quá 20MB'); return; }
    setSignedContractFile(f);
  };

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setPendingFiles((prev) => {
      const names = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...arr.filter((f) => !names.has(f.name + f.size))];
    });
  };

  const removeFile = (index: number) => setPendingFiles((prev) => prev.filter((_, i) => i !== index));

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const images = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean) as File[];
    if (images.length) addFiles(images);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const buildPayload = (data: FormValues, action: 'submit' | 'draft'): ICreateSubmissionInput => ({
    ...data,
    action,
    content: data.content ?? '',
    expenseLines: data.expenseLines ?? [],
    existingInventory: [],
    contractStartDate: data.contractStartDate || undefined,
    contractEndDate: data.contractEndDate || undefined,
    supplier: data.supplier || undefined,
  });

  const handleFormSubmit = (data: FormValues) => {
    onSubmit(buildPayload(data, 'submit'), pendingFiles, signedContractFile);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">

        {/* Thông tin chung */}
        <section className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Thông tin chung</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Loại tờ trình <span className="text-destructive">*</span></Label>
              <div className="flex rounded-md border overflow-hidden">
                {([['MS', 'Mua sắm'], ['NT', 'Nguyên tắc']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setValue('type', val)}
                    className={cn(
                      'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                      type === val
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Bộ phận <span className="text-destructive">*</span></Label>
              <Select value={departmentId} onValueChange={(v) => setValue('departmentId', v)}>
                <SelectTrigger><SelectValue placeholder="Chọn bộ phận" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Ngày lập <span className="text-destructive">*</span></Label>
              <Controller
                name="submittedDate"
                control={methods.control}
                render={({ field }) => (
                  <DateInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                )}
              />
              {errors.submittedDate && <p className="text-xs text-destructive">{errors.submittedDate.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tiêu đề / Về việc <span className="text-destructive">*</span></Label>
            <Input {...register('title')} placeholder="Nhập tiêu đề tờ trình" autoFocus />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          {type === 'MS' && (
            <div className="space-y-1.5">
              <Label>Loại chi phí <span className="text-destructive">*</span></Label>
              <Select value={costCodeId ?? ''} onValueChange={handleCostCodeChange}>
                <SelectTrigger><SelectValue placeholder="Chọn loại chi phí" /></SelectTrigger>
                <SelectContent>
                  {allCostCodes.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.costCodeId && <p className="text-xs text-destructive">{errors.costCodeId.message}</p>}
            </div>
          )}

          {/* Workflow preview (BA §7.2) */}
          {((type === 'MS' && costCodeId) || type === 'NT') && (
            <div className="border-l-2 border-primary/40 pl-3 py-2 bg-muted/20 text-xs space-y-1">
              {previewing && <span className="text-muted-foreground">Đang dò luồng duyệt...</span>}
              {!previewing && previewResult && previewResult.steps.length > 0 && (() => {
                // Distinct step orders for the "N bước" count (branches share a stepOrder).
                const stepOrders = new Set(previewResult.steps.map((s) => s.stepOrder));
                const fmtMoneyShort = (v: string) => {
                  const n = Number(v);
                  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN')}tr`;
                  if (n >= 1_000) return `${(n / 1_000).toLocaleString('vi-VN')}k`;
                  return n.toLocaleString('vi-VN');
                };
                const thresholdText = (min: string | null, max: string | null) => {
                  if (!min && !max) return '';
                  if (!min) return ` (<${fmtMoneyShort(max!)})`;
                  if (!max) return ` (≥${fmtMoneyShort(min)})`;
                  return ` (${fmtMoneyShort(min)}–${fmtMoneyShort(max)})`;
                };
                const isExploratory = type === 'MS' && expenseLines.length === 0;
                // Build "1, 2, 3.1, 3.2" numbering: each stepOrder gets sub-indices only when it has >1 branch.
                const branchCountByOrder = new Map<number, number>();
                for (const s of previewResult.steps) {
                  branchCountByOrder.set(s.stepOrder, (branchCountByOrder.get(s.stepOrder) ?? 0) + 1);
                }
                const orderRank = new Map<number, number>();
                Array.from(stepOrders).sort((a, b) => a - b).forEach((o, i) => orderRank.set(o, i + 1));
                const seenPerOrder = new Map<number, number>();
                return (
                  <>
                    <div className="font-medium">
                      Luồng duyệt dự kiến ({stepOrders.size} bước):
                    </div>
                    <ul className="ml-5 space-y-0.5">
                      {previewResult.steps.map((s, i) => {
                        const rank = orderRank.get(s.stepOrder)!;
                        const hasBranches = (branchCountByOrder.get(s.stepOrder) ?? 1) > 1;
                        const subIdx = (seenPerOrder.get(s.stepOrder) ?? 0) + 1;
                        seenPerOrder.set(s.stepOrder, subIdx);
                        const num = hasBranches ? `${rank}.${subIdx}` : `${rank}`;
                        return (
                          <li key={`${s.stepOrder}-${i}`} className="flex gap-1.5">
                            <span className="tabular-nums text-muted-foreground shrink-0">{num}.</span>
                            <span>
                              <span className="font-medium">{s.stepLabel ?? (s.stepType === 'REVIEW' ? 'Thẩm định' : 'Phê duyệt')}</span>
                              <span className="text-muted-foreground">{thresholdText(s.minAmount, s.maxAmount)}</span>
                              {' — '}
                              {s.approvers.map((a) => a.name).join(s.mode === 'ALL' ? ' + ' : ' / ')}
                              {s.mode === 'ALL' && ' (tất cả)'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                );
              })()}
              {!previewing && previewResult && previewResult.steps.length === 0 && (
                <span className="text-destructive">Chưa có cấu hình duyệt cho loại chi phí này.</span>
              )}
              {!previewing && !previewResult && type === 'MS' && (
                <span className="text-amber-700">⚠️ Loại chi phí này có thể chưa được cấu hình duyệt — liên hệ admin.</span>
              )}
            </div>
          )}
        </section>

        {/* Nội dung đề xuất */}
        <section className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Nội dung đề xuất</h2>

          <Textarea {...register('content')} onPaste={handlePaste} placeholder="Mô tả chi tiết nội dung tờ trình..." rows={5} />

          <div className="space-y-2">
            <Label>Ảnh đính kèm nội dung</Label>
            <div
              className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Paperclip className="mx-auto mb-1 text-muted-foreground" size={20} />
              <p className="text-sm text-muted-foreground">Kéo thả hoặc nhấn để chọn file — hoặc paste ảnh vào ô nội dung bên trên</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
            />
            {visibleExistingAttachments.length > 0 && (
              <ul className="space-y-1">
                {visibleExistingAttachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm p-2 rounded-md border bg-muted/20">
                    {a.mimeType.startsWith('image/') ? <Image size={14} className="shrink-0 text-blue-500" /> : <FileText size={14} className="shrink-0 text-muted-foreground" />}
                    <a href={a.publicUrl} target="_blank" rel="noreferrer" className="flex-1 truncate text-primary hover:underline">{a.name}</a>
                    <span className="text-xs text-muted-foreground shrink-0">{formatBytes(Number(a.sizeBytes))}</span>
                    <button type="button" onClick={() => handleDeleteExisting(a.id)} className="shrink-0 text-muted-foreground hover:text-destructive"><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            {pendingFiles.length > 0 && (
              <ul className="space-y-1">
                {pendingFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm p-2 rounded-md border bg-muted/20">
                    {f.type.startsWith('image/') ? <Image size={14} className="shrink-0 text-blue-500" /> : <FileText size={14} className="shrink-0 text-muted-foreground" />}
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
                    <button type="button" onClick={() => removeFile(i)} className="shrink-0 text-muted-foreground hover:text-destructive"><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </section>

        {/* Thông tin hợp đồng — chỉ hiện với loại NT */}
        {type === 'NT' && (
          <section className="border rounded-lg p-4 space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Thông tin hợp đồng</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Nhà cung cấp <span className="text-destructive">*</span></Label>
                <Input {...register('supplier')} placeholder="Tên nhà cung cấp" />
                {errors.supplier && <p className="text-xs text-destructive">{errors.supplier.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Ngày bắt đầu HĐ <span className="text-destructive">*</span></Label>
                <Controller
                  name="contractStartDate"
                  control={methods.control}
                  render={({ field }) => (
                    <DateInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                  )}
                />
                {errors.contractStartDate && <p className="text-xs text-destructive">{errors.contractStartDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Ngày kết thúc HĐ <span className="text-destructive">*</span></Label>
                <Controller
                  name="contractEndDate"
                  control={methods.control}
                  render={({ field }) => (
                    <DateInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                  )}
                />
                {errors.contractEndDate && <p className="text-xs text-destructive">{errors.contractEndDate.message}</p>}
              </div>
            </div>
          </section>
        )}

        {/* Hợp đồng đã ký kết — chỉ hiện với loại NT */}
        {type === 'NT' && (
          <section className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Hợp đồng đã ký kết</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => signedContractInputRef.current?.click()}>
                <Upload size={13} className="mr-1.5" /> Tải lên
              </Button>
            </div>
            <input ref={signedContractInputRef} type="file" className="hidden" onChange={handleSignedContractChange} />
            {signedContractFile ? (
              <div className="flex items-center gap-2 text-sm p-2 rounded-md border bg-muted/20">
                <FileText size={14} className="shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{signedContractFile.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatBytes(signedContractFile.size)}</span>
                <button type="button" onClick={() => setSignedContractFile(null)} className="shrink-0 text-muted-foreground hover:text-destructive"><X size={14} /></button>
              </div>
            ) : existingSignedContract ? (
              <div className="flex items-center gap-2 text-sm p-2 rounded-md border bg-muted/20">
                <FileText size={14} className="shrink-0 text-muted-foreground" />
                <a href={existingSignedContract.publicUrl} target="_blank" rel="noreferrer" className="flex-1 truncate text-primary hover:underline">
                  {existingSignedContract.name}
                </a>
                <span className="text-xs text-muted-foreground shrink-0">Đã tải lên</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có file. Nhấn "Tải lên" để đính kèm hợp đồng đã ký.</p>
            )}
          </section>
        )}

        {/* Chi phí — chỉ hiện với loại MS */}
        {type === 'MS' && (
          <section className="border rounded-lg p-4">
            <ExpenseLineTable
              control={methods.control as unknown as Control<ICreateSubmissionInput>}
              departmentId={departmentId || undefined}
              lockedCostCodeId={costCodeId || undefined}
            />
          </section>
        )}

        <div className="flex gap-3 pt-2">
          {onSaveDraft && (
            <Button type="button" variant="outline" disabled={loading}
              onClick={handleSubmit((d) => onSaveDraft(buildPayload(d, 'draft'), pendingFiles, signedContractFile))}>
              {saveDraftLabel}
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Gửi tờ trình'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
