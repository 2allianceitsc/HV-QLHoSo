import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { EntityAvatar } from './entityVisuals';

const DEFAULT_ICON_CHOICES = [
  'Building2',
  'BriefcaseBusiness',
  'MapPinned',
  'Users',
  'UserRoundCog',
  'ShieldCheck',
  'Handshake',
  'Landmark',
];

interface VisualIdentityFieldsProps {
  title?: string;
  previewLabel: string;
  colorHex?: string;
  iconId?: string;
  onColorHexChange: (value: string) => void;
  onIconIdChange: (value: string) => void;
  iconChoices?: string[];
}

export function VisualIdentityFields({
  title = 'Visual identity',
  previewLabel,
  colorHex,
  iconId,
  onColorHexChange,
  onIconIdChange,
  iconChoices = DEFAULT_ICON_CHOICES,
}: VisualIdentityFieldsProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="mb-4 flex items-center gap-3">
        <EntityAvatar name={previewLabel} colorHex={colorHex} iconId={iconId} className="h-11 w-11" iconClassName="h-5 w-5" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">Color and icon travel with this entity across dropdowns and badges.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[8rem_1fr]">
        <div className="space-y-1">
          <Label htmlFor="visualColorPicker">Color</Label>
          <Input
            id="visualColorPicker"
            type="color"
            value={colorHex || '#64748b'}
            onChange={(event) => onColorHexChange(event.target.value)}
            className="h-11 w-full cursor-pointer rounded-xl p-1"
          />
          <Input
            value={colorHex || ''}
            onChange={(event) => onColorHexChange(event.target.value)}
            placeholder="#64748b"
            className="h-10 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="visualIconInput">Icon name</Label>
            <Input
              id="visualIconInput"
              value={iconId || ''}
              onChange={(event) => onIconIdChange(event.target.value)}
              placeholder="Building2"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {iconChoices.map((iconName) => {
              const isActive = (iconId || '').trim() === iconName;
              return (
                <Button
                  key={iconName}
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onIconIdChange(iconName)}
                  className="rounded-full"
                >
                  <EntityAvatar name={iconName} colorHex={colorHex} iconId={iconName} className="mr-1.5 h-6 w-6" iconClassName="h-3.5 w-3.5" />
                  {iconName}
                </Button>
              );
            })}
            <Button type="button" variant="ghost" size="sm" onClick={() => onIconIdChange('')} className="rounded-full text-muted-foreground">
              Clear icon
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}