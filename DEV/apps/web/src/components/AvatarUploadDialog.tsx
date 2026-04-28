import { useRef, useState, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { useUploadAvatar } from '@/hooks/useProfile';
import { reportError } from '@/lib/reportError';

interface IAvatarUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  firstName: string;
  surname: string;
}

export function AvatarUploadDialog({
  isOpen,
  onClose,
  currentAvatarUrl,
  firstName,
  surname,
}: IAvatarUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadAvatar, isPending } = useUploadAvatar();

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    onClose();
  };

  const processFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only jpeg, png, webp images are accepted');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must not exceed 2MB');
      return;
    }
    setError(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await uploadAvatar(selectedFile);
      handleClose();
    } catch (err: unknown) {
      console.error('[AvatarUpload] upload failed:', err);
      let msg: string | undefined;
      if (err instanceof Error) {
        msg = err.message;
        reportError({ message: `Avatar upload failed: ${err.message}`, stack: err.stack });
      } else {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        msg = axiosErr?.response?.data?.message;
        if (msg) reportError({ message: `Avatar upload failed: ${msg}` });
      }
      setError(msg ?? 'Unable to upload image. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-foreground">Update Profile Photo</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-4">

        {/* Current / Preview */}
        <div className="flex justify-center">
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-24 w-24 rounded-full object-cover border-2 border-primary"
              />
              <button
                onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                aria-label="Remove selected photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <UserAvatar
              src={currentAvatarUrl}
              firstName={firstName}
              surname={surname}
              size="lg"
            />
          )}
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-accent/50'
          }`}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">Drag and drop your photo here</p>
          <p className="text-xs text-muted-foreground mt-1">or click to select</p>
          <p className="text-xs text-muted-foreground">jpeg, png, webp — max 2MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 flex gap-3 px-6 pb-6 pt-4 border-t border-border">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!selectedFile || isPending}
            onClick={() => void handleUpload()}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Photo
          </Button>
        </div>
      </div>
    </div>
  );
}
