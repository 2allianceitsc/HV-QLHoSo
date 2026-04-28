/**
 * Dropdown Display configuration — shared between FE and BE.
 *
 * S09: Company-wide setting that controls what each entity dropdown shows on
 * the primary (bold) and secondary (muted) lines.
 *
 * Design:
 *   - primaryField   : single field key (required)
 *   - secondaryFields: ordered list of field keys (0..MAX); joined by " · "
 *                      empty array = hide secondary line entirely
 *
 * See: docs/screens/settings/S09-dropdown-display-settings.md
 *      docs/ba-change-requests/2026-04-17-CR-003-dropdown-display-configuration.md
 */

export const DROPDOWN_ENTITY_TYPES = [
  'STAFF',
  'CLIENT',
  'DEPARTMENT',
  'OFFICE',
  'TEAM',
  'STATUS',
  'POSITION',
  'COMPANY',
] as const;

export type DropdownEntityType = (typeof DROPDOWN_ENTITY_TYPES)[number];

/** Max number of fields admin can pick for the secondary line. */
export const MAX_SECONDARY_FIELDS = 3;

/** Separator used to join multiple secondary fields when rendering. */
export const SECONDARY_FIELD_SEPARATOR = ' · ';

/**
 * Allowed field keys per entity. `primaryField` and every entry in
 * `secondaryFields` must be one of these.
 *
 * STATUS exposes derived labels (`categoryLabel`, `maxDurationLabel`) in
 * addition to raw columns — see resolver on the frontend.
 */
export const DROPDOWN_FIELD_OPTIONS: Record<DropdownEntityType, readonly string[]> = {
  STAFF: [
    'fullName',
    'surname',
    'firstName',
    'email',
    'companyEmail',
    'departmentName',
    'officeName',
    'positionName',
    'teamName',
  ],
  CLIENT: ['name', 'code', 'country', 'industry'],
  DEPARTMENT: ['name', 'code'],
  OFFICE: ['name', 'code', 'city', 'timezone'],
  TEAM: ['name', 'code', 'clientName'],
  STATUS: ['name', 'displayName', 'description', 'categoryLabel', 'maxDurationLabel'],
  POSITION: ['name', 'code', 'departmentName'],
  COMPANY: ['name', 'code', 'country', 'industry', 'website'],
} as const;

/** Human-readable labels for field keys — shown in S09 admin UI. */
export const DROPDOWN_FIELD_LABELS: Record<string, string> = {
  fullName: 'Full name',
  surname: 'Surname',
  firstName: 'First name',
  email: 'Email (personal)',
  companyEmail: 'Company email',
  departmentName: 'Department',
  officeName: 'Office',
  positionName: 'Position',
  teamName: 'Team',
  clientName: 'Client',
  name: 'Name',
  displayName: 'Display name',
  description: 'Description',
  code: 'Code',
  country: 'Country',
  industry: 'Industry',
  city: 'City',
  timezone: 'Timezone',
  categoryLabel: 'Category',
  maxDurationLabel: 'Max duration',
  website: 'Website',
};

/** Human-readable labels for each entity type. Used as card titles on S09. */
export const DROPDOWN_ENTITY_LABELS: Record<DropdownEntityType, string> = {
  STAFF: 'Staff',
  CLIENT: 'Client',
  DEPARTMENT: 'Department',
  OFFICE: 'Office',
  TEAM: 'Team',
  STATUS: 'Status',
  POSITION: 'Position',
  COMPANY: 'Company',
};

export interface IDropdownDisplayConfig {
  entityType: DropdownEntityType;
  primaryField: string;
  secondaryFields: string[];
}

/**
 * Default config applied when no DB row exists for a given entity type.
 * Chosen so first-time rollout roughly matches the old hardcoded look.
 */
export const DEFAULT_DROPDOWN_CONFIGS: Record<DropdownEntityType, IDropdownDisplayConfig> = {
  STAFF: { entityType: 'STAFF', primaryField: 'fullName', secondaryFields: ['companyEmail'] },
  CLIENT: { entityType: 'CLIENT', primaryField: 'name', secondaryFields: ['code'] },
  DEPARTMENT: { entityType: 'DEPARTMENT', primaryField: 'name', secondaryFields: ['code'] },
  OFFICE: { entityType: 'OFFICE', primaryField: 'name', secondaryFields: ['code'] },
  TEAM: { entityType: 'TEAM', primaryField: 'name', secondaryFields: ['code'] },
  STATUS: {
    entityType: 'STATUS',
    primaryField: 'name',
    secondaryFields: ['categoryLabel', 'maxDurationLabel'],
  },
  POSITION: { entityType: 'POSITION', primaryField: 'name', secondaryFields: ['code'] },
  COMPANY: { entityType: 'COMPANY', primaryField: 'name', secondaryFields: ['code'] },
};

/** True if the given field key is valid for the entity. */
export function isValidDropdownField(
  entityType: DropdownEntityType,
  field: string | null | undefined,
): boolean {
  if (field === null || field === undefined || field === '') return false;
  return DROPDOWN_FIELD_OPTIONS[entityType].includes(field);
}
