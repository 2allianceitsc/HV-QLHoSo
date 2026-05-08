import { useApprovalConfigs, useApprovalConfigReviewers, useApprovalConfigApprovers, useUpsertApprovalConfig } from '@/hooks/useApprovalConfig';
import { useHvDepartments } from '@/hooks/useHvAdmin';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { IStaffOption } from '@/api/approvalConfig.api';

function fullName(s: IStaffOption) {
  return [s.firstName, s.middleName, s.surname].filter(Boolean).join(' ');
}

interface RowState {
  reviewerId: string;
  approverId: string;
  dirty: boolean;
}

export function ApprovalConfigPage() {
  const { data: departments = [] } = useHvDepartments();
  const { data: configs = [], isLoading: loadingConfigs } = useApprovalConfigs();
  const { data: reviewers = [] } = useApprovalConfigReviewers();
  const { data: approvers = [] } = useApprovalConfigApprovers();
  const { mutateAsync: upsert } = useUpsertApprovalConfig();
  const { toast } = useToast();

  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const getRow = (deptId: string): RowState => {
    if (rows[deptId]) return rows[deptId];
    const cfg = configs.find((c) => c.departmentId === deptId);
    return { reviewerId: cfg?.reviewerId ?? '', approverId: cfg?.approverId ?? '', dirty: false };
  };

  const setField = (deptId: string, field: 'reviewerId' | 'approverId', value: string) => {
    setRows((prev) => ({
      ...prev,
      [deptId]: { ...getRow(deptId), [field]: value, dirty: true },
    }));
  };

  const handleSave = async (deptId: string) => {
    const row = getRow(deptId);
    if (!row.reviewerId || !row.approverId) return;
    setSaving(deptId);
    try {
      await upsert({ departmentId: deptId, reviewerId: row.reviewerId, approverId: row.approverId });
      setRows((prev) => ({ ...prev, [deptId]: { ...row, dirty: false } }));
      toast({ title: 'Đã lưu cấu hình phân quyền' });
    } catch {
      toast({ title: 'Không thể lưu cấu hình', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  if (loadingConfigs) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Cấu hình phân quyền duyệt</h1>
      <p className="text-sm text-muted-foreground">
        Thiết lập người thẩm định và người phê duyệt cho từng bộ phận. Khi nhân viên tạo tờ trình, hệ thống sẽ tự động gán dựa trên cấu hình này.
      </p>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left p-3 font-medium">Bộ phận</th>
              <th className="text-left p-3 font-medium">Người thẩm định</th>
              <th className="text-left p-3 font-medium">Người phê duyệt</th>
              <th className="p-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {departments.map((dept) => {
              const row = getRow(dept.id);
              const isSaving = saving === dept.id;
              return (
                <tr key={dept.id} className="hover:bg-muted/20">
                  <td className="p-3 font-medium">{dept.name}</td>
                  <td className="p-3">
                    <Select value={row.reviewerId} onValueChange={(v) => setField(dept.id, 'reviewerId', v)}>
                      <SelectTrigger className="w-52">
                        <SelectValue placeholder="Chọn người thẩm định" />
                      </SelectTrigger>
                      <SelectContent>
                        {reviewers.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{fullName(r)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <Select value={row.approverId} onValueChange={(v) => setField(dept.id, 'approverId', v)}>
                      <SelectTrigger className="w-52">
                        <SelectValue placeholder="Chọn người phê duyệt" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvers.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{fullName(a)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      disabled={!row.dirty || !row.reviewerId || !row.approverId || isSaving}
                      onClick={() => handleSave(dept.id)}
                    >
                      {isSaving ? 'Lưu...' : 'Lưu'}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {departments.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Chưa có bộ phận nào. Vui lòng thêm bộ phận trước.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
