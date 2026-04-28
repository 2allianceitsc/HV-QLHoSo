import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Trash2, UserPlus, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useClientEmployees,
  useAssignClientEmployee,
  useUpdateClientEmployee,
  useUnassignClientEmployee,
  useClientDepartments,
} from '@/hooks/useClient';
import { useEmployees } from '@/hooks/useEmployee';
import type { IClientStaff, IUpdateAssignStaffDto } from '@/api/client.api';
import { safeArray } from '@/lib/safeArray';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';

// ── Assign form ───────────────────────────────────────────────────────────────

const assignSchema = z.object({
  staffId: z.string().min(1, 'Staff is required'),
  clientDepartmentId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isPrimary: z.boolean().optional(),
});
type AssignFormValues = z.infer<typeof assignSchema>;

// ── Edit assignment form ──────────────────────────────────────────────────────

const editSchema = z.object({
  clientDepartmentId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isPrimary: z.boolean().optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

function isActive(e: IClientStaff) {
  if (!e.endDate) return true;
  return new Date(e.endDate) >= new Date();
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { clientId: string }

export function ClientEmployeesTab({ clientId }: Props) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IClientStaff | null>(null);
  const [unassignTarget, setUnassignTarget] = useState<IClientStaff | null>(null);
  const [staffSearch, setStaffSearch] = useState('');
  const { toast } = useToast();
  const errToast = buildErrorToast(toast, { 'already assigned': 'Staff already assigned to this client' });

  const { data: employees = [], isLoading } = useClientEmployees(clientId);
  const { data: departments = [] } = useClientDepartments(clientId);
  const { data: staffData } = useEmployees({ search: staffSearch, limit: 50 });
  const assignMutation = useAssignClientEmployee(clientId);
  const updateMutation = useUpdateClientEmployee(clientId);
  const unassignMutation = useUnassignClientEmployee(clientId);

  const assignedStaffIds = new Set(employees.map((e) => e.staffId));
  const availableStaff = safeArray(staffData?.data).filter((s) => !assignedStaffIds.has(s.id));

  // ── Assign form ─────────────────────────────────────────────────────────────
  const { register: regAssign, handleSubmit: submitAssign, reset: resetAssign,
    formState: { errors: errAssign, isSubmitting: submittingAssign } } =
    useForm<AssignFormValues>({ resolver: zodResolver(assignSchema) });

  // ── Edit form ───────────────────────────────────────────────────────────────
  const { register: regEdit, handleSubmit: submitEdit, reset: resetEdit,
    formState: { isSubmitting: submittingEdit } } =
    useForm<EditFormValues>({ resolver: zodResolver(editSchema) });

  async function handleUnassign(staffId: string) {
    try {
      await unassignMutation.mutateAsync(staffId);
      toast({ title: 'Staff unassigned' });
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Failed to unassign staff'), variant: 'destructive' });
    }
  }

  async function onAssign(values: AssignFormValues) {
    try {
      await assignMutation.mutateAsync({
        staffId: values.staffId,
        clientDepartmentId: values.clientDepartmentId || undefined,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        isPrimary: values.isPrimary,
      });
      toast({ title: 'Staff assigned' });
      setAssignOpen(false);
      resetAssign({});
    } catch (err) {
      errToast(err, 'Failed to assign staff');
    }
  }

  function handleOpenEdit(e: IClientStaff) {
    setEditTarget(e);
    resetEdit({
      clientDepartmentId: e.clientDepartmentId ?? '',
      startDate: e.startDate ? e.startDate.split('T')[0] : '',
      endDate: e.endDate ? e.endDate.split('T')[0] : '',
      isPrimary: e.isPrimary,
    });
  }

  async function onEdit(values: EditFormValues) {
    if (!editTarget) return;
    const dto: IUpdateAssignStaffDto = {
      clientDepartmentId: values.clientDepartmentId || undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
      isPrimary: values.isPrimary,
    };
    try {
      await updateMutation.mutateAsync({ staffId: editTarget.staffId, dto });
      toast({ title: 'Assignment updated' });
      setEditTarget(null);
    } catch (err) {
      errToast(err, 'Failed to update assignment');
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { resetAssign({}); setAssignOpen(true); }}>
            <UserPlus className="mr-2 h-4 w-4" />
            Assign Employee
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No employees assigned.</TableCell>
                </TableRow>
              ) : (
                employees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{e.staff.firstName} {e.staff.surname}</p>
                        <p className="text-xs text-muted-foreground font-mono">{e.staff.employeeId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{e.staff.companyEmailAddress ?? e.staff.userLogin?.email ?? '—'}</TableCell>
                    <TableCell className="text-sm">{e.clientDepartment?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{formatDate(e.startDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(e.endDate)}</TableCell>
                    <TableCell>
                      <Badge variant={isActive(e) ? 'default' : 'secondary'} className="text-xs">
                        {isActive(e) ? 'Active' : 'Ended'}
                      </Badge>
                      {e.isPrimary && (
                        <Badge variant="outline" className="ml-1 text-xs">Primary</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit assignment" onClick={() => handleOpenEdit(e)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          title="Unassign"
                          onClick={() => setUnassignTarget(e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Employee</DialogTitle></DialogHeader>
          <form onSubmit={submitAssign(onAssign)} className="space-y-4">
            <div className="space-y-1">
              <Label>Search Staff</Label>
              <Input placeholder="Type to search..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Select Staff *</Label>
              <select {...regAssign('staffId')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" size={4}>
                <option value="">-- Select --</option>
                {availableStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.employeeId} — {s.firstName} {s.surname}</option>
                ))}
              </select>
              {errAssign.staffId && <p className="text-xs text-destructive">{errAssign.staffId.message}</p>}
            </div>
            {departments.length > 0 && (
              <div className="space-y-1">
                <Label>Department</Label>
                <select {...regAssign('clientDepartmentId')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">None</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" {...regAssign('startDate')} />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" {...regAssign('endDate')} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPrimary" {...regAssign('isPrimary')} className="h-4 w-4" />
              <Label htmlFor="isPrimary" className="cursor-pointer">Primary assignment</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submittingAssign}>{submittingAssign ? 'Assigning…' : 'Assign'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit assignment dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Assignment — {editTarget?.staff.firstName} {editTarget?.staff.surname}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit(onEdit)} className="space-y-4">
            {departments.length > 0 && (
              <div className="space-y-1">
                <Label>Department</Label>
                <select {...regEdit('clientDepartmentId')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">None</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" {...regEdit('startDate')} />
              </div>
              <div className="space-y-1">
                <Label>End Date <span className="text-xs text-muted-foreground">(blank = still active)</span></Label>
                <Input type="date" {...regEdit('endDate')} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="editIsPrimary" {...regEdit('isPrimary')} className="h-4 w-4" />
              <Label htmlFor="editIsPrimary" className="cursor-pointer">Primary assignment</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={submittingEdit}>{submittingEdit ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!unassignTarget}
        onOpenChange={(open) => {
          if (!open) setUnassignTarget(null);
        }}
        title="Unassign employee"
        description={
          unassignTarget
            ? `Unassign ${unassignTarget.staff.firstName} ${unassignTarget.staff.surname} from this client?`
            : 'Unassign this employee from this client?'
        }
        confirmLabel="Unassign"
        variant="destructive"
        isLoading={unassignMutation.isPending}
        onConfirm={async () => {
          if (!unassignTarget) return;
          await handleUnassign(unassignTarget.staffId);
          setUnassignTarget(null);
        }}
      />
    </>
  );
}
