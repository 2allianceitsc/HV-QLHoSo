import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useImportPreview, useImportConfirm } from '@/hooks/useEmployee';
import { ArrowLeft, Upload, CheckCircle, XCircle, Download, FileSpreadsheet } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/apiError';
import { safeArray } from '@/lib/safeArray';

const TEMPLATE_HEADERS = [
  'firstName', 'surname', 'middleName', 'username', 'email', 'password',
  'companyId', 'employeeId', 'departmentId', 'officeId', 'positionId', 'teamId', 'mobileNumber',
];

type Step = 1 | 2 | 3;

export function ImportEmployeePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);

  const previewMutation = useImportPreview();
  const confirmMutation = useImportConfirm();

  const validRows = safeArray(previewMutation.data?.valid);
  const invalidRows = safeArray(previewMutation.data?.invalid);

  function handleDownloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'employee-import-template.xlsx');
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const f = acceptedFiles[0];
      if (!f) return;
      setFile(f);
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  async function handlePreview() {
    if (!file) return;
    try {
      await previewMutation.mutateAsync(file);
      setStep(2);
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Preview failed'), variant: 'destructive' });
    }
  }

  async function handleConfirm() {
    if (validRows.length === 0) {
      toast({ title: 'No valid rows to import', variant: 'destructive' });
      return;
    }
    try {
      const result = await confirmMutation.mutateAsync(validRows);
      setStep(3);
      toast({ title: `Imported ${result.created} employees successfully` });
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Import failed'), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import Employees</h1>
          <p className="text-sm text-muted-foreground">Bulk import from Excel</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              step === s ? 'bg-primary text-primary-foreground' :
              step > s ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {step > s ? '✓' : s}
            </div>
            <span className={step === s ? 'font-medium' : 'text-muted-foreground'}>
              {s === 1 ? 'Upload File' : s === 2 ? 'Preview & Validate' : 'Done'}
            </span>
            {s < 3 && <span className="text-muted-foreground mx-1">›</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          <div
            {...getRootProps()}
            className={`rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {file ? (
              <div>
                <p className="font-medium text-green-700">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : isDragActive ? (
              <p className="text-primary">Drop the file here...</p>
            ) : (
              <div>
                <p className="font-medium">Drag & drop your Excel file here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to select (.xlsx, .xls)</p>
              </div>
            )}
          </div>

          {file && (
            <div className="flex justify-end">
              <Button onClick={handlePreview} disabled={previewMutation.isPending}>
                <Upload className="mr-2 h-4 w-4" />
                {previewMutation.isPending ? 'Parsing...' : 'Preview Import'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && previewMutation.data && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">{validRows.length} valid rows</span>
            </div>
            {invalidRows.length > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">{invalidRows.length} invalid rows</span>
              </div>
            )}
          </div>

          {/* Valid rows */}
          {validRows.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-2">Valid Rows</h3>
              <div className="rounded-md border overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {TEMPLATE_HEADERS.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.map((row, i) => (
                      <tr key={i} className="border-t bg-green-50/50">
                        {TEMPLATE_HEADERS.map((h) => (
                          <td key={h} className="px-3 py-1.5">{(row as Record<string, string>)[h] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invalid rows */}
          {invalidRows.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-600 mb-2">Invalid Rows (will be skipped)</h3>
              <div className="rounded-md border overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {TEMPLATE_HEADERS.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                      <th className="px-3 py-2 text-left font-medium">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invalidRows.map(({ row, errors }, i) => (
                      <tr key={i} className="border-t bg-red-50/50">
                        {TEMPLATE_HEADERS.map((h) => (
                          <td key={h} className="px-3 py-1.5">{(row as Record<string, string>)[h] ?? ''}</td>
                        ))}
                        <td className="px-3 py-1.5">
                          <div className="flex flex-wrap gap-1">
                            {errors.map((err, j) => (
                              <Badge key={j} variant="destructive" className="text-xs">{err}</Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => { setStep(1); setFile(null); }}>
              Upload Different File
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirmMutation.isPending || validRows.length === 0}
            >
              {confirmMutation.isPending ? 'Importing...' : `Import ${validRows.length} Employees`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div className="flex flex-col items-center gap-6 py-12">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <div className="text-center">
            <h2 className="text-xl font-semibold">Import Complete!</h2>
            <p className="text-muted-foreground mt-1">
              {confirmMutation.data?.created ?? 0} employees have been imported successfully.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setStep(1); setFile(null); }}>
              Import More
            </Button>
            <Button onClick={() => navigate('/employees')}>
              View Employees
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
