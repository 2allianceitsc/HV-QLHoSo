import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { safeArray } from '@/lib/safeArray';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/form/FormTextField';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Eye, EyeOff, CheckCircle2, Layers, Copy, Inbox, RefreshCw, AlertTriangle } from 'lucide-react';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import {
  useSystemVibeIcons,
  useCreateVibeIcon,
  useUpdateVibeIcon,
  useDeleteVibeIcon,
  useToggleVibeIcon,
  useReorderVibeIcons,
  useVibeIconSets,
  useCreateVibeIconSet,
  useUpdateVibeIconSet,
  useDeleteVibeIconSet,
  useActivateVibeIconSet,
  useVibeIconsBySet,
  useCopyIconsToSet,
  useDuplicateVibeIconSet,
  useCollectOrphanedIcons,
  useScanVibeIconUrls,
} from '@/hooks/useSystem';
import type {
  IVibeIcon,
  IVibeIconSet,
  ICreateVibeIconDto,
  ICreateVibeIconSetDto,
  IVibeIconUrlScanResult,
} from '@/api/system.api';
import { getApiErrorMessage } from '@/lib/apiError';
import { AppIcon } from '@/components/AppIcon';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { optionalText, requiredName } from '@/lib/validation';

// ── Zod schemas ───────────────────────────────────────────────────────────────

function isSingleEmoji(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  const segments = [...new Intl.Segmenter().segment(trimmed)];
  return segments.length === 1 && /\p{Extended_Pictographic}/u.test(trimmed);
}

const iconSchema = z.object({
  name: requiredName('Name'),
  hoverText: optionalText('Hover text', INPUT_LENGTH.name),
  iconText: optionalText('Icon text', INPUT_LENGTH.name),
  emojiCode: z
    .string()
    .max(20, 'Emoji code is too long — enter exactly 1 emoji')
    .refine((val) => !val || isSingleEmoji(val), 'Must be exactly 1 emoji'),
  iconUrl: optionalText('Icon URL'),
  description: optionalText('Description'),
  category: optionalText('Category', INPUT_LENGTH.name),
  orderNo: z.number().int().min(0),
});
type IconFormValues = z.infer<typeof iconSchema>;

const setSchema = z.object({
  setName: requiredName('Set name'),
  description: optionalText('Description'),
});
type SetFormValues = z.infer<typeof setSchema>;

// ── SortableIconCard ──────────────────────────────────────────────────────────

function SortableIconCard({
  icon,
  onEdit,
  onDelete,
  onToggle,
  canUpdate,
  canDelete,
}: {
  icon: IVibeIcon;
  onEdit: (i: IVibeIcon) => void;
  onDelete: (i: IVibeIcon) => void;
  onToggle: (i: IVibeIcon) => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: icon.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`vibe-icons-icon-card-${icon.id}`}
      className={`relative rounded-xl border border-border bg-card flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing group overflow-hidden${icon.isDisabled ? ' opacity-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="w-full flex items-center justify-center bg-muted/40 py-5">
        <AppIcon
          iconUrl={icon.iconUrl}
          emojiCode={icon.emojiCode}
          alt={icon.name}
          className="h-14 w-14 text-5xl leading-none select-none"
          fallback={<span className="emoji-glyph text-5xl leading-none select-none">🔷</span>}
        />
      </div>
      <div className="w-full px-3 pb-3 flex flex-col items-center gap-1 min-h-[52px]">
        <span className="text-sm font-medium text-center leading-tight line-clamp-1 w-full text-center">
          {icon.iconText ?? icon.name}
        </span>
        {icon.hoverText && (
          <span className="text-xs text-muted-foreground text-center line-clamp-1">{icon.hoverText}</span>
        )}
        <span className="text-[10px] text-muted-foreground/60">#{icon.orderNo}</span>
      </div>
      <div
        className="absolute top-1 right-1 hidden group-hover:flex gap-0.5"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {canUpdate && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            data-testid={`vibe-icons-icon-edit-btn-${icon.id}`}
            onClick={() => onEdit(icon)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
        {canUpdate && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            data-testid={`vibe-icons-icon-toggle-btn-${icon.id}`}
            onClick={() => onToggle(icon)}
          >
            {icon.isDisabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
        )}
        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-destructive"
            data-testid={`vibe-icons-icon-delete-btn-${icon.id}`}
            onClick={() => onDelete(icon)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function VibeIconsPage() {
  const { toast } = useToast();

  // Sets
  const { data: rawSets, isLoading: setsLoading } = useVibeIconSets();
  const sets = safeArray(rawSets);
  const createSetMutation = useCreateVibeIconSet();
  const updateSetMutation = useUpdateVibeIconSet();
  const deleteSetMutation = useDeleteVibeIconSet();
  const activateSetMutation = useActivateVibeIconSet();
  const duplicateSetMutation = useDuplicateVibeIconSet();
  const copyIconsMutation = useCopyIconsToSet();
  const collectOrphansMutation = useCollectOrphanedIcons();
  const scanUrlsMutation = useScanVibeIconUrls();

  // Icons (all, for unassigned view)
  const { data: rawAllIcons } = useSystemVibeIcons();
  const allIcons = safeArray(rawAllIcons);

  // Selected set state — auto-select active set on first load
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [autoSelected, setAutoSelected] = useState(false);
  useEffect(() => {
    if (!autoSelected && sets.length > 0) {
      const active = sets.find((s) => s.isActive) ?? sets[0];
      setSelectedSetId(active.id);
      setAutoSelected(true);
    }
  }, [sets, autoSelected]);
  const { data: rawSetIcons, isLoading: iconsLoading } = useVibeIconsBySet(selectedSetId);
  const setIcons = safeArray(rawSetIcons);

  const displayIcons = selectedSetId ? setIcons : allIcons;
  const isLoading = selectedSetId ? iconsLoading : false;

  const perm = useCrudPermissions('SY09');
  const createMutation = useCreateVibeIcon();
  const updateMutation = useUpdateVibeIcon();
  const deleteMutation = useDeleteVibeIcon();
  const toggleMutation = useToggleVibeIcon();
  const reorderMutation = useReorderVibeIcons();

  const [localOrder, setLocalOrder] = useState<IVibeIcon[] | null>(null);
  const resolvedIcons = localOrder ?? displayIcons;

  // Icon dialog
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IVibeIcon | null>(null);
  const iconForm = useForm<IconFormValues>({ resolver: zodResolver(iconSchema) });

  // Set dialog
  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [editSet, setEditSet] = useState<IVibeIconSet | null>(null);
  const setForm = useForm<SetFormValues>({ resolver: zodResolver(setSchema) });
  const [deleteSetTarget, setDeleteSetTarget] = useState<IVibeIconSet | null>(null);
  const [deleteIconTarget, setDeleteIconTarget] = useState<IVibeIcon | null>(null);

  // Copy icons dialog
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceSetId, setCopySourceSetId] = useState<string>('');
  const [scanResult, setScanResult] = useState<IVibeIconUrlScanResult | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Set handlers ──────────────────────────────────────────────────────────

  function handleAddSet() {
    setEditSet(null);
    setForm.reset({ setName: '', description: '' });
    setSetDialogOpen(true);
  }

  function handleEditSet(s: IVibeIconSet) {
    setEditSet(s);
    setForm.reset({ setName: s.setName, description: s.description ?? '' });
    setSetDialogOpen(true);
  }

  async function handleActivateSet(s: IVibeIconSet) {
    try {
      await activateSetMutation.mutateAsync(s.id);
      toast({ title: `"${s.setName}" activated — employees will see these icons.` });
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Activation failed'), variant: 'destructive' });
    }
  }

  function handleRequestDeleteSet(s: IVibeIconSet) {
    setDeleteSetTarget(s);
  }

  async function handleDeleteSet() {
    if (!deleteSetTarget) return;
    try {
      await deleteSetMutation.mutateAsync(deleteSetTarget.id);
      if (selectedSetId === deleteSetTarget.id) setSelectedSetId(null);
      toast({ title: 'Set deleted' });
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Delete failed'), variant: 'destructive' });
    } finally {
      setDeleteSetTarget(null);
    }
  }

  async function handleDuplicateSet(s: IVibeIconSet) {
    try {
      const newSet = await duplicateSetMutation.mutateAsync(s.id);
      toast({ title: `"${s.setName}" duplicated`, description: `Created "${newSet?.setName ?? 'Copy'}"` });
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Duplicate failed'), variant: 'destructive' });
    }
  }

  async function handleCollectOrphans() {
    try {
      const result = await collectOrphansMutation.mutateAsync();
      toast({ title: `${result.collected} orphaned icon(s) moved to "NoName" set` });
      if (result.setId) setSelectedSetId(result.setId);
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Collect failed'), variant: 'destructive' });
    }
  }

  function handleOpenCopyDialog() {
    setCopySourceSetId('');
    setCopyDialogOpen(true);
  }

  async function handleCopyIcons() {
    if (!selectedSetId || !copySourceSetId) return;
    try {
      const result = await copyIconsMutation.mutateAsync({ targetSetId: selectedSetId, sourceSetId: copySourceSetId });
      toast({ title: `${result.copied} icon(s) copied into this set` });
      setCopyDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Copy failed'), variant: 'destructive' });
    }
  }

  async function handleScanIconUrls() {
    try {
      const result = await scanUrlsMutation.mutateAsync();
      setScanResult(result);
      toast({
        title: 'Icon URL scan completed',
        description: `${result.brokenCount}/${result.totalChecked} icon URL(s) are broken`,
      });
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Scan failed'), variant: 'destructive' });
    }
  }

  async function onSetSubmit(values: SetFormValues) {
    try {
      if (editSet) {
        await updateSetMutation.mutateAsync({ id: editSet.id, dto: values });
        toast({ title: 'Set updated' });
      } else {
        await createSetMutation.mutateAsync(values as ICreateVibeIconSetDto);
        toast({ title: 'Set created' });
      }
      setSetDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Operation failed'), variant: 'destructive' });
    }
  }

  // ── Icon handlers ─────────────────────────────────────────────────────────

  function handleAddIcon() {
    setEditTarget(null);
    iconForm.reset({ name: '', hoverText: '', iconText: '', emojiCode: '', iconUrl: '', description: '', category: '', orderNo: 0 });
    setIconDialogOpen(true);
  }

  function handleEditIcon(icon: IVibeIcon) {
    setEditTarget(icon);
    iconForm.reset({
      name: icon.name,
      hoverText: icon.hoverText ?? '',
      iconText: icon.iconText ?? '',
      emojiCode: icon.emojiCode ?? '',
      iconUrl: icon.iconUrl ?? '',
      description: icon.description ?? '',
      category: icon.category ?? '',
      orderNo: icon.orderNo ?? 0,
    });
    setIconDialogOpen(true);
  }

  function handleRequestDeleteIcon(icon: IVibeIcon) {
    setDeleteIconTarget(icon);
  }

  async function handleDeleteIcon() {
    if (!deleteIconTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteIconTarget.id);
      toast({ title: 'Icon deleted' });
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Delete failed'), variant: 'destructive' });
    } finally {
      setDeleteIconTarget(null);
    }
  }

  async function handleToggleIcon(icon: IVibeIcon) {
    try {
      await toggleMutation.mutateAsync(icon.id);
      toast({ title: icon.isDisabled ? 'Icon enabled' : 'Icon disabled' });
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Toggle failed'), variant: 'destructive' });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = resolvedIcons.findIndex((i) => i.id === active.id);
    const newIndex = resolvedIcons.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(resolvedIcons, oldIndex, newIndex);
    setLocalOrder(reordered);
    reorderMutation.mutateAsync(reordered.map((i) => i.id))
      .then(() => setLocalOrder(null))
      .catch((err) => {
        setLocalOrder(null);
        toast({ title: 'Error', description: getApiErrorMessage(err, 'Reorder failed'), variant: 'destructive' });
      });
  }

  async function onIconSubmit(values: IconFormValues) {
    try {
      // For edit: send empty string so the backend can distinguish "clear" from "skip".
      // For create: undefined means omit (use DB default null).
      const nullable = (v: string | undefined) =>
        editTarget ? (v ?? '') : (v || undefined);
      const dto: ICreateVibeIconDto = {
        vibeIconSetId: selectedSetId ?? undefined,
        name: values.name,
        hoverText: nullable(values.hoverText),
        iconText: nullable(values.iconText),
        emojiCode: nullable(values.emojiCode),
        iconUrl: nullable(values.iconUrl),
        description: nullable(values.description),
        category: nullable(values.category),
        orderNo: values.orderNo,
      };
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, dto });
        toast({ title: 'Icon updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Icon created' });
      }
      setIconDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Operation failed'), variant: 'destructive' });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-testid="vibe-icons-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">VIBE Icons</h1>
          <p className="text-sm text-muted-foreground">Manage icon sets. Only one set is active at a time — employees see icons from the active set.</p>
        </div>
        {perm.canCreate && (
          <Button onClick={handleAddSet} variant="outline" data-testid="vibe-icons-new-set-btn">
            <Layers className="h-4 w-4 mr-2" />
            New Set
          </Button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sets sidebar */}
        <div className="w-56 flex-shrink-0 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Icon Sets</p>
          {setsLoading && <p className="text-xs text-muted-foreground px-1">Loading...</p>}

          <button
            onClick={() => setSelectedSetId(null)}
            data-testid="vibe-icons-select-all-btn"
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedSetId === null ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-foreground'}`}
          >
            All Icons ({allIcons.length})
          </button>

          {sets.map((s) => (
            <div
              key={s.id}
              className={`relative rounded-lg border transition-colors ${selectedSetId === s.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
            >
              <button
                onClick={() => setSelectedSetId(s.id)}
                data-testid={`vibe-icons-select-set-btn-${s.id}`}
                className="w-full text-left px-3 py-2.5 pr-8"
              >
                <div className="flex items-center gap-2">
                  {s.isActive && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
                  <span className="text-sm font-medium truncate">{s.setName}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {s.isActive && <Badge variant="outline" className="text-[10px] h-4 text-green-600 border-green-300">Active</Badge>}
                  <span className="text-xs text-muted-foreground">{s._count?.icons ?? 0} icons</span>
                </div>
              </button>
              <div className="absolute top-1 right-1 flex gap-0">
                {!s.isActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    title="Activate"
                    data-testid={`vibe-icons-activate-set-btn-${s.id}`}
                    onClick={() => void handleActivateSet(s)}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  title="Duplicate set"
                  data-testid={`vibe-icons-duplicate-set-btn-${s.id}`}
                  onClick={() => void handleDuplicateSet(s)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  title="Edit"
                  data-testid={`vibe-icons-edit-set-btn-${s.id}`}
                  onClick={() => handleEditSet(s)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                {!s.isActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive"
                    title="Delete"
                    data-testid={`vibe-icons-delete-set-btn-${s.id}`}
                    onClick={() => handleRequestDeleteSet(s)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {sets.length === 0 && !setsLoading && (
            <p className="text-xs text-muted-foreground px-1">No sets yet. Create one.</p>
          )}
        </div>

        {/* Icons grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">
              {selectedSetId ? `Icons in "${sets.find((s) => s.id === selectedSetId)?.setName ?? '...'}"` : 'All icons'}
              {' '}({resolvedIcons.length})
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleScanIconUrls()}
                disabled={scanUrlsMutation.isPending}
                data-testid="vibe-icons-scan-urls-btn"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${scanUrlsMutation.isPending ? 'animate-spin' : ''}`} />
                Scan URLs
              </Button>
              {!selectedSetId && allIcons.filter((i) => !i.vibeIconSet).length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCollectOrphans()}
                  disabled={collectOrphansMutation.isPending}
                  data-testid="vibe-icons-collect-orphaned-btn"
                >
                  <Inbox className="h-4 w-4 mr-1" />
                  Collect Orphaned ({allIcons.filter((i) => !i.vibeIconSet).length})
                </Button>
              )}
              {selectedSetId && (
                <Button size="sm" variant="outline" onClick={handleOpenCopyDialog} data-testid="vibe-icons-open-copy-dialog-btn">
                  <Copy className="h-4 w-4 mr-1" />
                  Copy icons from…
                </Button>
              )}
              {perm.canCreate && (
                <Button size="sm" onClick={handleAddIcon} data-testid="vibe-icons-add-icon-btn">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Icon
                </Button>
              )}
            </div>
          </div>

          {scanResult && (
            <div className="mb-4 rounded-lg border border-border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">Last scan:</span>
                <span className="text-muted-foreground">{new Date(scanResult.scannedAt).toLocaleString()}</span>
                <Badge variant="outline">Checked: {scanResult.totalChecked}</Badge>
                <Badge variant={scanResult.brokenCount > 0 ? 'destructive' : 'outline'}>
                  Broken: {scanResult.brokenCount}
                </Badge>
              </div>

              {scanResult.brokenCount > 0 ? (
                <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-amber-200/70 dark:border-amber-900/40 text-left">
                        <th className="px-3 py-2 font-semibold">Icon</th>
                        <th className="px-3 py-2 font-semibold">Set</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResult.broken.map((issue) => (
                        <tr key={issue.id} className="border-b border-amber-200/50 dark:border-amber-900/20 last:border-b-0">
                          <td className="px-3 py-2 align-top">
                            <div className="font-medium">{issue.name}</div>
                            <div className="text-muted-foreground break-all">{issue.iconUrl}</div>
                          </td>
                          <td className="px-3 py-2 align-top">{issue.vibeIconSetName ?? 'Unassigned'}</td>
                          <td className="px-3 py-2 align-top">{issue.httpStatus ?? '-'}</td>
                          <td className="px-3 py-2 align-top">{issue.error ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-green-300/60 bg-green-50 dark:bg-green-950/20 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  No broken icon URLs were detected.
                </div>
              )}

              {scanResult.brokenCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Review these icon URLs and decide whether to replace or remove them.
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : resolvedIcons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground text-sm">
                {selectedSetId ? 'No icons in this set yet. Add one.' : 'No icons yet. Add one to get started.'}
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={resolvedIcons.map((i) => i.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" data-testid="vibe-icons-grid">
                  {resolvedIcons.map((icon) => (
                    <SortableIconCard
                      key={icon.id}
                      icon={icon}
                      onEdit={handleEditIcon}
                      onDelete={handleRequestDeleteIcon}
                      onToggle={handleToggleIcon}
                      canUpdate={perm.canUpdate}
                      canDelete={perm.canDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Set dialog */}
      <Dialog open={setDialogOpen} onOpenChange={setSetDialogOpen}>
        <DialogContent data-testid="vibe-icons-set-dialog">
          <DialogHeader>
            <DialogTitle>{editSet ? 'Edit Set' : 'New Icon Set'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={setForm.handleSubmit(onSetSubmit)}>
            <DialogBody className="space-y-4">
              <FormTextField
                id="vibe-icons-set-name"
                label="Set Name"
                required
                registration={setForm.register('setName')}
                current={setForm.watch('setName')}
                maxLength={INPUT_LENGTH.name}
                placeholder="e.g. Default Set"
                error={setForm.formState.errors.setName?.message}
              />
              <FormTextField
                id="vibe-icons-set-description"
                label="Description"
                registration={setForm.register('description')}
                current={setForm.watch('description')}
                maxLength={INPUT_LENGTH.text}
                error={setForm.formState.errors.description?.message}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSetDialogOpen(false)} data-testid="vibe-icons-set-cancel-btn">Cancel</Button>
              <Button type="submit" disabled={setForm.formState.isSubmitting} data-testid="vibe-icons-set-save-btn">
                {setForm.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteSetTarget}
        onOpenChange={(open) => !open && setDeleteSetTarget(null)}
        title="Confirm Delete"
        description={`Are you sure you want to delete "${deleteSetTarget?.setName ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteSet}
        isLoading={deleteSetMutation.isPending}
      />

      {/* Copy icons dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent data-testid="vibe-icons-copy-dialog">
          <DialogHeader>
            <DialogTitle>Copy icons from another set</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a source set — all its icons will be copied into{' '}
              <strong>{sets.find((s) => s.id === selectedSetId)?.setName ?? 'this set'}</strong>.
              Existing icons are kept; copies are appended.
            </p>
            <div className="space-y-1">
              <Label>Source set</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={copySourceSetId}
                onChange={(e) => setCopySourceSetId(e.target.value)}
                data-testid="vibe-icons-copy-source-set-select"
              >
                <option value="">— select a set —</option>
                {sets
                  .filter((s) => s.id !== selectedSetId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.setName} ({s._count?.icons ?? 0} icons)
                    </option>
                  ))}
              </select>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)} data-testid="vibe-icons-copy-cancel-btn">Cancel</Button>
            <Button
              disabled={!copySourceSetId || copyIconsMutation.isPending}
              onClick={() => void handleCopyIcons()}
              data-testid="vibe-icons-copy-confirm-btn"
            >
              {copyIconsMutation.isPending ? 'Copying…' : 'Copy icons'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Icon dialog */}
      <Dialog open={iconDialogOpen} onOpenChange={setIconDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="vibe-icons-icon-dialog">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Icon' : 'Add Icon'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={iconForm.handleSubmit(onIconSubmit)}>
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-[1fr_80px] gap-3 items-start">
                <FormTextField
                  id="vi-name"
                  label="Name"
                  required
                  registration={iconForm.register('name')}
                  current={iconForm.watch('name')}
                  maxLength={INPUT_LENGTH.name}
                  helperText="Internal key"
                  error={iconForm.formState.errors.name?.message}
                />
                <FormTextField
                  id="vi-order-no"
                  label="Order No"
                  type="number"
                  min={0}
                  step={1}
                  registration={iconForm.register('orderNo', { valueAsNumber: true })}
                  current={String(iconForm.watch('orderNo') ?? 0)}
                  helperText="Sort order"
                  error={iconForm.formState.errors.orderNo?.message}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormTextField
                  id="vi-icon-text"
                  label="Icon Text"
                  registration={iconForm.register('iconText')}
                  current={iconForm.watch('iconText')}
                  maxLength={INPUT_LENGTH.name}
                  helperText="Shown below icon"
                  error={iconForm.formState.errors.iconText?.message}
                />
                <FormTextField
                  id="vi-hover-text"
                  label="Hover Text"
                  registration={iconForm.register('hoverText')}
                  current={iconForm.watch('hoverText')}
                  maxLength={INPUT_LENGTH.name}
                  helperText="Tooltip on hover"
                  error={iconForm.formState.errors.hoverText?.message}
                />
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <FormTextField
                    id="vi-emoji"
                    label="Emoji Code"
                    registration={{
                      ...iconForm.register('emojiCode'),
                      onChange: async (e: { target: any; type?: any }) => {
                        const val: string = e.target.value ?? '';
                        const segs = [...new Intl.Segmenter().segment(val)];
                        const first = segs.find(s => /\p{Extended_Pictographic}/u.test(s.segment));
                        iconForm.setValue('emojiCode', first?.segment ?? '', { shouldValidate: true });
                      },
                    }}
                    current={iconForm.watch('emojiCode')}
                    maxLength={20}
                    helperText="Type or paste an emoji"
                    placeholder="Paste emoji here"
                    error={iconForm.formState.errors.emojiCode?.message}
                  />
                  <p className="text-xs text-muted-foreground">
                    Find emojis:{' '}
                    <a href="https://emojipedia.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Emojipedia</a>
                    {' · '}
                    <a href="https://www.emojicopy.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">EmojiCopy</a>
                    {' · '}
                    <a href="https://getemoji.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GetEmoji</a>
                  </p>
                </div>
                {/* Live emoji preview */}
                <div className="mt-6 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-xl leading-none select-none">
                  {iconForm.watch('emojiCode')
                    ? <span className="emoji-glyph">{iconForm.watch('emojiCode')}</span>
                    : <span className="text-[10px] text-muted-foreground">—</span>
                  }
                </div>
              </div>

              {/* Icon URL — upload SVG file or paste data URL */}
              <div className="space-y-1">
                <Label>Icon Image <span className="text-xs text-muted-foreground">(SVG file or data URL)</span></Label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <FormTextField
                      id="vi-icon-url"
                      label="Icon Image"
                      hideLabel
                      multiline
                      rows={3}
                      registration={iconForm.register('iconUrl')}
                      placeholder="Paste SVG data URL here…"
                      data-testid="vibe-icons-icon-url-textarea"
                      current={iconForm.watch('iconUrl')}
                      maxLength={INPUT_LENGTH.text}
                      fieldClassName="text-xs font-mono"
                      error={iconForm.formState.errors.iconUrl?.message}
                    />
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-primary hover:underline">
                      <input
                        type="file"
                        accept=".svg,image/svg+xml"
                        className="hidden"
                        data-testid="vibe-icons-upload-svg-input"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            iconForm.setValue('iconUrl', reader.result as string, { shouldDirty: true });
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                      Upload SVG file…
                    </label>
                  </div>
                  {/* Live preview */}
                  <div className="w-14 h-14 rounded-lg border border-border bg-muted/40 flex items-center justify-center flex-shrink-0">
                    <AppIcon
                      iconUrl={iconForm.watch('iconUrl') || undefined}
                      emojiCode={iconForm.watch('emojiCode') || undefined}
                      alt="preview"
                      className="h-10 w-10 text-3xl leading-none"
                      fallback={<span className="text-xs text-muted-foreground">—</span>}
                    />
                  </div>
                </div>
              </div>

              <FormTextField
                id="vi-description"
                label="Description"
                registration={iconForm.register('description')}
                current={iconForm.watch('description')}
                maxLength={INPUT_LENGTH.text}
                error={iconForm.formState.errors.description?.message}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIconDialogOpen(false)} data-testid="vibe-icons-icon-cancel-btn">Cancel</Button>
              <Button type="submit" disabled={iconForm.formState.isSubmitting} data-testid="vibe-icons-icon-save-btn">
                {iconForm.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteIconTarget}
        onOpenChange={(open) => !open && setDeleteIconTarget(null)}
        title="Confirm Delete"
        description={`Are you sure you want to delete "${deleteIconTarget?.name ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteIcon}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
