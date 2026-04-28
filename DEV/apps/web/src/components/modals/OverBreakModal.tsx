import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/form/FormTextField';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { cn } from '@/lib/utils';

export interface BreakContext {
  statusName: string;
  colorHex?: string | null;
  allowedSeconds: number;
  overtimeSeconds: number;
}

interface OverBreakModalProps {
  isOpen: boolean;
  breakContext: BreakContext | null;
  onConfirm: (notes: string) => void;
  onCancel?: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function OverBreakModal({ isOpen, breakContext, onConfirm, onCancel }: OverBreakModalProps) {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (notes.trim()) {
      onConfirm(notes.trim());
      setNotes('');
    }
  };

  const handleCancel = () => {
    setNotes('');
    onCancel?.();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={() => undefined}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content
          data-testid="overbreak-modal"
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]',
            'flex flex-col max-h-[90vh] rounded-lg border bg-background shadow-lg',
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="shrink-0 flex items-start justify-between px-6 pt-6 pb-4">
            <DialogPrimitive.Title className="text-lg font-semibold text-red-600">
              Break Time Exceeded
            </DialogPrimitive.Title>
            {onCancel && (
              <button
                type="button"
                data-testid="overbreak-close-btn"
                onClick={handleCancel}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <DialogPrimitive.Description className="sr-only">
            Your break exceeded the allowed limit. Please provide a reason before switching status.
          </DialogPrimitive.Description>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-4">
            {/* Break summary */}
            {breakContext && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/30">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <span
                    className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: breakContext.colorHex ?? '#6b7280' }}
                  />
                  {breakContext.statusName}
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Allowed</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatDuration(breakContext.allowedSeconds)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Exceeded by</span>
                    <span className="font-mono font-semibold text-red-600">
                      +{formatDuration(breakContext.overtimeSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <FormTextField
              id="overbreak-notes"
              label="Reason"
              hideLabel
              multiline
              rows={4}
              data-testid="overbreak-notes"
              placeholder="Please explain why your break exceeded the limit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              current={notes}
              maxLength={INPUT_LENGTH.text}
            />
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 px-6 pb-6 pt-4 border-t border-border">
            <Button data-testid="overbreak-confirm-btn" className="w-full" onClick={handleConfirm} disabled={!notes.trim()}>
              Confirm
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
