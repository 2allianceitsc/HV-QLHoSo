import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EntityOptionRow } from '@/components/entity/entityVisuals';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  useDropdownDisplayConfigs,
  useUpdateDropdownDisplayConfigs,
} from '@/hooks/useDropdownDisplay';
import { SAMPLE_ENTITY_BY_TYPE } from '@/lib/dropdownFieldResolver';
import {
  DEFAULT_DROPDOWN_CONFIGS,
  DROPDOWN_ENTITY_LABELS,
  DROPDOWN_ENTITY_TYPES,
  DROPDOWN_FIELD_LABELS,
  DROPDOWN_FIELD_OPTIONS,
  MAX_SECONDARY_FIELDS,
  type DropdownEntityType,
  type IDropdownDisplayConfig,
} from '@shared/constants/dropdown-display';

const NONE_VALUE = '__none__';

type DraftMap = Record<DropdownEntityType, IDropdownDisplayConfig>;

function buildDraft(configsMap: Record<DropdownEntityType, IDropdownDisplayConfig>): DraftMap {
  return { ...configsMap };
}

function toSlotArray(fields: string[]): (string | null)[] {
  const slots: (string | null)[] = [...fields];
  while (slots.length < MAX_SECONDARY_FIELDS) slots.push(null);
  return slots.slice(0, MAX_SECONDARY_FIELDS);
}

function slotsToFields(slots: (string | null)[]): string[] {
  return slots.filter((s): s is string => Boolean(s));
}

interface CardValidation {
  error: string | null;
}

function validateCard(cfg: IDropdownDisplayConfig): CardValidation {
  const slotFields = cfg.secondaryFields;
  if (slotFields.length > MAX_SECONDARY_FIELDS) {
    return { error: `Max ${MAX_SECONDARY_FIELDS} secondary fields` };
  }
  if (slotFields.includes(cfg.primaryField)) {
    return { error: 'Primary field cannot also appear in secondary' };
  }
  const seen = new Set<string>();
  for (const f of slotFields) {
    if (seen.has(f)) return { error: 'Duplicate secondary field' };
    seen.add(f);
  }
  return { error: null };
}

function cardIsDirty(
  current: IDropdownDisplayConfig,
  original: IDropdownDisplayConfig,
): boolean {
  if (current.primaryField !== original.primaryField) return true;
  if (current.secondaryFields.length !== original.secondaryFields.length) return true;
  for (let i = 0; i < current.secondaryFields.length; i++) {
    if (current.secondaryFields[i] !== original.secondaryFields[i]) return true;
  }
  return false;
}

export function DropdownDisplaySettingsPage() {
  const { toast } = useToast();
  const { configsMap, isLoading } = useDropdownDisplayConfigs();
  const save = useUpdateDropdownDisplayConfigs();

  const [draft, setDraft] = useState<DraftMap>(() => buildDraft(configsMap));

  // Sync draft when server data arrives the first time.
  useEffect(() => {
    if (!isLoading) setDraft(buildDraft(configsMap));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const dirtyEntities = useMemo(
    () => DROPDOWN_ENTITY_TYPES.filter((t) => cardIsDirty(draft[t], configsMap[t])),
    [draft, configsMap],
  );

  const validations = useMemo(() => {
    const out: Record<DropdownEntityType, CardValidation> = {} as never;
    for (const t of DROPDOWN_ENTITY_TYPES) out[t] = validateCard(draft[t]);
    return out;
  }, [draft]);

  const hasInvalid = Object.values(validations).some((v) => v.error !== null);
  const canSave = dirtyEntities.length > 0 && !hasInvalid && !save.isPending;

  function updatePrimary(entity: DropdownEntityType, field: string) {
    setDraft((d) => ({ ...d, [entity]: { ...d[entity], primaryField: field } }));
  }

  function updateSlot(entity: DropdownEntityType, slotIndex: number, field: string | null) {
    setDraft((d) => {
      const slots = toSlotArray(d[entity].secondaryFields);
      slots[slotIndex] = field;
      return {
        ...d,
        [entity]: { ...d[entity], secondaryFields: slotsToFields(slots) },
      };
    });
  }

  function resetCard(entity: DropdownEntityType) {
    setDraft((d) => ({ ...d, [entity]: { ...DEFAULT_DROPDOWN_CONFIGS[entity] } }));
  }

  async function handleSaveAll() {
    const toPersist = dirtyEntities.map((t) => draft[t]);
    try {
      await save.mutateAsync(toPersist);
      toast({ title: 'Saved', description: 'Dropdown display settings updated.' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: getApiErrorMessage(err, 'Unable to save settings.'),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dropdown Display Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure what each entity dropdown shows across the app. Changes apply company-wide.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirtyEntities.length > 0 && (
            <Badge variant="secondary" data-testid="dropdown-display-dirty-count">
              {dirtyEntities.length} unsaved
            </Badge>
          )}
          <Button
            onClick={handleSaveAll}
            disabled={!canSave}
            data-testid="save-all-btn"
          >
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save All
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DROPDOWN_ENTITY_TYPES.map((entity) => (
          <EntityConfigCard
            key={entity}
            entityType={entity}
            config={draft[entity]}
            dirty={cardIsDirty(draft[entity], configsMap[entity])}
            error={validations[entity].error}
            onPrimaryChange={(f) => updatePrimary(entity, f)}
            onSlotChange={(i, f) => updateSlot(entity, i, f)}
            onReset={() => resetCard(entity)}
          />
        ))}
      </div>
    </div>
  );
}

interface EntityConfigCardProps {
  entityType: DropdownEntityType;
  config: IDropdownDisplayConfig;
  dirty: boolean;
  error: string | null;
  onPrimaryChange: (field: string) => void;
  onSlotChange: (slotIndex: number, field: string | null) => void;
  onReset: () => void;
}

function EntityConfigCard({
  entityType,
  config,
  dirty,
  error,
  onPrimaryChange,
  onSlotChange,
  onReset,
}: EntityConfigCardProps) {
  const allowedFields = DROPDOWN_FIELD_OPTIONS[entityType];
  const slots = toSlotArray(config.secondaryFields);
  const sample = SAMPLE_ENTITY_BY_TYPE[entityType];

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm"
      data-testid={`entity-card-${entityType}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{DROPDOWN_ENTITY_LABELS[entityType]}</h2>
          {dirty && (
            <Badge variant="secondary" data-testid={`dirty-badge-${entityType}`}>
              Unsaved
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          title="Reset to default"
          aria-label={`Reset ${DROPDOWN_ENTITY_LABELS[entityType]} to default`}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Primary line</Label>
          <Select
            value={config.primaryField}
            onValueChange={onPrimaryChange}
          >
            <SelectTrigger data-testid={`primary-select-${entityType}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {DROPDOWN_FIELD_LABELS[field] ?? field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Secondary line (up to {MAX_SECONDARY_FIELDS} fields)</Label>
          {slots.map((slotValue, idx) => (
            <Select
              key={idx}
              value={slotValue ?? NONE_VALUE}
              onValueChange={(v) => onSlotChange(idx, v === NONE_VALUE ? null : v)}
            >
              <SelectTrigger data-testid={`secondary-slot-${entityType}-${idx + 1}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>— None —</SelectItem>
                {allowedFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {DROPDOWN_FIELD_LABELS[field] ?? field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        {error && (
          <p className="text-xs font-medium text-destructive" data-testid={`error-${entityType}`}>
            {error}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Preview</p>
        <div data-testid={`preview-${entityType}`}>
          <EntityOptionRow
            option={sample}
            configOverride={{
              primaryField: config.primaryField,
              secondaryFields: config.secondaryFields,
            }}
          />
        </div>
      </div>
    </div>
  );
}
