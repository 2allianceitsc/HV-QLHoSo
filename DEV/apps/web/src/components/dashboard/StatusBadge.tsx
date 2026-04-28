interface IStatusBadgeProps {
  statusName: string;
  colorHex?: string | null;
}

export function StatusBadge({ statusName, colorHex }: IStatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: colorHex ?? '#6b7280' }}
      />
      <span>{statusName}</span>
    </span>
  );
}
