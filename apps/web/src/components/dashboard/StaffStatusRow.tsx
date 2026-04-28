import { StatusBadge } from './StatusBadge';

interface IStaffStatusRowProps {
  staffId: string;
  firstName: string;
  surname: string;
  employeeId: string;
  currentStatus: { name: string; colorHex: string | null } | null;
  elapsedSeconds?: number | null;
  onClick?: (staffId: string) => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export function StaffStatusRow({
  staffId,
  firstName,
  surname,
  employeeId,
  currentStatus,
  elapsedSeconds,
  onClick,
}: IStaffStatusRowProps) {
  const handleClick = () => onClick?.(staffId);

  return (
    <tr
      className={onClick ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}
      onClick={handleClick}
    >
      <td className="px-4 py-3 text-sm font-medium text-foreground">
        {firstName} {surname}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{employeeId}</td>
      <td className="px-4 py-3">
        {currentStatus ? (
          <StatusBadge statusName={currentStatus.name} colorHex={currentStatus.colorHex} />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      {elapsedSeconds !== undefined && (
        <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
          {elapsedSeconds != null ? formatDuration(elapsedSeconds) : '—'}
        </td>
      )}
    </tr>
  );
}
