import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getVibeIcons, type IVibeIcon } from '@/api/attendance.api';
import { AppIcon } from '@/components/AppIcon';
import { FormTextField } from '@/components/form/FormTextField';
import { INPUT_LENGTH } from '@shared/constants/input-length';

interface MoodLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (vibeIconId: string, comment?: string) => void;
}

export function MoodLogoutModal({ isOpen, onClose, onConfirm }: MoodLogoutModalProps) {
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const { data: icons = [], isLoading } = useQuery({
    queryKey: ['vibe-icons'],
    queryFn: getVibeIcons,
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });

  const isSelectionRequired = icons && icons.length > 0;

  const handleConfirm = () => {
    if (isSelectionRequired && !selectedIconId) return;
    if (!isSelectionRequired && !comment.trim()) return;

    onConfirm(selectedIconId ?? '', comment.trim() || undefined);
    setSelectedIconId(null);
    setComment('');
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content
          data-testid="mood-logout-modal"
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
            'flex flex-col max-h-[90vh] rounded-lg border bg-background shadow-lg',
          )}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 pt-6 pb-2">
            <DialogPrimitive.Title className="text-lg font-semibold">
              How are you feeling today?
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="shrink-0 px-6 pb-4 text-sm text-muted-foreground">
            Select your mood before logging out.
          </DialogPrimitive.Description>

          {/* Scrollable icons area */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
            {isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div data-testid="mood-grid" className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {icons.map((icon: IVibeIcon) => (
                  <button
                    key={icon.id}
                    data-testid={`mood-icon-${icon.id}`}
                    type="button"
                    title={icon.hoverText ?? icon.iconText ?? icon.name}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all hover:bg-accent min-w-0 overflow-hidden',
                      selectedIconId === icon.id
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent',
                    )}
                    onClick={() => setSelectedIconId(icon.id)}
                  >
                    <AppIcon
                      iconUrl={icon.iconUrl}
                      emojiCode={icon.emojiCode}
                      alt={icon.name}
                      className="h-8 w-8 text-2xl leading-none flex-shrink-0"
                      fallback={<span className="emoji-glyph text-2xl leading-none">😊</span>}
                    />
                    <span className="w-full text-center text-[10px] leading-tight text-muted-foreground line-clamp-2 break-words">
                      {icon.iconText ?? icon.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sticky footer: comment + button */}
          <div className="shrink-0 px-6 pb-6 pt-4 border-t border-border space-y-3">
            <FormTextField
              id="mood-comment"
              label="Comment"
              hideLabel
              multiline
              rows={2}
              data-testid="mood-comment"
              placeholder={isSelectionRequired ? "Add a comment (optional)..." : "Please add a comment before logging out..."}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              current={comment}
              maxLength={INPUT_LENGTH.text}
            />
            <Button
              data-testid="mood-confirm-btn"
              className="w-full"
              onClick={handleConfirm}
              disabled={isSelectionRequired ? !selectedIconId : !comment.trim()}
            >
              Confirm &amp; Logout
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
