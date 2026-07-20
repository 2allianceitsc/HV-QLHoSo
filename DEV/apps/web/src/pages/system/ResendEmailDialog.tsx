import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ResendEmailDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (to: string) => void;
  loading?: boolean;
}

export function ResendEmailDialog({ open, onClose, onConfirm, loading }: ResendEmailDialogProps) {
  const [to, setTo] = useState('');

  const isValid = EMAIL_REGEX.test(to.trim());

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(to.trim());
  };

  const handleClose = () => {
    setTo('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gửi lại email</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-2">
          <Label htmlFor="resend-to">Email thay thế <span className="text-destructive">*</span></Label>
          <Input
            id="resend-to"
            type="email"
            placeholder="Nhập email thay thế..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Hủy</Button>
          <Button onClick={handleConfirm} disabled={!isValid || loading}>
            {loading ? 'Đang gửi...' : 'Gửi lại'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
