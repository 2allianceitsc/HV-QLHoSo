import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { CrudTable } from '@/components/CrudTable';
import { RoleBadge } from '@/components/RoleBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useEmployees, useDeleteEmployee, useEmployeeTimezones } from '@/hooks/useEmployee';
import { usePermission } from '@/hooks/usePermission';
import { useDepartments } from '@/hooks/useDepartment';
import { useScanEmployeePhotos } from '@/hooks/useSystem';
import { Upload, Wifi, AlertTriangle } from 'lucide-react';
import type { IEmployee } from '@/api/employee.api';
import type { IEmployeePhotoUrlScanResult } from '@/api/system.api';
import { safeArray } from '@/lib/safeArray';
import { getApiErrorMessage } from '@/lib/apiError';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { SystemWarningsPanel } from '@/components/SystemWarningsPanel';
import { UserAvatar } from '@/components/UserAvatar';
import { SearchInput, useFilterState } from '@/components/filters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const columns: ColumnDef<IEmployee>[] = [
  {
    id: 'avatar',
    header: '',
    cell: ({ row }) => {
      const e = row.original;
      return <UserAvatar src={e.photoBusiness} firstName={e.firstName} surname={e.surname} size="sm" />;
    },
  },
  { accessorKey: 'employeeId', header: 'Employee ID' },
  {
    id: 'fullName',
    header: 'Full Name',
    cell: ({ row }) => {
      const e = row.original;
      return [e.firstName, e.middleName, e.surname].filter(Boolean).join(' ');
    },
  },
  {
    id: 'username',
    header: 'Username',
    cell: ({ row }) => row.original.userLogin?.username ?? '—',
  },
  {
    id: 'email',
    header: 'Email',
    cell: ({ row }) => row.original.userLogin?.email ?? '—',
  },
  {
    id: 'department',
    header: 'Department',
    cell: ({ row }) => row.original.department?.name ?? '—',
  },
  {
    id: 'roles',
    header: 'Roles',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.staffRoles.length === 0
          ? <span className="text-muted-foreground text-xs">—</span>
          : row.original.staffRoles.map((sr) => (
              <RoleBadge key={sr.id} roleName={sr.role.name} displayName={sr.role.displayName} colorHex={sr.role.colorHex} iconId={sr.role.iconId} />
            ))}
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) =>
      row.original.isDisabled ? (
        <Badge variant="secondary" className="text-xs">Disabled</Badge>
      ) : (
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Active</Badge>
      ),
  },
];

const STATUS_OPTIONS = [
  { id: 'true', name: 'Active' },
  { id: 'false', name: 'Disabled' },
];

type EmployeeUrlFilter = {
  search: string;
  departmentId: string;
  isActive: string;
  timezone: string;
} & Record<string, unknown>;

const DEFAULT_FILTER: EmployeeUrlFilter = { search: '', departmentId: '', isActive: '', timezone: '' };

export function EmployeeListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [filter, setFilter, resetFilter] = useFilterState<EmployeeUrlFilter>({
    key: 'hvflow.employees.filter',
    defaultValue: DEFAULT_FILTER,
    mode: 'localStorage',
  });

  // Page is in-memory only; resets on every filter change
  const [page, setPage] = useState(1);

  function handleReset() {
    resetFilter();
    setPage(1);
  }

  const activeCount = [filter.search, filter.departmentId, filter.isActive, filter.timezone]
    .filter(Boolean).length;

  const [scanResult, setScanResult] = useState<IEmployeePhotoUrlScanResult | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);

  const { data: timezonesData } = useEmployeeTimezones();
  const timezoneOptions = [
    { id: '__none__', name: '(No timezone)' },
    ...(timezonesData ?? []).map((tz) => ({ id: tz, name: tz })),
  ];

  const { data, isLoading } = useEmployees({
    page,
    limit: 20,
    search: filter.search || undefined,
    departmentId: filter.departmentId || undefined,
    isActive: filter.isActive || undefined,
    timezone: filter.timezone || undefined,
  });
  const { data: deptData } = useDepartments({ limit: 100 });
  const deleteMutation = useDeleteEmployee();
  const scanMutation = useScanEmployeePhotos();

  const canCreate = usePermission('E01', null, 'CREATE');
  const canDelete = usePermission('E01', null, 'DELETE');
  const canImport = usePermission('E03', null, 'CREATE');

  function updateFilter(patch: Partial<EmployeeUrlFilter>) {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  function handleRowClick(row: IEmployee) {
    navigate(`/employees/${row.id}`);
  }

  async function handleDelete(row: IEmployee) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Employee deleted' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Failed to delete'), variant: 'destructive' });
    }
  }

  async function handleScanPhotos() {
    try {
      const result = await scanMutation.mutateAsync();
      setScanResult(result);
      setShowScanModal(true);
      if (result.brokenCount === 0) {
        toast({ title: 'All photos are accessible ✓' });
      } else {
        toast({
          title: `Found ${result.brokenCount} broken photo URL${result.brokenCount !== 1 ? 's' : ''}`,
          variant: 'destructive',
        });
      }
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(err, 'Failed to scan photos'),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage your workforce</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {canImport && (
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate('/employees/import')}>
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
          )}
          {canCreate && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleScanPhotos}
              disabled={scanMutation.isPending}
            >
              <Wifi className={`mr-2 h-4 w-4 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
              Scan Photos
            </Button>
          )}
        </div>
      </div>

      <SystemWarningsPanel category="employees" />

      {/* Filters — all URL-synced */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <SearchInput
          value={filter.search}
          onChange={(v) => updateFilter({ search: v })}
          debounceMs={300}
          placeholder="Search by name, email, or ID..."
          className="w-full sm:max-w-xs"
          testId="employee-search"
        />
        <EntitySelect
          value={filter.departmentId}
          onValueChange={(value) => updateFilter({ departmentId: value })}
          options={deptData?.data ?? []}
          placeholder="Filter by department"
          emptyLabel="All Departments"
          entityType="DEPARTMENT"
          triggerClassName="w-full sm:w-[16rem]"
          testId="employee-department-filter"
        />
        <EntitySelect
          value={filter.isActive}
          onValueChange={(value) => updateFilter({ isActive: value })}
          options={STATUS_OPTIONS}
          placeholder="Status"
          emptyLabel="All Statuses"
          triggerClassName="w-full sm:w-[12rem]"
          testId="employee-status-filter"
        />
        <EntitySelect
          value={filter.timezone}
          onValueChange={(value) => updateFilter({ timezone: value })}
          options={timezoneOptions}
          placeholder="Timezone"
          emptyLabel="All Timezones"
          triggerClassName="w-full sm:w-[16rem]"
          testId="employee-timezone-filter"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={activeCount === 0}
          data-testid="employee-reset-filter"
        >
          Reset
        </Button>
      </div>

      <CrudTable
        columns={columns}
        data={safeArray(data?.data)}
        isLoading={isLoading}
        showSearch={false}
        pagination={data?.pagination}
        resourceName="employees"
        onAdd={canCreate ? () => navigate('/employees/new') : undefined}
        onView={handleRowClick}
        onDelete={canDelete ? handleDelete : undefined}
        onSearch={() => {}}
        onPageChange={setPage}
        addLabel="Add Employee"
      />

      <Dialog open={showScanModal} onOpenChange={setShowScanModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Photo URL Scan Results</DialogTitle>
            <DialogDescription>
              Scanned {scanResult?.totalChecked ?? 0} employee photos at{' '}
              {scanResult?.scannedAt ? new Date(scanResult.scannedAt).toLocaleString() : 'N/A'}
            </DialogDescription>
          </DialogHeader>

          {scanResult && (
            <div className="space-y-4">
              {scanResult.brokenCount === 0 ? (
                <div className="rounded-lg border border-green-300/60 bg-green-50 dark:bg-green-950/20 px-4 py-4 text-center">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    ✓ All employee photos are accessible
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {scanResult.brokenCount} employee profile photo URL
                      {scanResult.brokenCount !== 1 ? 's are' : ' is'} unreachable
                    </p>
                  </div>
                  <div className="space-y-3">
                    {scanResult.broken.map((item) => (
                      <div
                        key={item.staffId}
                        className="rounded-lg border border-red-200/50 bg-red-50 dark:bg-red-950/20 p-3 space-y-2"
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-red-900 dark:text-red-200">{item.fullName}</p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">ID: {item.staffId}</p>
                          </div>
                        </div>
                        <div className="ml-7 space-y-1 text-xs">
                          <p className="text-red-700 dark:text-red-300 font-mono break-all">{item.photoUrl}</p>
                          {item.httpStatus && (
                            <p className="text-red-600 dark:text-red-400">HTTP Status: {item.httpStatus}</p>
                          )}
                          {item.error && (
                            <p className="text-red-600 dark:text-red-400">Error: {item.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-blue-300/60 bg-blue-50 dark:bg-blue-950/20 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-2">How to fix:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Click on each employee above to edit their profile</li>
                      <li>Update or remove the broken photo URL in the Business Photo field</li>
                      <li>Save the changes and run the scan again to verify</li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
