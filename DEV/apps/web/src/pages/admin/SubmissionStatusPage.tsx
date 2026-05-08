import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionStatusApi, type ISubmissionStatus } from '@/api/submissionStatus.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDateTimeSeconds } from '@/lib/dateFormat';

const CORE_CODES = new Set(['draft', 'pending_review', 'in_review', 'approved', 'rejected']);

interface EditState {
  label: string;
  colorHex: string;
}

interface AddForm {
  code: string;
  label: string;
  colorHex: string;
  orderNo: string;
}

export function SubmissionStatusPage() {
  const queryClient = useQueryClient();
  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ['submission-statuses'],
    queryFn: submissionStatusApi.list,
  });

  const [editing, setEditing] = useState<Record<string, EditState>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>({ code: '', label: '', colorHex: '#6b7280', orderNo: '' });

  const { mutateAsync: update, isPending: updating } = useMutation({
    mutationFn: ({ code, data }: { code: string; data: EditState }) =>
      submissionStatusApi.update(code, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['submission-statuses'] });
      toast({ title: 'Đã lưu trạng thái' });
    },
    onError: () => toast({ title: 'Lưu thất bại', variant: 'destructive' }),
  });

  const { mutateAsync: create, isPending: creating } = useMutation({
    mutationFn: submissionStatusApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['submission-statuses'] });
      void queryClient.invalidateQueries({ queryKey: ['submission-status-catalog'] });
      toast({ title: 'Đã thêm trạng thái' });
      setAddOpen(false);
      setAddForm({ code: '', label: '', colorHex: '#6b7280', orderNo: '' });
    },
    onError: (e: Error) => toast({ title: e?.message ?? 'Thêm thất bại', variant: 'destructive' }),
  });

  const { mutateAsync: remove, isPending: removing } = useMutation({
    mutationFn: submissionStatusApi.remove,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['submission-statuses'] });
      void queryClient.invalidateQueries({ queryKey: ['submission-status-catalog'] });
      setConfirmDelete(null);
      toast({ title: 'Đã xóa trạng thái' });
    },
    onError: () => toast({ title: 'Xóa thất bại', variant: 'destructive' }),
  });

  function startEdit(s: ISubmissionStatus) {
    setEditing((prev) => ({ ...prev, [s.code]: { label: s.label, colorHex: s.colorHex } }));
  }

  function cancelEdit(code: string) {
    setEditing((prev) => { const next = { ...prev }; delete next[code]; return next; });
  }

  async function saveEdit(code: string) {
    const state = editing[code];
    if (!state) return;
    await update({ code, data: state });
    cancelEdit(code);
  }

  function setField(code: string, field: keyof EditState, value: string) {
    setEditing((prev) => ({ ...prev, [code]: { ...prev[code], [field]: value } }));
  }

  async function handleCreate() {
    await create({
      code: addForm.code.trim(),
      label: addForm.label.trim(),
      colorHex: addForm.colorHex,
      orderNo: addForm.orderNo ? parseInt(addForm.orderNo) : undefined,
    });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Danh mục trạng thái</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cấu hình nhãn và màu hiển thị cho từng trạng thái tờ trình. Mã trạng thái không thể thay đổi.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={15} className="mr-1.5" /> Thêm trạng thái
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8">Đang tải...</div>
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Mã trạng thái</TableHead>
                <TableHead>Nhãn hiển thị</TableHead>
                <TableHead className="w-36">Màu sắc</TableHead>
                <TableHead className="w-20 text-center">Thứ tự</TableHead>
                <TableHead className="w-48">Cập nhật lần cuối</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses.map((s) => {
                const isEdit = !!editing[s.code];
                const isDeleting = confirmDelete === s.code;
                const state = editing[s.code];
                const isCore = CORE_CODES.has(s.code);
                return (
                  <TableRow key={s.code}>
                    <TableCell>
                      <span className="font-mono text-sm text-muted-foreground">{s.code}</span>
                    </TableCell>
                    <TableCell>
                      {isEdit ? (
                        <Input
                          value={state.label}
                          onChange={(e) => setField(s.code, 'label', e.target.value)}
                          className="h-8 max-w-xs"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: s.colorHex }}
                        >
                          {s.label}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEdit ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={state.colorHex}
                            onChange={(e) => setField(s.code, 'colorHex', e.target.value)}
                            className="h-8 w-10 cursor-pointer rounded border border-input p-0.5 bg-background"
                          />
                          <Input
                            value={state.colorHex}
                            onChange={(e) => setField(s.code, 'colorHex', e.target.value)}
                            className="h-8 w-24 font-mono text-xs"
                            maxLength={7}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-5 w-5 rounded border border-border"
                            style={{ backgroundColor: s.colorHex }}
                          />
                          <span className="font-mono text-xs text-muted-foreground">{s.colorHex}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{s.orderNo}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {s.logUpdatedAt ? formatDateTimeSeconds(s.logUpdatedAt) : '—'}
                    </TableCell>
                    <TableCell>
                      {isEdit ? (
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" disabled={updating} onClick={() => void saveEdit(s.code)}>
                            <Check size={15} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => cancelEdit(s.code)}>
                            <X size={15} />
                          </Button>
                        </div>
                      ) : isDeleting ? (
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" disabled={removing} onClick={() => void remove(s.code)}>
                            <Check size={15} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setConfirmDelete(null)}>
                            <X size={15} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(s)}>
                            <Pencil size={15} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={isCore}
                            title={isCore ? 'Trạng thái hệ thống không thể xóa' : 'Xóa trạng thái'}
                            onClick={() => setConfirmDelete(s.code)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm trạng thái</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Mã trạng thái <span className="text-destructive">*</span></label>
              <Input
                placeholder="vd: awaiting_docs"
                value={addForm.code}
                onChange={(e) => setAddForm((p) => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') }))}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Chỉ chữ thường và dấu gạch dưới. Không thể thay đổi sau khi tạo.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nhãn hiển thị <span className="text-destructive">*</span></label>
              <Input
                placeholder="vd: Chờ tài liệu"
                value={addForm.label}
                onChange={(e) => setAddForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Màu sắc</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={addForm.colorHex}
                  onChange={(e) => setAddForm((p) => ({ ...p, colorHex: e.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded border border-input p-0.5 bg-background"
                />
                <Input
                  value={addForm.colorHex}
                  onChange={(e) => setAddForm((p) => ({ ...p, colorHex: e.target.value }))}
                  className="h-8 w-28 font-mono text-xs"
                  maxLength={7}
                />
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: addForm.colorHex }}
                >
                  {addForm.label || 'Xem trước'}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Thứ tự</label>
              <Input
                type="number"
                placeholder="99"
                value={addForm.orderNo}
                onChange={(e) => setAddForm((p) => ({ ...p, orderNo: e.target.value }))}
                className="w-24"
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Hủy</Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={creating || !addForm.code.trim() || !addForm.label.trim()}
            >
              {creating ? 'Đang thêm...' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
