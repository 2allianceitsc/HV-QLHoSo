import { SECONDARY_FIELD_SEPARATOR, type DropdownEntityType } from '@shared/constants/dropdown-display';

/**
 * Resolver operates on any plain object. Callers pass their strongly-typed
 * entity (e.g. IStaff, IClient) — the resolver reads the requested key with a
 * generic lookup, and falls back gracefully when the field is absent.
 */
type AnyEntity = { name?: unknown; displayName?: unknown } & object;

function readKey(entity: object, key: string): unknown {
  return (entity as Record<string, unknown>)[key];
}

function getFallbackLabel(entity: AnyEntity): string {
  const display = readKey(entity, 'displayName');
  const name = readKey(entity, 'name');
  return (
    (typeof display === 'string' && display.trim()) ||
    (typeof name === 'string' && name.trim()) ||
    'Unnamed'
  );
}

/**
 * Resolve a single field key against the entity. Silent fallback to
 * `name` / `displayName` when the configured field has no value — per S09 BR-6.
 */
export function resolveFieldValue(entity: AnyEntity, field: string): string {
  const raw = readKey(entity, field);
  if (raw === null || raw === undefined) return getFallbackLabel(entity);
  const str = String(raw).trim();
  return str || getFallbackLabel(entity);
}

/** Resolve the primary line — always non-empty. */
export function resolvePrimary(entity: AnyEntity, primaryField: string): string {
  return resolveFieldValue(entity, primaryField);
}

/**
 * Resolve the secondary line — joins the list with `·`. Returns `null` when
 * the list is empty (hide the line).
 */
export function resolveSecondary(
  entity: AnyEntity,
  secondaryFields: string[],
): string | null {
  if (!secondaryFields || secondaryFields.length === 0) return null;
  const parts = secondaryFields.map((f) => resolveFieldValue(entity, f)).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(SECONDARY_FIELD_SEPARATOR);
}

interface ISampleEntity {
  id: string;
  name: string;
  colorHex: string;
  [key: string]: string | null;
}

/** Sample data used by the S09 preview block. */
export const SAMPLE_ENTITY_BY_TYPE: Record<DropdownEntityType, ISampleEntity> = {
  STAFF: {
    id: 'sample-staff',
    name: 'Nguyen Van A',
    fullName: 'Nguyen Van A',
    surname: 'Nguyen',
    firstName: 'Van A',
    email: 'vana.nguyen@example.com',
    companyEmail: 'van.a@acme.com',
    departmentName: 'Engineering',
    officeName: 'Ho Chi Minh HQ',
    positionName: 'Senior Developer',
    teamName: 'Platform',
    colorHex: '#0ea5e9',
  },
  CLIENT: {
    id: 'sample-client',
    name: 'Acme Corporation',
    code: 'ACME-001',
    country: 'Australia',
    industry: 'Retail',
    colorHex: '#f59e0b',
  },
  DEPARTMENT: {
    id: 'sample-dept',
    name: 'Engineering',
    code: 'ENG',
    colorHex: '#6366f1',
  },
  OFFICE: {
    id: 'sample-office',
    name: 'Ho Chi Minh HQ',
    code: 'HCM',
    city: 'Ho Chi Minh City',
    timezone: 'Asia/Ho_Chi_Minh',
    colorHex: '#10b981',
  },
  TEAM: {
    id: 'sample-team',
    name: 'Platform',
    code: 'PLT',
    clientName: 'Acme Corporation',
    colorHex: '#ef4444',
  },
  STATUS: {
    id: 'sample-status',
    name: 'Short Break',
    displayName: 'Coffee break',
    description: 'Quick 15-minute rest',
    categoryLabel: 'Break',
    maxDurationLabel: 'max 15 min',
    colorHex: '#a855f7',
  },
  POSITION: {
    id: 'sample-position',
    name: 'Senior Developer',
    code: 'SR-DEV',
    departmentName: 'Engineering',
    colorHex: '#0891b2',
  },
  COMPANY: {
    id: 'sample-company',
    name: 'Acme Corporation',
    code: 'ACME',
    country: 'Australia',
    industry: 'Retail',
    website: 'acme.example.com',
    colorHex: '#7c3aed',
  },
};
