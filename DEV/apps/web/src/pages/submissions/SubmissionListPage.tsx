import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Search, FileCheck2, Copy, Filter, Trash2, Building2, Calendar, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { SubmissionStatusBadge } from '@/components/submission/SubmissionStatusBadge';
import { useSubmissions, useSubmissionDepartments, useDeleteSubmission } from '@/hooks/useSubmission';
import { submissionApi } from '@/api/submission.api';
import type { SubmissionType, SubmissionStatus, IStatusCatalogItem } from '@/api/submission.api';
import { useAuthStore } from '@/stores/auth.store';

import { DateRangePresetPicker } from '@/components/filters/DateRangePresetPicker';

function fmtMoney(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' ₫';
}

function fullName(s: { firstName: string; middleName?: string | null; surname: string }) {
  return [s.surname, s.middleName, s.firstName].filter(Boolean).join(' ');
}

function Truncate({ text, maxW = 'max-w-[200px]' }: { text?: string | null; maxW?: string }) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={`block truncate ${maxW}`} title={text}>
      {text}
    </span>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  colorClass?: string;
}

function StatCard({ label, value, colorClass = 'text-foreground' }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${colorClass}`}>{value}</p>
    </div>
  );
}

// ─── Submission Card (mobile) ─────────────────────────────────────────────────

interface SubmissionCardProps {
  s: any;
  idx: number;
  page: number;
  type: SubmissionType;
  approvedColor: string;
  currentUser: any;
  onNavigate: (id: string) => void;
  onClone: (s: any) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

function SubmissionCard({ s, idx, page, type, approvedColor, currentUser, onNavigate, onClone, onDelete }: SubmissionCardProps) {
  const totalIncVat = (s.expenseLines ?? []).reduce((sum: number, l: any) => sum + (l.amountIncVat ?? 0), 0);
  const signedContract = (s.attachments ?? []).find((a: any) => a.fileType === 'signed_contract');
  const rowNum = (page - 1) * 20 + idx + 1;
  const isAdmin = currentUser?.hvRoles?.includes('admin');
  const reviewSteps = (s.approvalSteps ?? []).filter((st: any) => st.stepType === 'REVIEW');
  const approveSteps = (s.approvalSteps ?? []).filter((st: any) => st.stepType === 'APPROVE');
  const needsReview = !isAdmin && reviewSteps.some((st: any) => st.approverId === currentUser?.staffId && st.status === 'in_progress');
  const needsApproval = !isAdmin && approveSteps.some((st: any) => st.approverId === currentUser?.staffId && st.status === 'in_progress');

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors"
      onClick={() => onNavigate(s.id)}
    >
      {/* Top row: code + status + actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted-foreground w-5 shrink-0">{rowNum}.</span>
          <Link
            to={`/submissions/${s.id}`}
            className="font-mono text-sm font-semibold text-primary hover:underline shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {s.code}
          </Link>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {needsReview && (
            <span className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500 text-white">Thẩm định</span>
          )}
          {needsApproval && (
            <span className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-blue-600 text-white">Phê duyệt</span>
          )}
          <SubmissionStatusBadge status={s.status} />
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-medium leading-snug mb-2 line-clamp-2">{s.title || <span className="text-muted-foreground">—</span>}</p>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <Building2 size={11} />
          {s.department.name}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {format(new Date(s.submittedDate), 'dd/MM/yyyy')}
        </span>
        {type === 'MS' && totalIncVat > 0 && (
          <span className="font-medium text-foreground tabular-nums">{fmtMoney(totalIncVat)}</span>
        )}
        {type === 'NT' && s.supplier && (
          <span className="truncate max-w-[160px]">{s.supplier}</span>
        )}
        {type === 'NT' && signedContract && (
          <a
            href={signedContract.publicUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-green-600 font-medium"
          >
            <FileCheck2 size={11} /> HĐ đã ký
          </a>
        )}
      </div>

      {/* Reviewer / Approver + actions */}
      <div className="flex items-end justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          {reviewSteps.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
              <User size={11} className="shrink-0" />
              <span className="truncate">
                {reviewSteps.map((st: any, i: number) => (
                  <span key={st.id}>
                    {i > 0 && ', '}
                    <span style={{ color: ['approved', 'rejected'].includes(st.status) ? approvedColor : undefined }}>
                      {fullName(st.approver)}
                    </span>
                  </span>
                ))}
              </span>
            </div>
          )}
          {approveSteps.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
              <User size={11} className="shrink-0 opacity-0" />
              <span className="truncate">
                {approveSteps.map((st: any, i: number) => (
                  <span key={st.id}>
                    {i > 0 && ', '}
                    <span style={{ color: ['approved', 'rejected'].includes(st.status) ? approvedColor : undefined }}>
                      {fullName(st.approver)}
                    </span>
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            title="Tạo lại tờ trình"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onClone(s)}
          >
            <Copy size={14} />
          </button>
          {currentUser?.staffId === s.submitter.id && s.status === 'draft' && (
            <button
              title="Xóa tờ trình"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
              onClick={(e) => onDelete(s.id, e)}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Submission Table ─────────────────────────────────────────────────────────

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'draft', label: 'Nháp' },
  { value: 'pending_review', label: 'Chờ thẩm định' },
  { value: 'in_review', label: 'Chờ phê duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
];

interface SubmissionTableProps {
  type: SubmissionType;
  status: SubmissionStatus | '';
  q: string;
  approvedColor: string;
  department?: string;
  supplier?: string;
  reviewerId?: string;
  approverId?: string;
  submittedDateFrom?: string;
  submittedDateTo?: string;
}

function SubmissionTable({ type, status, q, approvedColor, department, supplier, reviewerId, approverId, submittedDateFrom, submittedDateTo }: SubmissionTableProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const { mutateAsync: del } = useDeleteSubmission();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Xóa tờ trình này? Hành động không thể hoàn tác.')) return;
    await del(id).catch(() => {});
  };

  useEffect(() => { setPage(1); }, [q, status, department, supplier, reviewerId, approverId, submittedDateFrom, submittedDateTo]);

  const { data, isLoading } = useSubmissions({
    type,
    q: q || undefined,
    status: status ? (status as SubmissionStatus) : undefined,
    department: department || undefined,
    supplier: supplier || undefined,
    reviewerId: reviewerId || undefined,
    approverId: approverId || undefined,
    submittedDateFrom: submittedDateFrom || undefined,
    submittedDateTo: submittedDateTo || undefined,
    page,
    limit: 20,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Đang tải...</div>;
  }

  if (!data?.items?.length) {
    return <div className="py-8 text-center text-muted-foreground">Không có tờ trình nào.</div>;
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="sm:hidden space-y-2">
        {data.items.map((s, idx) => (
          <SubmissionCard
            key={s.id}
            s={s}
            idx={idx}
            page={page}
            type={type}
            approvedColor={approvedColor}
            currentUser={currentUser}
            onNavigate={(id) => navigate(`/submissions/${id}`)}
            onClone={(s) => navigate('/submissions/new', { state: { cloneFrom: s } })}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead className="whitespace-nowrap">MÃ TỜ TRÌNH</TableHead>
                <TableHead className="whitespace-nowrap">BỘ PHẬN</TableHead>
                <TableHead className="whitespace-nowrap">NGÀY TRÌNH</TableHead>
                <TableHead className="whitespace-nowrap">VỀ VIỆC</TableHead>
                {type === 'NT' && <TableHead className="whitespace-nowrap">NHÀ CUNG CẤP</TableHead>}
                {type === 'MS' && <TableHead className="whitespace-nowrap text-right">SỐ TIỀN</TableHead>}
                {type === 'NT' && <TableHead className="whitespace-nowrap">HĐ ĐÃ KÝ</TableHead>}
                <TableHead className="whitespace-nowrap">THẨM ĐỊNH</TableHead>
                <TableHead className="whitespace-nowrap">PHÊ DUYỆT</TableHead>
                <TableHead className="whitespace-nowrap">TRẠNG THÁI</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((s, idx) => {
                const totalIncVat = (s.expenseLines ?? []).reduce((sum, l) => sum + (l.amountIncVat ?? 0), 0);
                const signedContract = (s.attachments ?? []).find((a) => a.fileType === 'signed_contract');
                const rowNum = (page - 1) * 20 + idx + 1;
                const isAdmin = currentUser?.hvRoles?.includes('admin');
                const reviewSteps = (s.approvalSteps ?? []).filter((st) => st.stepType === 'REVIEW');
                const approveSteps = (s.approvalSteps ?? []).filter((st) => st.stepType === 'APPROVE');
                const needsReview = !isAdmin && reviewSteps.some((st) => st.approverId === currentUser?.staffId && st.status === 'in_progress');
                const needsApproval = !isAdmin && approveSteps.some((st) => st.approverId === currentUser?.staffId && st.status === 'in_progress');

                return (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`/submissions/${s.id}`)}
                  >
                    <TableCell className="text-center text-xs text-muted-foreground">{rowNum}</TableCell>

                    <TableCell>
                      <Link
                        to={`/submissions/${s.id}`}
                        className="font-mono text-sm font-medium text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.code}
                      </Link>
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm">{s.department.name}</TableCell>

                    <TableCell className="whitespace-nowrap text-sm font-mono">
                      {format(new Date(s.submittedDate), 'dd/MM/yyyy')}
                    </TableCell>

                    <TableCell className="max-w-[260px]">
                      <Truncate text={s.title} maxW="max-w-[240px]" />
                    </TableCell>

                    {type === 'NT' && (
                      <TableCell className="max-w-[160px]">
                        <Truncate text={s.supplier} maxW="max-w-[150px]" />
                      </TableCell>
                    )}

                    {type === 'MS' && (
                      <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                        {totalIncVat > 0 ? fmtMoney(totalIncVat) : <span className="text-muted-foreground">0 ₫</span>}
                      </TableCell>
                    )}

                    {type === 'NT' && (
                      <TableCell className="text-center">
                        {signedContract ? (
                          <a href={signedContract.publicUrl} target="_blank" rel="noreferrer" title={signedContract.name} onClick={(e) => e.stopPropagation()}>
                            <FileCheck2 size={16} className="mx-auto text-green-600" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}

                    <TableCell className="whitespace-nowrap text-sm">
                      {reviewSteps.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        reviewSteps.map((st, i) => (
                          <span key={st.id}>
                            {i > 0 && ', '}
                            <span style={{ color: ['approved', 'rejected'].includes(st.status) ? approvedColor : undefined }}>
                              {fullName(st.approver)}
                            </span>
                          </span>
                        ))
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm">
                      {approveSteps.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        approveSteps.map((st, i) => (
                          <span key={st.id}>
                            {i > 0 && ', '}
                            <span style={{ color: ['approved', 'rejected'].includes(st.status) ? approvedColor : undefined }}>
                              {fullName(st.approver)}
                            </span>
                          </span>
                        ))
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <SubmissionStatusBadge status={s.status} />
                        {needsReview && (
                          <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-500 text-white">
                            ▸ Thẩm định
                          </span>
                        )}
                        {needsApproval && (
                          <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-600 text-white">
                            ▸ Phê duyệt
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        <button
                          title="Tạo lại tờ trình"
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => navigate('/submissions/new', { state: { cloneFrom: s } })}
                        >
                          <Copy size={14} />
                        </button>
                        {currentUser?.staffId === s.submitter.id && s.status === 'draft' && (
                          <button
                            title="Xóa tờ trình"
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                            onClick={(e) => handleDelete(s.id, e)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {data.totalPages > 1 && (
        <TablePagination
          page={page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SubmissionListPage() {
  const navigate = useNavigate();
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState<SubmissionType>('MS');
  const [status, setStatus] = useState<SubmissionStatus | ''>('');

  // Filter panel state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterReviewerId, setFilterReviewerId] = useState('');
  const [filterApproverId, setFilterApproverId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const activeFilterCount = [filterDepartment, filterReviewerId, filterApproverId, filterDateFrom, filterDateTo, type === 'NT' ? filterSupplier : ''].filter(Boolean).length;
  const clearFilters = () => {
    setFilterDepartment(''); setFilterSupplier(''); setFilterReviewerId('');
    setFilterApproverId(''); setFilterDateFrom(''); setFilterDateTo('');
  };

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const { data: departments = [] } = useSubmissionDepartments();
  const { data: reviewers = [] } = useQuery({ queryKey: ['filter-staff', 'reviewer'], queryFn: () => submissionApi.listFilterStaff('reviewer'), staleTime: Infinity });
  const { data: approvers = [] } = useQuery({ queryKey: ['filter-staff', 'approver'], queryFn: () => submissionApi.listFilterStaff('approver'), staleTime: Infinity });

  const { data: stats } = useQuery({
    queryKey: ['submissions', 'stats'],
    queryFn: submissionApi.stats,
    staleTime: 0,
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['submission-status-catalog'],
    queryFn: submissionApi.statusCatalog,
    staleTime: Infinity,
  });

  const approvedColor = (catalog.find((c: IStatusCatalogItem) => c.code === 'approved')?.colorHex) ?? '#22c55e';

  return (
    <div className="space-y-4 p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold">Tờ trình</h1>
        <Button size="sm" onClick={() => navigate('/submissions/new')}>
          <Plus size={15} className="mr-1.5" />
          <span className="hidden xs:inline">Tạo tờ trình</span>
          <span className="xs:hidden">Tạo mới</span>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Tổng số" value={stats?.total ?? 0} />
        <StatCard label="Chờ thẩm định" value={stats?.pending_review ?? 0} colorClass="text-amber-600" />
        <StatCard label="Chờ phê duyệt" value={stats?.in_review ?? 0} colorClass="text-blue-600" />
        <StatCard label="Đã phê duyệt" value={stats?.approved ?? 0} colorClass="text-green-600" />
      </div>

      {/* Search + Filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm kiếm mã, tiêu đề..."
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </div>
        <Button variant={filterOpen ? 'default' : 'outline'} size="sm" onClick={() => setFilterOpen(!filterOpen)}>
          <Filter size={14} className="mr-1.5" /> Lọc
          {activeFilterCount > 0 && (
            <span className="ml-1.5 rounded-full bg-white text-primary text-[10px] font-bold px-1.5 leading-4">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:flex" onClick={clearFilters}>
            Xóa lọc
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="border rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Bộ phận</p>
            <Select value={filterDepartment || 'all'} onValueChange={(v) => setFilterDepartment(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {type === 'NT' && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Nhà cung cấp</p>
              <Input className="h-10 text-sm" placeholder="Tìm nhà cung cấp..." value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} />
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Người thẩm định</p>
            <Select value={filterReviewerId || 'all'} onValueChange={(v) => setFilterReviewerId(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {reviewers.map((r) => <SelectItem key={r.id} value={r.id}>{fullName(r)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Người phê duyệt</p>
            <Select value={filterApproverId || 'all'} onValueChange={(v) => setFilterApproverId(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {approvers.map((a) => <SelectItem key={a.id} value={a.id}>{fullName(a)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <DateRangePresetPicker
            label="Ngày trình"
            value={{ startDate: filterDateFrom, endDate: filterDateTo }}
            onChange={({ startDate, endDate }) => {
              setFilterDateFrom(startDate ?? '');
              setFilterDateTo(endDate ?? '');
            }}
          />
        </div>
      )}

      {/* Tabs: MS / NT */}
      <Tabs value={type} onValueChange={(v) => setType(v as SubmissionType)}>
        <TabsList>
          <TabsTrigger value="MS">Mua sắm (MS)</TabsTrigger>
          <TabsTrigger value="NT">Nguyên tắc (NT)</TabsTrigger>
        </TabsList>

        {(['MS', 'NT'] as SubmissionType[]).map((t) => (
          <TabsContent key={t} value={t} className="mt-4 space-y-3">
            {/* Status filter pills */}
            <div className="flex gap-2 flex-wrap">
              {STATUS_TABS.map((st) => (
                <Button
                  key={st.value}
                  variant={status === st.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatus(st.value as SubmissionStatus | '')}
                >
                  {st.label}
                </Button>
              ))}
            </div>

            <SubmissionTable
              type={t} status={status} q={q} approvedColor={approvedColor}
              department={filterDepartment}
              supplier={t === 'NT' ? filterSupplier : undefined}
              reviewerId={filterReviewerId}
              approverId={filterApproverId}
              submittedDateFrom={filterDateFrom}
              submittedDateTo={filterDateTo}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
