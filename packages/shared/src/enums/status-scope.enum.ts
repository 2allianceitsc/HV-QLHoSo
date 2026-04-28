/**
 * StatusDefinition scopes.
 *
 * Resolution rule (BA 2026-04-23): an employee sees the UNION of statuses from
 * every scope they belong to — deduped by Id. No fallback.
 *
 * Canonical spec: BA/REQUIREMENTS.md §4.2, §5.5; BA/flows/FLOW-AUTH.md §4.2.
 */
export enum StatusScope {
  TEAM = 'TEAM',
  OFFICE = 'OFFICE',
  CLIENT = 'CLIENT',
  COMPANY = 'COMPANY',
}
