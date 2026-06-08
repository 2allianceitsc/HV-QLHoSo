import { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, useWatch, type Control } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { useCostCodes } from '@/hooks/useCostCode';
import type { ICreateSubmissionInput } from '@/api/submission.api';

interface Props {
  control: Control<ICreateSubmissionInput>;
  departmentId?: string;
  /** When provided, every line's costCodeId is locked to this value (BA §5.4, §7.2). */
  lockedCostCodeId?: string;
  readOnly?: boolean;
}

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n);
}

function CurrencyInput({
  initialValue,
  onChange,
  className,
}: {
  initialValue: number;
  onChange: (n: number) => void;
  className?: string;
}) {
  const [display, setDisplay] = useState(() =>
    initialValue > 0 ? formatVND(initialValue) : '',
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    const num = digits ? parseInt(digits, 10) : 0;
    setDisplay(digits ? formatVND(num) : '');
    onChange(num);
  };

  return (
    <Input
      className={className}
      value={display}
      onChange={handleChange}
      placeholder="0"
      inputMode="numeric"
    />
  );
}

export function ExpenseLineTable({ control, departmentId, lockedCostCodeId, readOnly }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: 'expenseLines' });
  const { setValue } = useFormContext<ICreateSubmissionInput>();
  const watchedLines = useWatch({ control, name: 'expenseLines' }) ?? [];
  const { data: costCodes = [] } = useCostCodes(departmentId);
  const lockedCostCode = lockedCostCodeId ? costCodes.find((c) => c.id === lockedCostCodeId) : undefined;

  // BA §5.4: when the submission's cost code changes, force every existing line to match.
  useEffect(() => {
    if (!lockedCostCode) return;
    fields.forEach((_, i) => {
      const current = watchedLines[i]?.costCodeId;
      if (current && current !== lockedCostCode.id) {
        setValue(`expenseLines.${i}.costCodeId`, lockedCostCode.id, { shouldValidate: false });
        setValue(`expenseLines.${i}.costCodeName`, `${lockedCostCode.code} - ${lockedCostCode.name}`, { shouldValidate: false });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedCostCode?.id]);

  const addLine = () => {
    const cc = lockedCostCode ?? costCodes[0];
    append({
      costCodeId: cc?.id ?? '',
      costCodeName: cc ? `${cc.code} - ${cc.name}` : '',
      amountExVat: 0,
      vatRate: 10,
      supplier: '',
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Chi phí</span>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            + Thêm dòng
          </Button>
        )}
      </div>

      {fields.map((field, i) => (
        <div key={field.id} className="border rounded-md p-4 space-y-3 bg-background">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mã phí</Label>
              {readOnly || lockedCostCode ? (
                <p className="text-sm">
                  {lockedCostCode
                    ? `${lockedCostCode.code} - ${lockedCostCode.name}`
                    : (field.costCodeName || '—')}
                </p>
              ) : (
                <Select
                  value={watchedLines[i]?.costCodeId ?? ''}
                  onValueChange={(val) => {
                    const cc = costCodes.find((c) => c.id === val);
                    if (cc) {
                      setValue(`expenseLines.${i}.costCodeId`, cc.id, { shouldValidate: true });
                      setValue(`expenseLines.${i}.costCodeName`, `${cc.code} - ${cc.name}`, { shouldValidate: true });
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Chọn mã phí" /></SelectTrigger>
                  <SelectContent>
                    {costCodes.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nhà cung cấp</Label>
              {readOnly ? (
                <p className="text-sm">{field.supplier || '—'}</p>
              ) : (
                <Input
                  defaultValue={field.supplier}
                  placeholder="Tên nhà cung cấp..."
                  onChange={(e) => setValue(`expenseLines.${i}.supplier`, e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Giá chưa VAT (VND)</Label>
              {readOnly ? (
                <p className="text-sm">{formatVND(watchedLines[i]?.amountExVat ?? 0)}</p>
              ) : (
                <CurrencyInput
                  initialValue={field.amountExVat}
                  onChange={(n) => setValue(`expenseLines.${i}.amountExVat`, n)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">% VAT</Label>
              {readOnly ? (
                <p className="text-sm">{watchedLines[i]?.vatRate ?? 10}%</p>
              ) : (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={field.vatRate ?? 10}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value);
                    const v = Math.min(100, Math.max(0, isNaN(parsed) ? 0 : parsed));
                    setValue(`expenseLines.${i}.vatRate`, v);
                  }}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Giá có VAT (VND)</Label>
              <p className="text-sm h-10 flex items-center font-medium text-foreground">
                {formatVND(Math.round((watchedLines[i]?.amountExVat ?? 0) * (1 + (watchedLines[i]?.vatRate ?? 0) / 100)))}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mua cho ai</Label>
              {readOnly ? (
                <p className="text-sm">{field.purchasedFor || '—'}</p>
              ) : (
                <Input
                  defaultValue={field.purchasedFor ?? ''}
                  placeholder="VD: Phòng IT..."
                  onChange={(e) => setValue(`expenseLines.${i}.purchasedFor`, e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mục đích</Label>
              {readOnly ? (
                <p className="text-sm">{field.purpose || '—'}</p>
              ) : (
                <Input
                  defaultValue={field.purpose ?? ''}
                  placeholder="VD: Trang bị nhân sự mới..."
                  onChange={(e) => setValue(`expenseLines.${i}.purpose`, e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Người sử dụng</Label>
              {readOnly ? (
                <p className="text-sm">{field.usedBy || '—'}</p>
              ) : (
                <Input
                  defaultValue={field.usedBy ?? ''}
                  placeholder="VD: Nhân viên IT..."
                  onChange={(e) => setValue(`expenseLines.${i}.usedBy`, e.target.value)}
                />
              )}
            </div>
          </div>

          {!readOnly && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(i)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>
      ))}

      {fields.length > 0 && (
        <div className="text-sm text-right text-muted-foreground">
          Tổng chưa VAT: <strong>{formatVND(watchedLines.reduce((s, l) => s + (l?.amountExVat || 0), 0))}</strong>
          {' '}· Tổng đã VAT: <strong>{formatVND(watchedLines.reduce((s, l) => s + Math.round((l?.amountExVat || 0) * (1 + (l?.vatRate ?? 0) / 100)), 0))}</strong>
        </div>
      )}
    </div>
  );
}
