import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EntityAvatar, getVisualColor, toRgba } from '@/components/entity/entityVisuals';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
  HR_ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
  MANAGER: 'bg-green-100 text-green-800 border-green-200',
  EMPLOYEE: 'bg-gray-100 text-gray-700 border-gray-200',
  CLIENT: 'bg-orange-100 text-orange-800 border-orange-200',
};

interface RoleBadgeProps {
  roleName: string;
  displayName?: string | null;
  colorHex?: string | null;
  iconId?: string | null;
  className?: string;
}

export function RoleBadge({ roleName, displayName, colorHex, iconId, className }: RoleBadgeProps) {
  const colorClass = ROLE_COLORS[roleName] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  const resolvedColor = getVisualColor(colorHex);
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', colorHex ? 'border-transparent' : colorClass, className)}
      style={colorHex ? { color: resolvedColor, backgroundColor: toRgba(resolvedColor, 0.14), borderColor: toRgba(resolvedColor, 0.22) } : undefined}
    >
      <EntityAvatar name={displayName ?? roleName} colorHex={resolvedColor} iconId={iconId} className="mr-1.5 h-4 w-4 border-0" iconClassName="h-3 w-3" />
      {displayName ?? roleName}
    </Badge>
  );
}
