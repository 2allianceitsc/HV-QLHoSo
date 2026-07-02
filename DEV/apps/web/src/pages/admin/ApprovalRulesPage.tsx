import { useMemo, useState } from 'react';
import { Tip } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCostCodes } from '@/hooks/useCostCode';
import { useHvDepartments } from '@/hooks/useHvAdmin';
import { useApprovalConfigApprovers, useApprovalConfigReviewers } from '@/hooks/useApprovalConfig';
import {
  useAddRuleDetail,
  useApprovalRule,
  useApprovalRulesList,
  useApprovalRulesMatrix,
  useCreateApprovalRule,
  useDeleteRuleDetail,
  useUpdateApprovalRule,
  useUpdateRuleDetail,
} from '@/hooks/useApprovalRules';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import type {
  IApprovalRule,
  IApprovalRuleDetail,
  StepMode,
  StepType,
} from '@/api/approvalRules.api';
import type { IStaffOption } from '@/api/approvalConfig.api';

function fullName(s: { firstName: string; middleName?: string | null; surname: string }) {
  return [s.surname, s.middleName, s.firstName].filter(Boolean).join(' ');
}

/** Minimal switch — no extra dep. */
function Switch({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

/** Input that formats with thousand separators on blur; stores raw digits on the form. */
function MoneyInput({
  initial,
  onCommit,
}: {
  initial: string | null;
  onCommit: (raw: string | null) => void;
}) {
  const fmt = (v: string | null) => (v ? new Intl.NumberFormat('vi-VN').format(BigInt(v)) : '');
  const [display, setDisplay] = useState<string>(fmt(initial));

  return (
    <Input
      className="h-8"
      inputMode="numeric"
      value={display}
      onChange={(e) => setDisplay(e.target.value)}
      onFocus={(e) => {
        // show raw digits while editing
        setDisplay(e.target.value.replace(/\D/g, ''));
      }}
      onBlur={() => {
        const digits = display.replace(/\D/g, '');
        const raw = digits === '' ? null : digits;
        setDisplay(fmt(raw));
        if (raw !== initial) onCommit(raw);
      }}
    />
  );
}

function formatThreshold(min: string | null, max: string | null): string {
  const f = (v: string | null) => (v ? `${(Number(v) / 1_000_000).toLocaleString('vi-VN')}tr` : '');
  if (!min && !max) return 'không ngưỡng';
  if (!min) return `<${f(max)}`;
  if (!max) return `≥${f(min)}`;
  return `${f(min)}–${f(max)}`;
}

export function ApprovalRulesPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Phân quyền duyệt theo loại chi phí</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cấu hình các bước duyệt theo cost code (Mua sắm) hoặc cấu hình chung cho tờ trình Nguyên tắc.
        </p>
      </div>

      <Tabs defaultValue="MS" className="w-full">
        <TabsList>
          <TabsTrigger value="MS">Mua sắm</TabsTrigger>
          <TabsTrigger value="NT">Nguyên tắc</TabsTrigger>
        </TabsList>
        <TabsContent value="MS"><MsTab /></TabsContent>
        <TabsContent value="NT"><NtTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ───────────────────────── MS tab ─────────────────────────

function MsTab() {
  return (
    <Tabs defaultValue="detail" className="w-full">
      <TabsList>
        <TabsTrigger value="detail">Chi tiết theo Cost Code</TabsTrigger>
        <TabsTrigger value="matrix">Tổng quan</TabsTrigger>
      </TabsList>
      <TabsContent value="detail"><MsDetailView /></TabsContent>
      <TabsContent value="matrix"><MsMatrixView /></TabsContent>
    </Tabs>
  );
}

function MsMatrixView() {
  const { data, isLoading } = useApprovalRulesMatrix();

  if (isLoading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;
  if (!data || data.rows.length === 0)
    return <div className="p-6 text-muted-foreground">Chưa có cấu hình rule nào.</div>;

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b">
          <tr>
            <th className="text-left p-2 font-medium sticky left-0 bg-muted/40">Cost code</th>
            {data.staff.map((s) => (
              <th key={s.id} className="text-left p-2 font-medium">{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.rows.map((row) => (
            <tr key={row.ruleId} className="hover:bg-muted/20">
              <td className="p-2 font-medium sticky left-0 bg-background">
                <div className="font-mono text-xs text-muted-foreground">{row.costCode.code}</div>
                <div>{row.costCode.name}</div>
              </td>
              {data.staff.map((s) => {
                const cells = row.cells[s.id];
                if (!cells?.length) return <td key={s.id} className="p-2 text-muted-foreground">—</td>;
                return (
                  <td key={s.id} className="p-2">
                    {cells.map((c, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium">{c.stepLabel ?? 'Bước'}</span>{' '}
                        <span className="text-muted-foreground">({formatThreshold(c.minAmount, c.maxAmount)})</span>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MsDetailView() {
  const { data: departments = [] } = useHvDepartments();
  const { data: costCodes = [] } = useCostCodes();
  const { data: existingRules = [] } = useApprovalRulesList('MS');
  const [selectedCostCodeId, setSelectedCostCodeId] = useState<string | null>(null);

  const ruleByCostCode = useMemo(() => {
    const m = new Map<string, IApprovalRule>();
    for (const r of existingRules) if (r.costCodeId) m.set(r.costCodeId, r);
    return m;
  }, [existingRules]);

  const codesByDept = useMemo(() => {
    const m = new Map<string, typeof costCodes>();
    for (const c of costCodes) {
      const list = m.get(c.departmentId) ?? [];
      list.push(c);
      m.set(c.departmentId, list);
    }
    return m;
  }, [costCodes]);

  const selectedRuleId = selectedCostCodeId ? ruleByCostCode.get(selectedCostCodeId)?.id ?? null : null;

  return (
    <div className="flex gap-4 min-h-[60vh]">
      {/* Sidebar */}
      <aside className="w-72 border rounded-lg overflow-y-auto max-h-[75vh]">
        {departments.filter((d) => !d.isDisabled).map((d) => {
          const codes = codesByDept.get(d.id) ?? [];
          if (!codes.length) return null;
          return (
            <div key={d.id} className="border-b last:border-b-0">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30">
                {d.name}
              </div>
              <ul>
                {codes.map((c) => {
                  const hasRule = ruleByCostCode.has(c.id);
                  const isActive = selectedCostCodeId === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedCostCodeId(c.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/40 ${
                          isActive ? 'bg-muted/60 font-medium' : ''
                        }`}
                      >
                        <span className="shrink-0">{hasRule ? '✅' : '⚠️'}</span>
                        <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                        <span className="truncate">{c.name}</span>
                        <ChevronRight size={12} className="ml-auto text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </aside>

      {/* Panel */}
      <section className="flex-1 border rounded-lg p-4">
        {!selectedCostCodeId ? (
          <p className="text-muted-foreground text-sm">Chọn một loại chi phí ở danh sách bên trái để cấu hình.</p>
        ) : (
          <RuleEditor
            submissionType="MS"
            costCodeId={selectedCostCodeId}
            ruleId={selectedRuleId}
          />
        )}
      </section>
    </div>
  );
}

// ───────────────────────── NT tab ─────────────────────────

function NtTab() {
  const { data: rules = [] } = useApprovalRulesList('NT');
  const rule = rules[0] ?? null;
  return (
    <section className="border rounded-lg p-4">
      <RuleEditor submissionType="NT" costCodeId={null} ruleId={rule?.id ?? null} />
    </section>
  );
}

// ───────────────────────── Rule editor (shared) ─────────────────────────

interface RuleEditorProps {
  submissionType: 'MS' | 'NT';
  costCodeId: string | null;
  ruleId: string | null;
}

function RuleEditor({ submissionType, costCodeId, ruleId }: RuleEditorProps) {
  const { data: rule, isLoading } = useApprovalRule(ruleId);
  const { data: reviewers = [] } = useApprovalConfigReviewers();
  const { data: approvers = [] } = useApprovalConfigApprovers();
  const { mutateAsync: createRule, isPending: creating } = useCreateApprovalRule();
  const { mutateAsync: updateRule } = useUpdateApprovalRule();
  const { mutateAsync: addDetail } = useAddRuleDetail();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [nameDirty, setNameDirty] = useState(false);

  // Reset local state when rule changes
  useMemo(() => {
    setName(rule?.name ?? '');
    setNameDirty(false);
  }, [rule?.id, rule?.name]);

  if (ruleId && isLoading) return <div className="text-muted-foreground">Đang tải...</div>;

  const handleCreate = async () => {
    try {
      await createRule({
        submissionType,
        costCodeId: submissionType === 'MS' ? costCodeId ?? undefined : undefined,
        name: name || undefined,
      });
      toast({ title: 'Đã tạo cấu hình rule' });
    } catch {
      toast({ title: 'Không thể tạo rule', variant: 'destructive' });
    }
  };

  const handleSaveHeader = async () => {
    if (!rule) return;
    try {
      await updateRule({ id: rule.id, data: { name } });
      setNameDirty(false);
      toast({ title: 'Đã lưu' });
    } catch {
      toast({ title: 'Không thể lưu', variant: 'destructive' });
    }
  };

  const handleToggleActive = async () => {
    if (!rule) return;
    try {
      await updateRule({ id: rule.id, data: { isActive: !rule.isActive } });
      toast({ title: rule.isActive ? 'Đã tắt rule' : 'Đã bật rule' });
    } catch {
      toast({ title: 'Không thể cập nhật trạng thái', variant: 'destructive' });
    }
  };

  const handleAddStep = async () => {
    if (!rule) return;
    const nextOrder = rule.details.length
      ? Math.max(...rule.details.map((d) => d.stepOrder)) + 1
      : 1;
    const stepType: StepType = nextOrder === 1 ? 'REVIEW' : 'APPROVE';
    const pool = stepType === 'REVIEW' ? reviewers : approvers;
    const firstPerson = pool[0];
    if (!firstPerson) {
      toast({
        title: stepType === 'REVIEW'
          ? 'Chưa có nhân sự nào đóng vai trò thẩm định.'
          : 'Chưa có nhân sự nào đóng vai trò phê duyệt.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await addDetail({
        ruleId: rule.id,
        data: {
          stepOrder: nextOrder,
          stepType,
          stepLabel: stepType === 'REVIEW' ? 'Thẩm định' : 'Phê duyệt',
          approverId: firstPerson.id,
          mode: 'ANY',
          minAmount: null,
          maxAmount: null,
        },
      });
    } catch (err) {
      toast({ title: extractApiMessage(err, 'Không thể thêm bước duyệt'), variant: 'destructive' });
    }
  };

  if (!rule) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {submissionType === 'MS'
            ? 'Loại chi phí này chưa có cấu hình duyệt.'
            : 'Tờ trình Nguyên tắc chưa có cấu hình duyệt chung.'}
        </p>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5 flex-1 max-w-md">
            <Label>Tên gợi nhớ (không bắt buộc)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Flow chi phí vật tư" />
          </div>
          <Button onClick={handleCreate} disabled={creating}>
            <Plus size={14} className="mr-1" /> Tạo cấu hình
          </Button>
        </div>
      </div>
    );
  }

  const groups = groupByStepOrder(rule.details);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5 flex-1 min-w-[240px]">
          <Label>Tên gợi nhớ</Label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setNameDirty(true); }}
            placeholder="VD: Flow chi phí vật tư"
          />
        </div>
        <Button variant="outline" disabled={!nameDirty} onClick={handleSaveHeader}>Lưu tên</Button>
        <Tip label="Bật/Tắt phân quyền">
          <span className="inline-flex items-center h-10">
            <Switch
              checked={rule.isActive}
              onChange={handleToggleActive}
              ariaLabel="Bật/Tắt phân quyền"
            />
          </span>
        </Tip>
      </div>

      {!rule.details.some((d) => d.stepType === 'APPROVE') && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          ⚠️ Chưa có bước Phê duyệt. Tờ trình submit sẽ bị từ chối cho đến khi thêm.
        </div>
      )}

      <div className="space-y-3">
        {groups.map(({ stepOrder, details }) => (
          <StepGroup
            key={stepOrder}
            ruleId={rule.id}
            submissionType={submissionType}
            stepOrder={stepOrder}
            details={details}
            reviewers={reviewers}
            approvers={approvers}
          />
        ))}
      </div>

      <Button variant="outline" onClick={handleAddStep}>
        <Plus size={14} className="mr-1" /> Thêm bước duyệt
      </Button>
    </div>
  );
}

interface StepGroupProps {
  ruleId: string;
  submissionType: 'MS' | 'NT';
  stepOrder: number;
  details: IApprovalRuleDetail[];
  reviewers: IStaffOption[];
  approvers: IStaffOption[];
}

interface DraftRow {
  localId: string;
  mode: StepMode;
  minAmount: string | null;
  maxAmount: string | null;
  departmentId: string | null;
}

const FALLBACK_DEPT_VALUE = '__fallback__';

function StepGroup({ ruleId, submissionType, stepOrder, details, reviewers, approvers }: StepGroupProps) {
  const { mutateAsync: addDetail } = useAddRuleDetail();
  const { mutateAsync: updateDetail } = useUpdateRuleDetail();
  const { mutateAsync: removeDetail } = useDeleteRuleDetail();
  const { data: departments = [] } = useHvDepartments();
  const { toast } = useToast();
  const first = details[0];
  const pool = first.stepType === 'REVIEW' ? reviewers : approvers;
  const isNt = submissionType === 'NT';
  const isMs = submissionType === 'MS';

  const hasFallback = isNt && details.some((d) => d.departmentId === null);

  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);

  const handleAddSibling = () => {
    // §8.3 UX: prefill min/max from first row (case A), leave approverId empty so user must pick.
    setDraftRows((prev) => [...prev, {
      localId: crypto.randomUUID(),
      mode: first.mode,
      minAmount: isMs ? (first.minAmount ?? null) : null,
      maxAmount: isMs ? (first.maxAmount ?? null) : null,
      departmentId: isNt ? null : null,
    }]);
  };

  const updateDraft = (localId: string, patch: Partial<Omit<DraftRow, 'localId'>>) =>
    setDraftRows((prev) => prev.map((r) => r.localId === localId ? { ...r, ...patch } : r));

  const removeDraft = (localId: string) =>
    setDraftRows((prev) => prev.filter((r) => r.localId !== localId));

  const commitDraft = async (localId: string, draft: DraftRow, approverId: string) => {
    try {
      await addDetail({
        ruleId,
        data: {
          stepOrder,
          stepType: first.stepType,
          stepLabel: first.stepLabel ?? undefined,
          approverId,
          mode: draft.mode,
          minAmount: isMs ? draft.minAmount : null,
          maxAmount: isMs ? draft.maxAmount : null,
          ...(isNt && { departmentId: draft.departmentId }),
        },
      });
      setDraftRows((prev) => prev.filter((r) => r.localId !== localId));
    } catch (err) {
      toast({ title: extractApiMessage(err, 'Không thể thêm dòng'), variant: 'destructive' });
    }
  };

  const updateField = async (
    detail: IApprovalRuleDetail,
    field: 'stepType' | 'stepLabel' | 'approverId' | 'mode' | 'minAmount' | 'maxAmount' | 'departmentId',
    value: string | StepType | StepMode | null,
  ) => {
    try {
      await updateDetail({ id: detail.id, data: { [field]: value as never } });
    } catch (err) {
      toast({ title: extractApiMessage(err, 'Không thể cập nhật'), variant: 'destructive' });
    }
  };

  return (
    <div className="border rounded-md p-3 bg-muted/10 space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">Bước {stepOrder}</span>
        <Select value={first.stepType} onValueChange={(v: StepType) =>
          Promise.all(details.map((d) => updateField(d, 'stepType', v)))
        }>
          <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="REVIEW">Thẩm định</SelectItem>
            <SelectItem value="APPROVE">Phê duyệt</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="flex-1 max-w-xs h-8"
          placeholder="Nhãn bước (vd: Thẩm định bước 1)"
          defaultValue={first.stepLabel ?? ''}
          onBlur={(e) =>
            e.target.value !== (first.stepLabel ?? '')
              ? Promise.all(details.map((d) => updateField(d, 'stepLabel', e.target.value || null)))
              : undefined
          }
        />
      </div>

      {isNt && !hasFallback && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          ⚠️ Bước này chưa có dòng "Tất cả bộ phận". Bộ phận chưa được cấu hình sẽ không thể submit tờ trình.
        </div>
      )}

      {draftRows.length > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          ⚠️ Có {draftRows.length} dòng chưa chọn người duyệt. Vui lòng chọn để lưu.
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            {isNt && <th className="text-left font-normal p-1">Bộ phận</th>}
            <th className="text-left font-normal p-1">Người duyệt</th>
            <th className="text-left font-normal p-1">Mode</th>
            {!isNt && (
              <>
                <th className="text-left font-normal p-1">Từ (VND, để trống = −∞)</th>
                <th className="text-left font-normal p-1">Đến (VND, để trống = +∞)</th>
              </>
            )}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {details.map((d) => (
            <tr key={d.id} className={`border-t ${isNt && d.departmentId === null ? 'bg-muted/20' : ''}`}>
              {isNt && (
                <td className="p-1">
                  <Select
                    value={d.departmentId ?? FALLBACK_DEPT_VALUE}
                    onValueChange={(v) =>
                      updateField(d, 'departmentId', v === FALLBACK_DEPT_VALUE ? null : v)
                    }
                  >
                    <SelectTrigger className="h-8 min-w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FALLBACK_DEPT_VALUE}>
                        <span className="text-muted-foreground italic">Tất cả bộ phận</span>
                      </SelectItem>
                      {departments
                        .filter((dept) => !dept.isDisabled || dept.id === d.departmentId)
                        .map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}{dept.isDisabled ? ' (vô hiệu)' : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </td>
              )}
              <td className="p-1">
                <Select value={d.approverId} onValueChange={(v) => updateField(d, 'approverId', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pool.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{fullName(a)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-1">
                <Select value={d.mode} onValueChange={(v: StepMode) => updateField(d, 'mode', v)}>
                  <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">ANY</SelectItem>
                    <SelectItem value="ALL">ALL</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              {!isNt && (
                <>
                  <td className="p-1">
                    <MoneyInput
                      initial={d.minAmount}
                      onCommit={(v) => updateField(d, 'minAmount', v)}
                    />
                  </td>
                  <td className="p-1">
                    <MoneyInput
                      initial={d.maxAmount}
                      onCommit={(v) => updateField(d, 'maxAmount', v)}
                    />
                  </td>
                </>
              )}
              <td className="p-1">
                <Button variant="ghost" size="sm" onClick={() => removeDetail(d.id)}>
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </td>
            </tr>
          ))}

          {draftRows.map((draft) => (
            <tr key={draft.localId} className="border-t border-amber-200 bg-amber-50/40">
              {isNt && (
                <td className="p-1">
                  <Select
                    value={draft.departmentId ?? FALLBACK_DEPT_VALUE}
                    onValueChange={(v) =>
                      updateDraft(draft.localId, { departmentId: v === FALLBACK_DEPT_VALUE ? null : v })
                    }
                  >
                    <SelectTrigger className="h-8 min-w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FALLBACK_DEPT_VALUE}>
                        <span className="text-muted-foreground italic">Tất cả bộ phận</span>
                      </SelectItem>
                      {departments.filter((dept) => !dept.isDisabled).map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              )}
              <td className="p-1">
                <Select onValueChange={(v) => commitDraft(draft.localId, draft, v)}>
                  <SelectTrigger className="h-8 border-amber-400 text-muted-foreground">
                    <SelectValue placeholder="— Chọn người duyệt —" />
                  </SelectTrigger>
                  <SelectContent>
                    {pool.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{fullName(a)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="p-1">
                <Select value={draft.mode} onValueChange={(v: StepMode) => updateDraft(draft.localId, { mode: v })}>
                  <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">ANY</SelectItem>
                    <SelectItem value="ALL">ALL</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              {!isNt && (
                <>
                  <td className="p-1">
                    <MoneyInput
                      initial={draft.minAmount}
                      onCommit={(v) => updateDraft(draft.localId, { minAmount: v })}
                    />
                  </td>
                  <td className="p-1">
                    <MoneyInput
                      initial={draft.maxAmount}
                      onCommit={(v) => updateDraft(draft.localId, { maxAmount: v })}
                    />
                  </td>
                </>
              )}
              <td className="p-1">
                <Button variant="ghost" size="sm" onClick={() => removeDraft(draft.localId)}>
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Button variant="ghost" size="sm" onClick={handleAddSibling}>
        <Plus size={12} className="mr-1" />
        {isNt ? 'Thêm dòng phân quyền' : 'Thêm dòng (ngưỡng khác)'}
      </Button>
    </div>
  );
}

// ───────────────────────── helpers ─────────────────────────

function groupByStepOrder(details: IApprovalRuleDetail[]) {
  const map = new Map<number, IApprovalRuleDetail[]>();
  for (const d of details) {
    const arr = map.get(d.stepOrder) ?? [];
    arr.push(d);
    map.set(d.stepOrder, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([stepOrder, details]) => ({ stepOrder, details }));
}

function extractApiMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = (err as { response?: { data?: { error?: { message?: string }; message?: string } } }).response;
    return r?.data?.error?.message ?? r?.data?.message ?? fallback;
  }
  return fallback;
}
