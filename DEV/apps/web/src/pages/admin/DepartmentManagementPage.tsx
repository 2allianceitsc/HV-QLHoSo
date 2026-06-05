import { useState } from 'react';
import { useHvDepartments, useCreateHvDepartment, useUpdateHvDepartment, useDeleteHvDepartment, useToggleHvDepartmentDisabled } from '@/hooks/useHvAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Tip } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, EyeOff, Eye } from 'lucide-react';
import type { IHvDepartment } from '@/api/hvAdmin.api';

function DeptDialog({ dept, onClose }: { dept?: IHvDepartment | null; onClose: () => void }) {
  const { mutateAsync: create, isPending: creating } = useCreateHvDepartment();
  const { mutateAsync: update, isPending: updating } = useUpdateHvDepartment();
  const { toast } = useToast();
  const [name, setName] = useState(dept?.name ?? '');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (dept) {
        await update({ id: dept.id, name: name.trim() });
        toast({ title: 'Đã cập nhật bộ phận' });
      } else {
        await create(name.trim());
        toast({ title: 'Đã thêm bộ phận' });
      }
      onClose();
    } catch {
      toast({ title: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{dept ? 'Sửa bộ phận' : 'Thêm bộ phận'}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="px-6 py-2">
            <Input
              placeholder="Tên bộ phận"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={creating || updating || !name.trim()}>
              {(creating || updating) ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DepartmentManagementPage() {
  const { data: departments = [], isLoading } = useHvDepartments();
  const { mutateAsync: deleteDept, isPending: deleting } = useDeleteHvDepartment();
  const { mutateAsync: toggleDisabled } = useToggleHvDepartmentDisabled();
  const { toast } = useToast();
  const [editDept, setEditDept] = useState<IHvDepartment | null | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<IHvDepartment | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDept(confirmDelete.id);
      toast({ title: `Đã xóa bộ phận "${confirmDelete.name}"` });
      setConfirmDelete(null);
    } catch {
      toast({ title: 'Không thể xóa bộ phận này', variant: 'destructive' });
      setConfirmDelete(null);
    }
  };

  const handleToggleDisabled = async (d: IHvDepartment) => {
    try {
      await toggleDisabled({ id: d.id, isDisabled: !d.isDisabled });
      toast({ title: d.isDisabled ? `Đã kích hoạt bộ phận "${d.name}"` : `Đã vô hiệu hóa bộ phận "${d.name}"` });
    } catch {
      toast({ title: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý bộ phận</h1>
        <Button onClick={() => setEditDept(null)}>+ Thêm bộ phận</Button>
      </div>

      {isLoading ? <div className="text-muted-foreground">Đang tải...</div> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên bộ phận</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((d) => (
              <TableRow key={d.id} className={d.isDisabled ? 'opacity-60' : ''}>
                <TableCell>{d.name}</TableCell>
                <TableCell>
                  {d.isDisabled
                    ? <Badge variant="secondary">Vô hiệu</Badge>
                    : <Badge variant="outline" className="text-green-600 border-green-300">Hoạt động</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Tip label={d.isDisabled ? 'Kích hoạt' : 'Vô hiệu hóa'}>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleToggleDisabled(d)}>
                        {d.isDisabled ? <Eye size={15} className="text-green-600" /> : <EyeOff size={15} className="text-amber-600" />}
                      </Button>
                    </Tip>
                    <Tip label="Sửa">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditDept(d)}>
                        <Pencil size={15} />
                      </Button>
                    </Tip>
                    <Tip label="Xóa">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(d)}>
                        <Trash2 size={15} />
                      </Button>
                    </Tip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editDept !== undefined && <DeptDialog dept={editDept} onClose={() => setEditDept(undefined)} />}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Xóa bộ phận"
        description={`Bạn có chắc muốn xóa bộ phận "${confirmDelete?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
