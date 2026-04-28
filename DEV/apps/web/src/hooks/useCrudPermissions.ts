import { usePermission } from './usePermission';

/**
 * Resolve the four CRUD action flags for a screen in one call.
 * Use at the top of a CRUD page, then:
 *   onAdd={perm.canCreate ? handleAdd : undefined}
 *   onEdit={perm.canUpdate ? handleEdit : undefined}
 *   onDelete={perm.canDelete ? handleDelete : undefined}
 *
 * Screen must be a code in the DB permission catalog
 * (see `docs/architecture/permission-seed-catalog.md`).
 */
export function useCrudPermissions(screen: string): {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
} {
  return {
    canView:   usePermission(screen, null, 'VIEW'),
    canCreate: usePermission(screen, null, 'CREATE'),
    canUpdate: usePermission(screen, null, 'UPDATE'),
    canDelete: usePermission(screen, null, 'DELETE'),
    canExport: usePermission(screen, null, 'EXPORT'),
  };
}
