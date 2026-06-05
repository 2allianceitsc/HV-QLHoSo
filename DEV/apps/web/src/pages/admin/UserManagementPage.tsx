import { useState } from 'react';
import { useHvUsers, useCreateHvUser, useUpdateHvUser, useDeleteHvUser, useResetHvUserPassword, useHvDepartments, useToggleHvUserActive } from '@/hooks/useHvAdmin';
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
import { Pencil, KeyRound, Trash2, Search, UserX, UserCheck } from 'lucide-react';
import type { IHvUser, HvRole } from '@/api/hvAdmin.api';

const ROLE_LABELS: Record<HvRole, string> = {
  staff: 'Nhân viên', reviewer: 'Thẩm định', approver: 'Phê duyệt', admin: 'Quản trị',
};

const HV_ROLES: HvRole[] = ['staff', 'reviewer', 'approver', 'admin'];

interface UserFormValues {
  username: string; email: string; firstName: string; middleName?: string;
  surname: string; departmentId: string; hvRoles: HvRole[];
}

function UserDialog({ user, onClose }: { user?: IHvUser | null; onClose: () => void }) {
  const { data: departments = [] } = useHvDepartments();
  const { mutateAsync: create, isPending: creating } = useCreateHvUser();
  const { mutateAsync: update, isPending: updating } = useUpdateHvUser();
  const { toast } = useToast();

  const { register, handleSubmit, control, formState: { errors } } = useForm<UserFormValues>({
    defaultValues: {
      username: user?.userLogin?.username ?? '',
      email: user?.companyEmailAddress ?? '',
      firstName: user?.firstName ?? '',
      middleName: user?.middleName ?? '',
      surname: user?.surname ?? '',
      departmentId: user?.departmentId ?? '',
      hvRoles: (user?.hvRoles as HvRole[]) ?? ['staff'],
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    try {
      if (user) {
        const { username: _u, ...updateData } = data;
        await update({ id: user.id, ...updateData });
        toast({ title: 'Đã cập nhật người dùng' });
      } else {
        await create(data);
        toast({ title: 'Đã thêm người dùng', description: 'Mật khẩu mặc định: HV@123!' });
      }
      onClose();
    } catch {
      toast({ title: 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  const isPending = creating || updating;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{user ? 'Sửa người dùng' : 'Thêm người dùng'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {!user && (
                <div className="col-span-2 space-y-2">
                  <Label>Username <span className="text-destructive">*</span></Label>
                  <Input {...register('username', { required: 'Vui lòng nhập username' })} />
                  {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
                </div>
              )}
              <div className="space-y-2">
                <Label>Họ <span className="text-destructive">*</span></Label>
                <Input {...register('surname', { required: 'Vui lòng nhập họ' })} />
                {errors.surname && <p className="text-xs text-destructive">{errors.surname.message}</p>}
              </div>
              <div className="space-y-2"><Label>Tên lót</Label><Input {...register('middleName')} /></div>
              <div className="space-y-2">
                <Label>Tên <span className="text-destructive">*</span></Label>
                <Input {...register('firstName', { required: 'Vui lòng nhập tên' })} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" {...register('email', { required: 'Vui lòng nhập email' })} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bộ phận <span className="text-destructive">*</span></Label>
              <Controller name="departmentId" control={control} rules={{ required: 'Vui lòng chọn bộ phận' }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.departmentId ? 'border-destructive' : ''}><SelectValue placeholder="Chọn bộ phận" /></SelectTrigger>
                    <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              />
              {errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Vai trò <span className="text-destructive">*</span></Label>
              <Controller name="hvRoles" control={control} rules={{ validate: (v) => v.length > 0 || 'Cần chọn ít nhất 1 vai trò' }}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {HV_ROLES.map((r) => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={field.value.includes(r)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...field.value, r]
                              : field.value.filter((v) => v !== r);
                            field.onChange(next.length ? next : field.value);
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm">{ROLE_LABELS[r]}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UserManagementPage() {
  const { data: users = [], isLoading } = useHvUsers();
  const { data: departments = [] } = useHvDepartments();
  const { mutateAsync: deleteUser, isPending: deleting } = useDeleteHvUser();
  const { mutateAsync: resetPassword, isPending: resetting } = useResetHvUserPassword();
  const { mutateAsync: toggleActive, isPending: toggling } = useToggleHvUserActive();
  const { toast } = useToast();
  const [editUser, setEditUser] = useState<IHvUser | null | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<IHvUser | null>(null);
  const [confirmReset, setConfirmReset] = useState<IHvUser | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<IHvUser | null>(null);

  const handleToggleActive = async () => {
    if (!confirmToggle) return;
    const nextActive = confirmToggle.userLogin?.isActive === false;
    try {
      await toggleActive({ id: confirmToggle.id, isActive: nextActive });
      toast({ title: nextActive ? 'Đã kích hoạt tài khoản' : 'Đã ngưng hoạt động tài khoản' });
      setConfirmToggle(null);
    } catch {
      toast({ title: 'Có lỗi xảy ra', variant: 'destructive' });
      setConfirmToggle(null);
    }
  };

  const [q, setQ] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = users.filter((u) => {
    if (q) {
      const fullName = [u.firstName, u.middleName, u.surname].filter(Boolean).join(' ').toLowerCase();
      const username = (u.userLogin?.username ?? '').toLowerCase();
      const email = (u.companyEmailAddress ?? '').toLowerCase();
      if (!fullName.includes(q.toLowerCase()) && !username.includes(q.toLowerCase()) && !email.includes(q.toLowerCase())) return false;
    }
    if (filterDept && u.departmentId !== filterDept) return false;
    if (filterRole && !u.hvRoles.includes(filterRole as HvRole)) return false;
    if (filterStatus === 'active' && (u.userLogin?.isActive === false || u.userLogin?.isFirstLogin)) return false;
    if (filterStatus === 'first_login' && (u.userLogin?.isActive === false || !u.userLogin?.isFirstLogin)) return false;
    if (filterStatus === 'inactive' && u.userLogin?.isActive !== false) return false;
    return true;
  });

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteUser(confirmDelete.id);
      toast({ title: 'Đã xóa người dùng' });
      setConfirmDelete(null);
    } catch {
      toast({ title: 'Không thể xóa người dùng này', variant: 'destructive' });
      setConfirmDelete(null);
    }
  };

  const handleResetPassword = async () => {
    if (!confirmReset) return;
    try {
      await resetPassword(confirmReset.id);
      toast({ title: 'Đã reset mật khẩu', description: 'Mật khẩu mặc định: HV@123!' });
      setConfirmReset(null);
    } catch {
      toast({ title: 'Không thể reset mật khẩu', variant: 'destructive' });
      setConfirmReset(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
        <Button onClick={() => setEditUser(null)}>+ Thêm người dùng</Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Tìm họ tên, username, email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={filterDept || 'all'} onValueChange={(v) => setFilterDept(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="Bộ phận" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả bộ phận</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRole || 'all'} onValueChange={(v) => setFilterRole(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="Vai trò" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            {HV_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-9 w-48 text-sm"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="first_login">Chưa đổi mật khẩu</SelectItem>
            <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="text-muted-foreground">Đang tải...</div> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Bộ phận</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{[u.surname, u.middleName, u.firstName].filter(Boolean).join(' ')}</TableCell>
                <TableCell className="font-mono text-sm">{u.userLogin?.username ?? '—'}</TableCell>
                <TableCell className="text-sm">{u.companyEmailAddress ?? '—'}</TableCell>
                <TableCell>{u.department?.name ?? '—'}</TableCell>
                <TableCell className="flex flex-wrap gap-1">{u.hvRoles.map((r) => <Badge key={r} variant="outline">{ROLE_LABELS[r as HvRole] ?? r}</Badge>)}</TableCell>
                <TableCell>
                  {u.userLogin?.isActive === false
                    ? <span className="text-xs text-red-600 font-medium">Ngưng hoạt động</span>
                    : u.userLogin?.isFirstLogin
                      ? <span className="text-xs text-yellow-600">Chưa đổi mật khẩu</span>
                      : <span className="text-xs text-green-600">Hoạt động</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Tip label="Sửa">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditUser(u)}>
                        <Pencil size={15} />
                      </Button>
                    </Tip>
                    <Tip label="Reset mật khẩu">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setConfirmReset(u)}>
                        <KeyRound size={15} />
                      </Button>
                    </Tip>
                    <Tip label={u.userLogin?.isActive === false ? 'Kích hoạt tài khoản' : 'Ngưng hoạt động'}>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => setConfirmToggle(u)}
                      >
                        {u.userLogin?.isActive === false ? <UserCheck size={15} className="text-green-600" /> : <UserX size={15} className="text-amber-600" />}
                      </Button>
                    </Tip>
                    <Tip label="Xóa">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(u)}>
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

      {editUser !== undefined && <UserDialog user={editUser} onClose={() => setEditUser(undefined)} />}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Xóa người dùng"
        description={`Bạn có chắc muốn xóa người dùng "${[confirmDelete?.firstName, confirmDelete?.surname].filter(Boolean).join(' ')}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={!!confirmReset}
        title="Reset mật khẩu"
        description={`Mật khẩu của "${[confirmReset?.firstName, confirmReset?.surname].filter(Boolean).join(' ')}" sẽ được đặt lại về mặc định (HV@123!). Người dùng sẽ phải đổi mật khẩu khi đăng nhập lần tiếp theo.`}
        confirmLabel="Reset"
        loading={resetting}
        onConfirm={handleResetPassword}
        onCancel={() => setConfirmReset(null)}
      />

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.userLogin?.isActive === false ? 'Kích hoạt tài khoản' : 'Ngưng hoạt động tài khoản'}
        description={
          confirmToggle?.userLogin?.isActive === false
            ? `Tài khoản "${[confirmToggle?.firstName, confirmToggle?.surname].filter(Boolean).join(' ')}" sẽ được kích hoạt trở lại và có thể đăng nhập bình thường.`
            : `Tài khoản "${[confirmToggle?.firstName, confirmToggle?.surname].filter(Boolean).join(' ')}" sẽ bị ngưng hoạt động. Người dùng sẽ bị đăng xuất ngay lập tức và không thể đăng nhập cho đến khi được kích hoạt lại.`
        }
        confirmLabel={confirmToggle?.userLogin?.isActive === false ? 'Kích hoạt' : 'Ngưng hoạt động'}
        variant={confirmToggle?.userLogin?.isActive === false ? 'default' : 'destructive'}
        loading={toggling}
        onConfirm={handleToggleActive}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
