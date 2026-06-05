import { useMemo } from 'react';
import { EntitySelect } from '@/components/entity/EntitySelect';
import type { VisualEntityOption } from '@/components/entity/entityVisuals';
import type { IEmployee } from '@/api/employee.api';

/**
 * Staff option shape the resolver + avatar consume. Extends the base visual
 * option with the derived display fields declared for STAFF in S09.
 */
interface StaffOption extends VisualEntityOption {
  fullName: string;
  surname: string;
  firstName: string;
  email: string | null;
  companyEmail: string | null;
  departmentName: string | null;
  officeName: string | null;
  positionName: string | null;
  teamName: string | null;
}

interface StaffSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: IEmployee[];
  placeholder?: string;
  emptyLabel?: string;
  label?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  testId?: string;
}

function toStaffOption(emp: IEmployee): StaffOption {
  const lastPart = [emp.middleName, emp.firstName].filter(Boolean).join(' ').trim();
  const fullName = [emp.surname, lastPart].filter(Boolean).join(' ').trim() || emp.employeeId;
  return {
    id: emp.id,
    name: fullName,
    fullName,
    surname: emp.surname,
    firstName: emp.firstName,
    email: emp.userLogin?.email ?? null,
    companyEmail: emp.userLogin?.email ?? null, // Present schema has no distinct company-email column; use login email.
    departmentName: emp.department?.name ?? null,
    officeName: emp.office?.name ?? null,
    positionName: emp.position?.name ?? null,
    teamName: emp.team?.name ?? null,
    colorHex: null,
    iconId: null,
  };
}

/**
 * Dropdown picker for staff/employees. Honours the S09 `STAFF` display config.
 * Prefer this over ad-hoc `<EntitySelect>` wiring when the caller has a short
 * staff list (e.g. team members, direct reports). For paginated / searchable
 * staff lookup use `StaffPickerButton` (modal).
 */
export function StaffSelect({
  value = '',
  onValueChange,
  options,
  placeholder = 'Select staff',
  emptyLabel = 'All staff',
  label,
  className,
  triggerClassName,
  contentClassName,
  testId,
}: StaffSelectProps) {
  const staffOptions = useMemo(() => options.map(toStaffOption), [options]);

  return (
    <EntitySelect
      value={value}
      onValueChange={onValueChange}
      options={staffOptions}
      placeholder={placeholder}
      emptyLabel={emptyLabel}
      label={label}
      className={className}
      triggerClassName={triggerClassName}
      contentClassName={contentClassName}
      testId={testId}
      entityType="STAFF"
    />
  );
}
