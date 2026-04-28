import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  getPermissionCatalogApi,
  getPermissionRolesApi,
  getRulesForRoleApi,
  applyMatrixChangesApi,
  resetRoleDefaultsApi,
  type IAdminCatalog,
  type IAdminRole,
  type IAdminRule,
  type IMatrixChange,
} from '@/api/admin-permissions.api';

type CellState = 'allow' | 'deny' | 'inherit';

const RESERVED_SCREENS = new Set(['SY18', 'SY01']);
const FULL_CRUD_CODES: readonly string[] = ['VIEW', 'CREATE', 'UPDATE', 'DELETE'];

function cellKey(screenCode: string, tabCode: string | null, action: string): string {
  return `${screenCode}::${tabCode ?? ''}::${action}`;
}

function ruleToState(rule: IAdminRule | undefined): CellState {
  if (!rule) return 'inherit';
  return rule.isAllowed ? 'allow' : 'deny';
}

function nextState(s: CellState): CellState {
  if (s === 'inherit') return 'allow';
  if (s === 'allow') return 'deny';
  return 'inherit';
}

function cellGlyph(s: CellState): string {
  if (s === 'allow') return '●';
  if (s === 'deny') return '✗';
  return '○';
}

function cellColor(s: CellState): string {
  if (s === 'allow') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (s === 'deny') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-muted text-muted-foreground';
}

export function RolePermissionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [area, setArea] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewOnly, setViewOnly] = useState(false);
  const [pending, setPending] = useState<Record<string, CellState>>({});

  const rolesQuery = useQuery<IAdminRole[]>({
    queryKey: ['admin-permissions', 'roles'],
    queryFn: getPermissionRolesApi,
  });

  const catalogQuery = useQuery<IAdminCatalog>({
    queryKey: ['admin-permissions', 'catalog'],
    queryFn: getPermissionCatalogApi,
  });

  const rulesQuery = useQuery<IAdminRule[]>({
    queryKey: ['admin-permissions', 'rules', selectedRoleId],
    queryFn: () => getRulesForRoleApi(selectedRoleId as string),
    enabled: !!selectedRoleId,
  });

  const applyMutation = useMutation({
    mutationFn: applyMatrixChangesApi,
    onSuccess: (result) => {
      toast({
        title: 'Permissions saved',
        description: `${result.applied} changed, ${result.cleared} cleared (${result.affectedUserCount} users affected).`,
      });
      setPending({});
      void qc.invalidateQueries({ queryKey: ['admin-permissions', 'rules'] });
    },
    onError: (err) => {
      toast({
        title: 'Save failed',
        description: getApiErrorMessage(err, 'Could not save permission changes.'),
        variant: 'destructive',
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetRoleDefaultsApi,
    onSuccess: (r) => {
      toast({ title: 'Role reset', description: r.message });
      setPending({});
      void qc.invalidateQueries({ queryKey: ['admin-permissions', 'rules'] });
    },
    onError: (err) => {
      toast({
        title: 'Reset failed',
        description: getApiErrorMessage(err, 'Could not reset role.'),
        variant: 'destructive',
      });
    },
  });

  // Default-select first non-super-admin role
  useEffect(() => {
    if (selectedRoleId || !rolesQuery.data) return;
    const first = rolesQuery.data.find((r) => r.name !== 'SUPER_ADMIN') ?? rolesQuery.data[0];
    if (first) setSelectedRoleId(first.id);
  }, [rolesQuery.data, selectedRoleId]);

  // Reset pending changes when role switches
  useEffect(() => {
    setPending({});
  }, [selectedRoleId]);

  const selectedRole = useMemo(
    () => rolesQuery.data?.find((r) => r.id === selectedRoleId) ?? null,
    [rolesQuery.data, selectedRoleId],
  );
  const isSuperAdminRole = selectedRole?.name === 'SUPER_ADMIN';

  const ruleMap = useMemo(() => {
    const m = new Map<string, IAdminRule>();
    for (const r of rulesQuery.data ?? []) {
      m.set(cellKey(r.screenCode, r.tabCode, r.permissionCode), r);
    }
    return m;
  }, [rulesQuery.data]);

  const stateFor = (screenCode: string, tabCode: string | null, action: string): CellState => {
    const k = cellKey(screenCode, tabCode, action);
    if (pending[k]) return pending[k];
    return ruleToState(ruleMap.get(k));
  };

  const setCellState = (
    screenCode: string,
    tabCode: string | null,
    action: string,
    target: CellState,
  ) => {
    const k = cellKey(screenCode, tabCode, action);
    const initial = ruleToState(ruleMap.get(k));
    setPending((p) => {
      const copy = { ...p };
      if (target === initial) {
        delete copy[k];
      } else {
        copy[k] = target;
      }
      return copy;
    });
  };

  const toggleCell = (screenCode: string, tabCode: string | null, action: string) => {
    if (!selectedRoleId || isSuperAdminRole) return;
    if (RESERVED_SCREENS.has(screenCode)) return;
    const current = stateFor(screenCode, tabCode, action);
    setCellState(screenCode, tabCode, action, nextState(current));
  };

  // Row bulk actions — Full grants V+C+U+D; Clear inherits every action cell in the row.
  const setRow = (
    screenCode: string,
    tabCode: string | null,
    mode: 'full' | 'clear',
  ) => {
    if (!selectedRoleId || isSuperAdminRole) return;
    if (RESERVED_SCREENS.has(screenCode)) return;
    const allActions = catalogQuery.data?.actions ?? [];
    if (mode === 'full') {
      for (const a of allActions) {
        if (!FULL_CRUD_CODES.includes(a.code)) continue;
        setCellState(screenCode, tabCode, a.code, 'allow');
      }
    } else {
      for (const a of allActions) {
        setCellState(screenCode, tabCode, a.code, 'inherit');
      }
    }
  };

  const pendingChanges: IMatrixChange[] = useMemo(() => {
    if (!selectedRoleId) return [];
    const out: IMatrixChange[] = [];
    for (const [k, state] of Object.entries(pending)) {
      const [screenCode, tabCodeRaw, permissionCode] = k.split('::');
      const tabCode = tabCodeRaw || null;
      if (state === 'inherit') {
        out.push({ roleId: selectedRoleId, screenCode, tabCode, permissionCode, clear: true });
      } else {
        out.push({
          roleId: selectedRoleId,
          screenCode,
          tabCode,
          permissionCode,
          isAllowed: state === 'allow',
        });
      }
    }
    return out;
  }, [pending, selectedRoleId]);

  const filteredScreens = useMemo(() => {
    const list = catalogQuery.data?.screens ?? [];
    return list
      .filter((s) => area === 'all' || s.area === area)
      .filter((s) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.tabs.some((t) => t.name.toLowerCase().includes(q))
        );
      })
      .filter((s) => !viewOnly || stateFor(s.code, null, 'VIEW') === 'allow');
  }, [catalogQuery.data, area, search, viewOnly, ruleMap, pending]);

  const actions = catalogQuery.data?.actions ?? [];
  const areas = useMemo(() => {
    const set = new Set<string>();
    for (const s of catalogQuery.data?.screens ?? []) set.add(s.area);
    return ['all', ...[...set].sort()];
  }, [catalogQuery.data]);

  const isLoading = rolesQuery.isLoading || catalogQuery.isLoading;
  const pendingCount = Object.keys(pending).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Role Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Configure which roles can access which screens and tabs. Changes take effect within 60 seconds for affected users.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[220px]">
          <label className="text-sm font-medium">Role</label>
          <Select
            value={selectedRoleId ?? undefined}
            onValueChange={(v) => setSelectedRoleId(v)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {rolesQuery.data?.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.displayName ?? r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[180px]">
          <label className="text-sm font-medium">Area</label>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {areas.map((a) => (
                <SelectItem key={a} value={a}>
                  {a === 'all' ? 'All areas' : a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[240px] flex-1">
          <label className="text-sm font-medium">Search</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Screen code, name, or tab"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">View</label>
          <button
            type="button"
            onClick={() => setViewOnly((v) => !v)}
            className={`h-9 px-3 rounded-md border text-sm font-medium transition ${viewOnly ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-background text-muted-foreground border-input hover:bg-muted'}`}
          >
            {viewOnly ? '● View = Allow' : '○ View = Allow'}
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium invisible">Reset</label>
          <Button
            variant="outline"
            disabled={area === 'all' && !search && !viewOnly}
            onClick={() => { setArea('all'); setSearch(''); setViewOnly(false); }}
          >
            Reset
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} unsaved change{pendingCount === 1 ? '' : 's'}</Badge>
          )}
          <Button
            variant="outline"
            disabled={!selectedRoleId || isSuperAdminRole || resetMutation.isPending}
            onClick={() => {
              if (!selectedRoleId) return;
              if (!confirm(`Reset all permissions for "${selectedRole?.displayName ?? selectedRole?.name}" to system defaults?`)) return;
              resetMutation.mutate(selectedRoleId);
            }}
          >
            Reset Role
          </Button>
          <Button
            disabled={pendingCount === 0 || applyMutation.isPending || isSuperAdminRole}
            onClick={() => applyMutation.mutate(pendingChanges)}
          >
            {applyMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {isSuperAdminRole && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <strong>SUPER_ADMIN bypasses the permission matrix.</strong> Super-admins always have full access.
          To limit access for a user, assign a different role instead.
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium w-[340px]">Screen / Tab</th>
              {actions.map((a) => (
                <th key={a.code} className="text-center px-2 py-2 font-medium w-[80px]">
                  {a.name}
                </th>
              ))}
              <th className="text-center px-2 py-2 font-medium w-[140px]">Row</th>
            </tr>
          </thead>
          <tbody>
            {filteredScreens.map((screen) => {
              const reserved = RESERVED_SCREENS.has(screen.code);
              const disabled = isSuperAdminRole || reserved || screen.isDisabled;
              const rowDim = screen.isDisabled ? 'opacity-60' : '';
              return (
                <>
                  <tr key={screen.id} className={`border-t ${rowDim}`}>
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {screen.name}{' '}
                        <span className="text-xs text-muted-foreground">({screen.code})</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{screen.route}</div>
                      {reserved && (
                        <div className="text-xs text-amber-700 mt-1">
                          Reserved — SUPER_ADMIN only to prevent lock-out.
                        </div>
                      )}
                    </td>
                    {actions.map((a) => {
                      const state = stateFor(screen.code, null, a.code);
                      const isPending = !!pending[cellKey(screen.code, null, a.code)];
                      return (
                        <td key={a.code} className="text-center px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => toggleCell(screen.code, null, a.code)}
                            disabled={disabled}
                            className={`inline-flex items-center justify-center w-9 h-9 rounded-md border font-medium transition ${cellColor(state)} ${isPending ? 'ring-2 ring-primary' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:brightness-95'}`}
                            title={`${screen.code} · ${a.name} · ${state}`}
                          >
                            {cellGlyph(state)}
                          </button>
                        </td>
                      );
                    })}
                    <td className="text-center px-2 py-1.5">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => setRow(screen.code, null, 'full')}
                          disabled={disabled}
                          className="text-xs px-2 py-1 rounded border bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Grant VIEW + CREATE + UPDATE + DELETE"
                        >
                          Full
                        </button>
                        <button
                          type="button"
                          onClick={() => setRow(screen.code, null, 'clear')}
                          disabled={disabled}
                          className="text-xs px-2 py-1 rounded border bg-muted hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Clear all actions in this row"
                        >
                          Clear
                        </button>
                      </div>
                    </td>
                  </tr>
                  {screen.tabs.filter((tab) => !viewOnly || stateFor(screen.code, tab.code, 'VIEW') === 'allow').map((tab) => {
                    const tabDim = tab.isDisabled ? 'opacity-60' : '';
                    return (
                      <tr key={`${screen.id}::${tab.id}`} className={`border-t border-dashed bg-muted/20 ${tabDim}`}>
                        <td className="px-3 py-2 pl-10 text-muted-foreground">
                          <span className="text-xs">Tab ·</span> {tab.name}{' '}
                          <span className="text-xs opacity-60">({tab.code})</span>
                        </td>
                        {actions.map((a) => {
                          const state = stateFor(screen.code, tab.code, a.code);
                          const isPending = !!pending[cellKey(screen.code, tab.code, a.code)];
                          const cellDisabled = isSuperAdminRole || reserved || tab.isDisabled;
                          return (
                            <td key={a.code} className="text-center px-2 py-1.5">
                              <button
                                type="button"
                                onClick={() => toggleCell(screen.code, tab.code, a.code)}
                                disabled={cellDisabled}
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-md border font-medium transition ${cellColor(state)} ${isPending ? 'ring-2 ring-primary' : ''} ${cellDisabled ? 'cursor-not-allowed opacity-50' : 'hover:brightness-95'}`}
                                title={`${screen.code}/${tab.code} · ${a.name} · ${state}`}
                              >
                                {cellGlyph(state)}
                              </button>
                            </td>
                          );
                        })}
                        <td className="text-center px-2 py-1.5">
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => setRow(screen.code, tab.code, 'full')}
                              disabled={isSuperAdminRole || reserved || tab.isDisabled}
                              className="text-xs px-2 py-1 rounded border bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Grant VIEW + CREATE + UPDATE + DELETE for this tab"
                            >
                              Full
                            </button>
                            <button
                              type="button"
                              onClick={() => setRow(screen.code, tab.code, 'clear')}
                              disabled={isSuperAdminRole || reserved || tab.isDisabled}
                              className="text-xs px-2 py-1 rounded border bg-muted hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Clear all actions for this tab"
                            >
                              Clear
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
            {filteredScreens.length === 0 && (
              <tr>
                <td colSpan={actions.length + 2} className="text-center text-muted-foreground py-8">
                  No screens match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-100 text-green-700 mr-1">●</span>
          Allow
        </span>
        <span>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-100 text-red-700 mr-1">✗</span>
          Deny (overrides any Allow)
        </span>
        <span>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-muted text-muted-foreground mr-1">○</span>
          Inherit / default deny
        </span>
      </div>
    </div>
  );
}
