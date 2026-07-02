import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uuidv7 } from 'uuidv7';
import {
  CreateApprovalRuleDetailDto,
  CreateApprovalRuleDto,
  PreviewApprovalDto,
  UpdateApprovalRuleDetailDto,
  UpdateApprovalRuleDto,
} from './dto/approval-rule.dto';

/**
 * Approval-rules engine (BA approval-rules-by-cost-code.md).
 * Header is per (submissionType, costCodeId); details = per-step approvers with
 * optional [minAmount, maxAmount) thresholds for MS rules.
 */
@Injectable()
export class ApprovalRulesService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(v: string | number | null | undefined): bigint | null {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return BigInt(Math.trunc(v));
    return BigInt(v);
  }

  /** Resolve the active rule header for the given (type, costCode). */
  private async findHeader(submissionType: 'MS' | 'NT', costCodeId: string | null) {
    return this.prisma.costCodeApprovalRule.findFirst({
      where: {
        submissionType,
        costCodeId: submissionType === 'NT' ? null : costCodeId,
        isActive: true,
        isDeleted: false,
      },
    });
  }

  // ───────────────────────── CRUD ─────────────────────────

  /** List rules for admin matrix/sidebar. */
  async list(submissionType: 'MS' | 'NT', costCodeId?: string) {
    const where: Record<string, unknown> = { submissionType, isDeleted: false };
    if (submissionType === 'MS' && costCodeId) where.costCodeId = costCodeId;
    if (submissionType === 'NT') where.costCodeId = null;
    return this.prisma.costCodeApprovalRule.findMany({
      where,
      include: {
        costCode: { select: { id: true, code: true, name: true, departmentId: true } },
        details: {
          where: { isDeleted: false },
          orderBy: [{ stepOrder: 'asc' }, { logCreatedAt: 'asc' }],
          include: {
            approver: { select: { id: true, firstName: true, middleName: true, surname: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ logCreatedAt: 'desc' }],
    });
  }

  /** Matrix pivot: rows = costCode, columns = staff (only MS). */
  async matrix() {
    const rules = await this.prisma.costCodeApprovalRule.findMany({
      where: { submissionType: 'MS', isActive: true, isDeleted: false },
      include: {
        costCode: { select: { id: true, code: true, name: true, departmentId: true } },
        details: {
          where: { isDeleted: false },
          orderBy: { stepOrder: 'asc' },
          include: {
            approver: { select: { id: true, firstName: true, middleName: true, surname: true } },
          },
        },
      },
    });

    const staffMap = new Map<string, { id: string; name: string }>();
    const rows = rules
      .filter((r) => r.costCode)
      .map((r) => {
        const cells: Record<string, Array<{ stepLabel: string | null; minAmount: string | null; maxAmount: string | null; mode: string }>> = {};
        for (const d of r.details) {
          const fullName = [d.approver.surname, d.approver.middleName, d.approver.firstName]
            .filter(Boolean)
            .join(' ');
          if (!staffMap.has(d.approverId)) staffMap.set(d.approverId, { id: d.approverId, name: fullName });
          (cells[d.approverId] ??= []).push({
            stepLabel: d.stepLabel,
            minAmount: d.minAmount?.toString() ?? null,
            maxAmount: d.maxAmount?.toString() ?? null,
            mode: d.mode,
          });
        }
        return { costCode: r.costCode!, ruleId: r.id, cells };
      });

    return { staff: Array.from(staffMap.values()), rows };
  }

  async getOne(id: string) {
    const r = await this.prisma.costCodeApprovalRule.findUnique({
      where: { id },
      include: {
        costCode: true,
        details: {
          where: { isDeleted: false },
          orderBy: [{ stepOrder: 'asc' }, { logCreatedAt: 'asc' }],
          include: {
            approver: { select: { id: true, firstName: true, middleName: true, surname: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!r || r.isDeleted) throw new NotFoundException('Approval rule not found');
    return r;
  }

  async createHeader(dto: CreateApprovalRuleDto, actor: string) {
    if (dto.submissionType === 'NT' && dto.costCodeId)
      throw new BadRequestException('NT rule must not have costCodeId');
    if (dto.submissionType === 'MS' && !dto.costCodeId)
      throw new BadRequestException('MS rule requires costCodeId');

    const dup = await this.prisma.costCodeApprovalRule.findFirst({
      where: {
        submissionType: dto.submissionType,
        costCodeId: dto.submissionType === 'NT' ? null : dto.costCodeId,
        isDeleted: false,
      },
    });
    if (dup) throw new ConflictException('Rule already exists for this scope');

    return this.prisma.costCodeApprovalRule.create({
      data: {
        id: uuidv7(),
        submissionType: dto.submissionType,
        costCodeId: dto.submissionType === 'NT' ? null : dto.costCodeId!,
        name: dto.name ?? null,
        isActive: true,
        logCreatedBy: actor,
        logUpdatedBy: actor,
      },
    });
  }

  async updateHeader(id: string, dto: UpdateApprovalRuleDto, actor: string) {
    await this.getOne(id);
    return this.prisma.costCodeApprovalRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        logUpdatedBy: actor,
      },
    });
  }

  async deleteHeader(id: string, actor: string) {
    await this.getOne(id);
    return this.prisma.costCodeApprovalRule.update({
      where: { id },
      data: { isDeleted: true, logUpdatedBy: actor },
    });
  }

  /** Inserts a detail row + validates threshold non-overlap inside the same (ruleId, stepOrder). */
  async addDetail(ruleId: string, dto: CreateApprovalRuleDetailDto, actor: string) {
    const rule = await this.getOne(ruleId);
    const isNt = rule.submissionType === 'NT';
    const min = isNt ? null : this.toBigInt(dto.minAmount);
    const max = isNt ? null : this.toBigInt(dto.maxAmount);

    if (isNt && (this.toBigInt(dto.minAmount) !== null || this.toBigInt(dto.maxAmount) !== null))
      throw new BadRequestException('NT rule details must not have minAmount/maxAmount');

    if (!isNt && dto.departmentId)
      throw new BadRequestException('departmentId is only valid for NT rules');

    if (min !== null && max !== null && min >= max)
      throw new BadRequestException('minAmount must be less than maxAmount');

    // overlap check among MS details in the same step
    if (!isNt) await this.assertNoOverlap(ruleId, dto.stepOrder, min, max, dto.approverId, null);

    // NT duplicate: same (ruleId, stepOrder, departmentId, approverId) is redundant
    if (isNt) await this.assertNoDuplicateNt(ruleId, dto.stepOrder, dto.departmentId ?? null, dto.approverId, null);

    return this.prisma.costCodeApprovalRuleDetail.create({
      data: {
        id: uuidv7(),
        ruleId,
        stepOrder: dto.stepOrder,
        stepType: dto.stepType,
        stepLabel: dto.stepLabel ?? null,
        minAmount: min,
        maxAmount: max,
        approverId: dto.approverId,
        mode: dto.mode ?? 'ANY',
        departmentId: isNt ? (dto.departmentId ?? null) : null,
        logCreatedBy: actor,
        logUpdatedBy: actor,
      },
    });
  }

  async updateDetail(id: string, dto: UpdateApprovalRuleDetailDto, actor: string) {
    const detail = await this.prisma.costCodeApprovalRuleDetail.findUnique({
      where: { id },
      include: { rule: true },
    });
    if (!detail || detail.isDeleted) throw new NotFoundException('Detail not found');
    const isNt = detail.rule.submissionType === 'NT';

    if (!isNt && dto.departmentId)
      throw new BadRequestException('departmentId is only valid for NT rules');

    const min = isNt ? null
      : dto.minAmount !== undefined ? this.toBigInt(dto.minAmount) : detail.minAmount;
    const max = isNt ? null
      : dto.maxAmount !== undefined ? this.toBigInt(dto.maxAmount) : detail.maxAmount;
    const stepOrder = dto.stepOrder ?? detail.stepOrder;

    if (min !== null && max !== null && min >= max)
      throw new BadRequestException('minAmount must be less than maxAmount');

    const effectiveApproverId = dto.approverId ?? detail.approverId;
    if (!isNt) await this.assertNoOverlap(detail.ruleId, stepOrder, min, max, effectiveApproverId, id);

    if (isNt && (dto.departmentId !== undefined || dto.approverId !== undefined || dto.stepOrder !== undefined)) {
      const deptId = dto.departmentId !== undefined ? (dto.departmentId ?? null) : detail.departmentId;
      const approverId = dto.approverId ?? detail.approverId;
      await this.assertNoDuplicateNt(detail.ruleId, stepOrder, deptId, approverId, id);
    }

    return this.prisma.costCodeApprovalRuleDetail.update({
      where: { id },
      data: {
        ...(dto.stepOrder !== undefined && { stepOrder }),
        ...(dto.stepType !== undefined && { stepType: dto.stepType }),
        ...(dto.stepLabel !== undefined && { stepLabel: dto.stepLabel }),
        ...(dto.minAmount !== undefined && { minAmount: min }),
        ...(dto.maxAmount !== undefined && { maxAmount: max }),
        ...(dto.approverId !== undefined && { approverId: dto.approverId }),
        ...(dto.mode !== undefined && { mode: dto.mode }),
        ...(isNt && dto.departmentId !== undefined && { departmentId: dto.departmentId ?? null }),
        logUpdatedBy: actor,
      },
    });
  }

  async deleteDetail(id: string, actor: string) {
    const detail = await this.prisma.costCodeApprovalRuleDetail.findUnique({ where: { id } });
    if (!detail || detail.isDeleted) throw new NotFoundException('Detail not found');
    return this.prisma.costCodeApprovalRuleDetail.update({
      where: { id },
      data: { isDeleted: true, logUpdatedBy: actor },
    });
  }

  // ───────────────────────── Engine ─────────────────────────

  /**
   * Resolve plan for a submission about to be submitted.
   * Returns the ordered list of (stepOrder, stepType, stepLabel, approverId, mode) tuples
   * that the caller should snapshot into SubmissionApprovalStep.
   * @param submitterDeptId - required for NT to apply per-department routing (BA §6.1, D11).
   */
  async resolvePlan(
    submissionType: 'MS' | 'NT',
    costCodeId: string | null,
    total: bigint | null,
    submitterDeptId?: string | null,
  ) {
    const rule = await this.findHeader(submissionType, costCodeId);
    if (!rule) {
      throw new BadRequestException(
        submissionType === 'MS'
          ? 'Chưa có cấu hình duyệt cho loại chi phí này.'
          : 'Chưa có cấu hình duyệt cho tờ trình Nguyên tắc.',
      );
    }

    const details = await this.prisma.costCodeApprovalRuleDetail.findMany({
      where: { ruleId: rule.id, isDeleted: false },
      orderBy: [{ stepOrder: 'asc' }, { logCreatedAt: 'asc' }],
    });

    let matches: typeof details;

    if (submissionType === 'NT') {
      // Per-department routing: for each stepOrder, prefer specific (matching dept) over fallback (null).
      const specific = details.filter((d) => d.departmentId !== null && d.departmentId === submitterDeptId);
      const fallback = details.filter((d) => d.departmentId === null);

      // Collect stepOrders that have at least one specific row.
      const stepOrdersWithSpecific = new Set(specific.map((d) => d.stepOrder));

      // For each step: use specific rows if available, else use fallback rows.
      matches = details.filter((d) => {
        if (stepOrdersWithSpecific.has(d.stepOrder)) return d.departmentId === submitterDeptId;
        return fallback.some((f) => f.stepOrder === d.stepOrder) && d.departmentId === null;
      });

      if (!matches.length && details.length > 0) {
        // Some steps exist but none matched this dept — check if it's a dept-not-configured error
        const hasFallbackForAllSteps = [...new Set(details.map((d) => d.stepOrder))].every((so) =>
          details.some((d) => d.stepOrder === so && d.departmentId === null),
        );
        if (!hasFallbackForAllSteps) {
          throw new BadRequestException(
            'Chưa có cấu hình duyệt cho bộ phận này trên tờ trình Nguyên tắc. Vui lòng liên hệ admin.',
          );
        }
        // Pure-fallback case (all steps have fallback, none are specific for this dept)
        matches = fallback;
      }
    } else {
      matches = details.filter((d) => {
        if (total === null) return d.minAmount === null && d.maxAmount === null;
        if (d.minAmount !== null && total < d.minAmount) return false;
        if (d.maxAmount !== null && total >= d.maxAmount) return false;
        return true;
      });
    }

    if (!matches.length)
      throw new BadRequestException('Chưa có cấu hình duyệt phù hợp ở mức tiền này.');
    if (!matches.some((d) => d.stepType === 'APPROVE'))
      throw new BadRequestException('Cấu hình duyệt thiếu bước Phê duyệt.');

    return { rule, plan: matches };
  }

  /**
   * Used by FE preview at create-submission step 1.
   * - If `total` is provided → return the single matching branch per step (real plan).
   * - If `total` is omitted (user hasn't entered any expense lines yet) → return ALL
   *   threshold branches grouped by step, so the user can see every possible approver.
   */
  async preview(dto: PreviewApprovalDto) {
    const isExploratory = dto.submissionType !== 'NT' && dto.total === undefined;

    const rule = await this.findHeader(dto.submissionType, dto.costCodeId ?? null);
    if (!rule) {
      throw new BadRequestException(
        dto.submissionType === 'MS'
          ? 'Chưa có cấu hình duyệt cho loại chi phí này.'
          : 'Chưa có cấu hình duyệt cho tờ trình Nguyên tắc.',
      );
    }

    const allDetails = await this.prisma.costCodeApprovalRuleDetail.findMany({
      where: { ruleId: rule.id, isDeleted: false },
      orderBy: [{ stepOrder: 'asc' }, { minAmount: 'asc' }, { logCreatedAt: 'asc' }],
    });

    const matches = isExploratory
      ? allDetails
      : (
          await this.resolvePlan(
            dto.submissionType,
            dto.costCodeId ?? null,
            dto.submissionType === 'NT' ? null : BigInt(Math.trunc(dto.total!)),
            dto.submissionType === 'NT' ? (dto.departmentId ?? null) : null,
          )
        ).plan;

    // name lookup for all involved approvers
    const ids = Array.from(new Set(matches.map((d) => d.approverId)));
    const staff = await this.prisma.staff.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, middleName: true, surname: true },
    });
    const nameOf = (id: string) => {
      const s = staff.find((x) => x.id === id);
      return s ? [s.surname, s.middleName, s.firstName].filter(Boolean).join(' ') : '';
    };

    // Group by stepOrder. In exploratory mode every detail is its own "branch" with its own threshold.
    const groups: Record<number, typeof matches> = {};
    for (const d of matches) (groups[d.stepOrder] ??= []).push(d);

    return {
      steps: Object.keys(groups)
        .map(Number)
        .sort((a, b) => a - b)
        .flatMap((order) => {
          const details = groups[order];
          if (isExploratory && details.length > 1) {
            // Split into one preview row per threshold branch so all options are visible.
            return details.map((d) => ({
              stepOrder: order,
              stepType: d.stepType,
              stepLabel: d.stepLabel,
              mode: d.mode,
              approvers: [{ id: d.approverId, name: nameOf(d.approverId) }],
              minAmount: d.minAmount?.toString() ?? null,
              maxAmount: d.maxAmount?.toString() ?? null,
            }));
          }
          return [{
            stepOrder: order,
            stepType: details[0].stepType,
            stepLabel: details[0].stepLabel,
            mode: details[0].mode,
            approvers: details.map((d) => ({ id: d.approverId, name: nameOf(d.approverId) })),
            minAmount: details[0].minAmount?.toString() ?? null,
            maxAmount: details[0].maxAmount?.toString() ?? null,
          }];
        }),
    };
  }

  private async attachApproverNames(details: Array<{ approverId: string; stepOrder: number }>) {
    const ids = Array.from(new Set(details.map((d) => d.approverId)));
    const staff = await this.prisma.staff.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, middleName: true, surname: true },
    });
    const nameOf = (id: string) => {
      const s = staff.find((x) => x.id === id);
      return s ? [s.surname, s.middleName, s.firstName].filter(Boolean).join(' ') : '';
    };
    return details.map((d) => ({ ...d, name: nameOf(d.approverId) }));
  }

  // ───────────────────────── helpers ─────────────────────────

  /** Reject duplicate (ruleId, stepOrder, departmentId, approverId) for NT details. */
  private async assertNoDuplicateNt(
    ruleId: string,
    stepOrder: number,
    departmentId: string | null,
    approverId: string,
    excludeDetailId: string | null,
  ) {
    const dup = await this.prisma.costCodeApprovalRuleDetail.findFirst({
      where: {
        ruleId,
        stepOrder,
        departmentId: departmentId ?? null,
        approverId,
        isDeleted: false,
        ...(excludeDetailId ? { NOT: { id: excludeDetailId } } : {}),
      },
    });
    if (dup) throw new BadRequestException('Đã tồn tại cấu hình cho bộ phận và người duyệt này trong cùng bước.');
  }

  /**
   * Validate MS detail ranges per §8.3:
   *   (A) same range + different approver  → ✅ allowed (multi-approver)
   *   (B) non-overlapping ranges           → ✅ allowed (threshold routing)
   *   (C) overlapping but not equal        → ❌ RULE_OVERLAP
   *   (D) same range + same approver       → ❌ RULE_DUPLICATE
   */
  private async assertNoOverlap(
    ruleId: string,
    stepOrder: number,
    min: bigint | null,
    max: bigint | null,
    approverId: string,
    excludeDetailId: string | null,
  ) {
    const siblings = await this.prisma.costCodeApprovalRuleDetail.findMany({
      where: {
        ruleId,
        stepOrder,
        isDeleted: false,
        ...(excludeDetailId ? { NOT: { id: excludeDetailId } } : {}),
      },
    });

    const eqMin = (a: bigint | null, b: bigint | null) =>
      a === null ? b === null : b !== null && a === b;
    const eqMax = (a: bigint | null, b: bigint | null) =>
      a === null ? b === null : b !== null && a === b;

    for (const s of siblings) {
      const sameRange = eqMin(s.minAmount, min) && eqMax(s.maxAmount, max);
      const overlaps =
        (min === null || s.maxAmount === null || min < s.maxAmount) &&
        (max === null || s.minAmount === null || max > s.minAmount);

      if (!overlaps) continue; // case (B) — fine

      if (sameRange) {
        if (s.approverId === approverId) {
          // case (D) — duplicate
          const approver = await this.prisma.staff.findUnique({
            where: { id: approverId },
            select: { firstName: true, middleName: true, surname: true },
          });
          const name = approver
            ? [approver.surname, approver.middleName, approver.firstName].filter(Boolean).join(' ')
            : approverId;
          throw new BadRequestException(
            `Người duyệt ${name} đã có trong bước này với cùng ngưỡng. Mỗi người chỉ thêm 1 lần / 1 ngưỡng.`,
          );
        }
        // case (A) — same range, different approver → allowed
        continue;
      }

      // case (C) — overlapping but not equal
      const fmtAmt = (v: bigint | null) => (v === null ? '∞' : v.toLocaleString('vi-VN'));
      throw new BadRequestException(
        `Ngưỡng ${fmtAmt(min)}–${fmtAmt(max)} giao với rule khác trong cùng bước. Hai khoảng phải hoặc bằng nhau (multi-approver) hoặc tách rời hoàn toàn (routing).`,
      );
    }
  }
}
