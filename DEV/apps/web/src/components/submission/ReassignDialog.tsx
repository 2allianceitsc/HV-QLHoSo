import { useState } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useApprovalConfigApprovers } from '@/hooks/useApprovalConfig';
import type { IStaffOption } from '@/api/approvalConfig.api';

interface Props {
  open: boolean;
  currentApproverId: string;
  currentApproverName: string;
  onClose: () => void;
  onConfirm: (newApproverId: string, reason: string) => void;
  loading?: boolean;
}

function fullName(s: IStaffOption) {
  return [s.surname, s.middleName, s.firstName].filter(Boolean).join(' ');
}

/**
 * BA §7.3: admin-only step reassignment.
 * Reason must be ≥10 chars (server enforces); UI shows live count.
 */
export function ReassignDialog({ open, currentApproverId, currentApproverName, onClose, onConfirm, loading }: Props) {
  const { data: approvers = [] } = useApprovalConfigApprovers();
  const [newApproverId, setNewApproverId] = useState('');
  const [reason, setReason] = useState('');

  const candidates = approvers.filter((a) => a.id !== currentApproverId);
  const reasonOk = reason.trim().length >= 10;
  const canSubmit = newApproverId && reasonOk;

  const handleClose = () => {
    setNewApproverId('');
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm(newApproverId, reason.trim());
    setNewApproverId('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Đổi người duyệt</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Người duyệt hiện tại: <strong>{currentApproverName}</strong>
          </p>
          <div className="space-y-1.5">
            <Label>Người duyệt mới <span className="text-destructive">*</span></Label>
            <Select value={newApproverId} onValueChange={setNewApproverId}>
              <SelectTrigger><SelectValue placeholder="Chọn người duyệt" /></SelectTrigger>
              <SelectContent>
                {candidates.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{fullName(a)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Lý do <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="VD: Anh Hồng vắng dài hạn..."
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className={`text-xs ${reasonOk ? 'text-muted-foreground' : 'text-destructive'}`}>
              {reason.trim().length}/10 ký tự tối thiểu
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Hủy</Button>
          <Button onClick={handleConfirm} disabled={!canSubmit || loading}>
            {loading ? 'Đang xử lý...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
