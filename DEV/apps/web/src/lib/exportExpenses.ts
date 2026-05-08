import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { IExpenseReport } from '@/api/hvReports.api';

export function exportExpensesToExcel(
  data: IExpenseReport,
  filters: { fromDate?: string; toDate?: string; supplier?: string },
) {
  const rows = data.items.map((item) => ({
    'Mã tờ trình': item.submission.code,
    'Tiêu đề': item.submission.title ?? '',
    'Bộ phận': item.submission.department.name,
    'Mã phí': item.costCode.code,
    'Tên mã phí': item.costCode.name,
    'Nhà cung cấp': item.supplier,
    'Tiền chưa VAT (VNĐ)': item.amountExVat,
    'Tiền đã VAT (VNĐ)': item.amountIncVat,
    'Ngày lập': format(new Date(item.submission.submittedDate), 'dd/MM/yyyy'),
  }));

  // Append summary row
  rows.push({
    'Mã tờ trình': '',
    'Tiêu đề': '',
    'Bộ phận': '',
    'Mã phí': '',
    'Tên mã phí': 'TỔNG CỘNG',
    'Nhà cung cấp': '',
    'Tiền chưa VAT (VNĐ)': data.summary.totalExVat,
    'Tiền đã VAT (VNĐ)': data.summary.totalIncVat,
    'Ngày lập': '',
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, // Mã tờ trình
    { wch: 36 }, // Tiêu đề
    { wch: 18 }, // Bộ phận
    { wch: 10 }, // Mã phí
    { wch: 28 }, // Tên mã phí
    { wch: 24 }, // Nhà cung cấp
    { wch: 22 }, // Chưa VAT
    { wch: 22 }, // Đã VAT
    { wch: 12 }, // Ngày lập
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Chi phí');

  // Build filename with active filters
  const parts = ['BaoCaoChiPhi'];
  if (filters.fromDate) parts.push(`from${filters.fromDate}`);
  if (filters.toDate) parts.push(`to${filters.toDate}`);
  if (filters.supplier) parts.push(filters.supplier.replace(/\s+/g, '_'));
  parts.push(format(new Date(), 'yyyyMMdd_HHmm'));
  const filename = `${parts.join('_')}.xlsx`;

  XLSX.writeFile(wb, filename);
}
