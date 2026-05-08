import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class HvReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async summary(year?: number, month?: number) {
    const where: Record<string, unknown> = { isDeleted: false };
    if (year || month) {
      const from = new Date(year ?? new Date().getFullYear(), (month ?? 1) - 1, 1);
      const to = month
        ? new Date(year ?? new Date().getFullYear(), month, 0, 23, 59, 59)
        : new Date((year ?? new Date().getFullYear()) + 1, 0, 0, 23, 59, 59);
      where['submittedDate'] = { gte: from, lte: to };
    }

    const [total, byStatus, byDept, rawByDate] = await Promise.all([
      this.prisma.submission.count({ where }),
      this.prisma.submission.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.submission.groupBy({ by: ['departmentId'], where, _count: true }),
      this.prisma.submission.groupBy({ by: ['submittedDate'], where, _count: true }),
    ]);

    const deptIds = byDept.map((d) => d.departmentId);
    const depts = await this.prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true },
    });
    const deptMap = Object.fromEntries(depts.map((d) => [d.id, d.name]));

    // Aggregate per-day rows into YYYY-MM monthly buckets
    const monthMap = new Map<string, number>();
    for (const row of rawByDate) {
      const d = new Date(row.submittedDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + row._count);
    }
    const byMonth = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    return {
      total,
      byStatus: byStatus.map((b) => ({ status: b.status, count: b._count })),
      byDepartment: byDept.map((b) => ({ departmentId: b.departmentId, departmentName: deptMap[b.departmentId] ?? b.departmentId, count: b._count })),
      byMonth,
    };
  }

  async expenses(params: {
    fromDate?: string; toDate?: string; department?: string;
    costCode?: string; supplier?: string; page?: number; limit?: number;
  }) {
    const { fromDate, toDate, department, costCode, supplier, page = 1, limit = 50 } = params;

    const lineWhere: Record<string, unknown> = {};
    const subWhere: Record<string, unknown> = { isDeleted: false, type: 'MS', status: 'approved' };

    if (fromDate || toDate) {
      subWhere['submittedDate'] = {
        ...(fromDate ? { gte: new Date(fromDate) } : {}),
        ...(toDate ? { lte: new Date(toDate) } : {}),
      };
    }
    if (department) subWhere['departmentId'] = department;
    if (supplier) lineWhere['supplier'] = { contains: supplier, mode: 'insensitive' };
    if (costCode) lineWhere['costCodeId'] = costCode;

    const skip = (page - 1) * limit;
    const [lines, total] = await Promise.all([
      this.prisma.expenseLine.findMany({
        where: { ...lineWhere, submission: subWhere },
        include: {
          submission: { select: { id: true, code: true, title: true, submittedDate: true, department: { select: { id: true, name: true } } } },
          costCode: { select: { id: true, code: true, name: true } },
        },
        orderBy: { submission: { submittedDate: 'desc' } },
        skip,
        take: limit,
      }),
      this.prisma.expenseLine.count({ where: { ...lineWhere, submission: subWhere } }),
    ]);

    const totalExVat = lines.reduce((s, l) => s + Number(l.amountExVat), 0);
    const totalIncVat = lines.reduce((s, l) => s + Number(l.amountIncVat), 0);

    return {
      items: lines.map((l) => ({ ...l, amountExVat: Number(l.amountExVat), amountIncVat: Number(l.amountIncVat) })),
      total, page, limit, totalPages: Math.ceil(total / limit),
      summary: { totalExVat, totalIncVat },
    };
  }

  async contracts(params: {
    q?: string;
    contractStatus?: 'expiring_soon' | 'expired';
    contractEndDateFrom?: string;
    contractEndDateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const { q, contractStatus, contractEndDateFrom, contractEndDateTo, page = 1, limit = 20 } = params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Base scope: NT submissions that are not drafts
    const baseWhere: Record<string, unknown> = {
      isDeleted: false,
      type: 'NT',
      status: { not: 'draft' },
    };

    // Build filtered where for paginated list
    const where: Record<string, unknown> = { ...baseWhere };

    if (q) {
      where['OR'] = [
        { code: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { supplier: { contains: q, mode: 'insensitive' } },
      ];
    }

    // contractStatus overrides manual date range for contractEndDate
    if (contractStatus === 'expiring_soon') {
      where['contractEndDate'] = { gte: today, lte: thirtyDaysFromNow };
    } else if (contractStatus === 'expired') {
      where['contractEndDate'] = { lt: today };
    } else if (contractEndDateFrom || contractEndDateTo) {
      where['contractEndDate'] = {
        ...(contractEndDateFrom ? { gte: new Date(contractEndDateFrom) } : {}),
        ...(contractEndDateTo ? { lte: new Date(contractEndDateTo) } : {}),
      };
    }

    const skip = (page - 1) * limit;

    const [filteredTotal, summaryTotal, expiringSoon, expired, items] = await Promise.all([
      this.prisma.submission.count({ where: where as Prisma.SubmissionWhereInput }),
      this.prisma.submission.count({ where: baseWhere as Prisma.SubmissionWhereInput }),
      this.prisma.submission.count({ where: { ...baseWhere, contractEndDate: { gte: today, lte: thirtyDaysFromNow } } as Prisma.SubmissionWhereInput }),
      this.prisma.submission.count({ where: { ...baseWhere, contractEndDate: { lt: today } } as Prisma.SubmissionWhereInput }),
      this.prisma.submission.findMany({
        where: where as Prisma.SubmissionWhereInput,
        select: {
          id: true, code: true, title: true, status: true, supplier: true,
          contractStartDate: true, contractEndDate: true, submittedDate: true,
          department: { select: { id: true, name: true } },
          attachments: {
            where: { fileType: 'signed_contract' },
            select: { id: true, name: true, storageKey: true },
            take: 1,
          },
        },
        orderBy: { contractEndDate: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    const publicUrlBase = await this.storage.getPublicUrlBase().catch(() => '');
    type ContractItem = (typeof items)[number];
    type ContractAttachment = ContractItem['attachments'][number];
    const data = items.map((item: ContractItem) => ({
      ...item,
      attachments: item.attachments.map((a: ContractAttachment) => ({
        ...a,
        publicUrl: publicUrlBase ? `${publicUrlBase}/${a.storageKey}` : a.storageKey,
      })),
    }));

    return {
      summary: { total: summaryTotal, expiringSoon, expired },
      data,
      total: filteredTotal,
      page,
      totalPages: Math.ceil(filteredTotal / limit),
    };
  }
}
