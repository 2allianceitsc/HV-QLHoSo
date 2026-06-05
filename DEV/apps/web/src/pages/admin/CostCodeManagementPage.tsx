import { useState } from 'react';
import { useCostCodes, useCreateCostCode, useUpdateCostCode, useDeleteCostCode } from '@/hooks/useCostCode';
import { useHvDepartments } from '@/hooks/useHvAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Tip } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { Pencil, Trash2 } from 'lucide-react';
import type { ICostCode } from '@/api/costCode.api';

interface CostCodeFormValues {
  code: string;
  name: string;
  departmentId: string;
  isActive: boolean;
}

function CostCodeDialog({ code, onClose }: { code?: ICostCode | null; onClose: () => void }) {
  const { data: departments = [] } = useHvDepartments();
  const { mutateAsync: create, isPending: creating } = useCreateCostCode();
  const { mutateAsync: update, isPending: updating } = useUpdateCostCode();
  const { toast } = useToast();

  const { register, handleSubmit, control, formState: { errors } } = useForm<CostCodeFormValues>({
    defaultValues: {
      code: code?.code ?? '',
      name: code?.name ?? '',
      departmentId: code?.departmentId ?? '',
      isActive: code?.isActive ?? true,
    },
  });

  const onSubmit = async (data: CostCodeFormValues) => {
    try {
      if (code) {
        await update({ id: code.id, code: data.code, name: data.name, departmentId: data.departmentId, isActive: data.isActive });
        toast({ title: 'Đã cập nhật mã phí' });
      } else {
        await create({ code: data.code, name: data.name, departmentId: data.departmentId });
        toast({ title: 'Đã thêm mã phí' });
      }
      onClose();
    } catch {
      toast({ title: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{code ? 'Sửa mã phí' : 'Thêm mã phí'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-2 space-y-4">
            <div className="space-y-2">
              <Label>Mã phí <span className="text-destructive">*</span></Label>
              <Input {...register('code', { required: true })} placeholder="VD: IT0001" className={errors.code ? 'border-destructive' : ''} />
            </div>
            <div className="space-y-2">
              <Label>Tên mã phí <span className="text-destructive">*</span></Label>
              <Input {...register('name', { required: true })} className={errors.name ? 'border-destructive' : ''} />
            </div>
            <div className="space-y-2">
              <Label>Bộ phận <span className="text-destructive">*</span></Label>
              <Controller name="departmentId" control={control} rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.departmentId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Chọn bộ phận" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments
                        .filter((d) => !d.isDisabled || d.id === field.value)
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}{d.isDisabled ? ' (vô hiệu)' : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {code && (
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Controller name="isActive" control={control}
                  render={({ field }) => (
                    <Select value={field.value ? 'active' : 'inactive'} onValueChange={(v) => field.onChange(v === 'active')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Hoạt động</SelectItem>
                        <SelectItem value="inactive">Tạm dừng</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={creating || updating}>
              {(creating || updating) ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CostCodeManagementPage() {
  const { data: departments = [] } = useHvDepartments();
  const [filterDept, setFilterDept] = useState('');
  const { data: costCodes = [], isLoading } = useCostCodes(filterDept || undefined);
  const { mutateAsync: remove, isPending: removing } = useDeleteCostCode();
  const { toast } = useToast();
  const [editCode, setEditCode] = useState<ICostCode | null | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<ICostCode | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast({ title: `Đã xóa mã phí "${confirmDelete.code}"` });
      setConfirmDelete(null);
    } catch {
      toast({ title: 'Không thể xóa mã phí này', variant: 'destructive' });
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý mã phí</h1>
        <Button onClick={() => setEditCode(null)}>+ Thêm mã phí</Button>
      </div>

      <div className="w-56">
        <Select value={filterDept || '__all__'} onValueChange={(v) => setFilterDept(v === '__all__' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Tất cả bộ phận" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả bộ phận</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="text-muted-foreground">Đang tải...</div> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã phí</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Bộ phận</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costCodes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm font-medium">{c.code}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.department?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? 'default' : 'secondary'}>
                    {c.isActive ? 'Hoạt động' : 'Tạm dừng'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Tip label="Sửa">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditCode(c)}>
                        <Pencil size={15} />
                      </Button>
                    </Tip>
                    <Tip label="Xóa">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(c)}>
                        <Trash2 size={15} />
                      </Button>
                    </Tip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {costCodes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Không có mã phí nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {editCode !== undefined && <CostCodeDialog code={editCode} onClose={() => setEditCode(undefined)} />}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Xóa mã phí"
        description={`Bạn có chắc muốn xóa mã phí "${confirmDelete?.code} — ${confirmDelete?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        variant="destructive"
        loading={removing}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
