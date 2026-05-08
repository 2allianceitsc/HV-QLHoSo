import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function RejectDialog({ open, onClose, onConfirm, loading }: RejectDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Từ chối tờ trình</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-2">
          <Label htmlFor="reject-reason">Lý do từ chối <span className="text-destructive">*</span></Label>
          <Textarea
            id="reject-reason"
            placeholder="Nhập lý do từ chối..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Hủy</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim() || loading}>
            {loading ? 'Đang xử lý...' : 'Từ chối'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
