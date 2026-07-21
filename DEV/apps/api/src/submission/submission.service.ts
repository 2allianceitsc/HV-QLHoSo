import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { uuidv7 } from 'uuidv7';
import { IsNumber, IsString, Min } from 'class-validator';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { ListSubmissionsDto } from './dto/list-submissions.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { ReassignStepDto, StepApproveDto, StepRejectDto } from './dto/step-action.dto';
import { ApprovalRulesService } from '../approval-rules/approval-rules.service';
import { NotificationChannelsService } from '../notification-channels/notification-channels.service';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';

const HV_EMAIL_DEFAULTS: Record<'E001' | 'E002' | 'E003' | 'E004' | 'E005' | 'E006', { subject: string; body: string }> = {
  E001: {
    subject: 'Tờ trình {code} cần thẩm định',
    body: `<p>Kính gửi,</p><p>Tờ trình <strong>{code}</strong> – "{title}" từ <strong>{submitter.fullName}</strong> (Bộ phận: {department}) đã được gửi vào ngày {submittedDate} và đang chờ thẩm định.</p><p><a href="{link}">Nhấn vào đây</a> để xem và xử lý tờ trình.</p>`,
  },
  E002: {
    subject: 'Tờ trình {code} cần phê duyệt',
    body: `<p>Kính gửi,</p><p>Tờ trình <strong>{code}</strong> – "{title}" đã được <strong>{reviewer.fullName}</strong> thẩm định và đang chờ phê duyệt.</p><p><a href="{link}">Nhấn vào đây</a> để xem và xử lý tờ trình.</p>`,
  },
  E003: {
    subject: 'Tờ trình {code} đã được phê duyệt',
    body: `<p>Kính gửi,</p><p>Tờ trình <strong>{code}</strong> – "{title}" của bạn đã được <strong>{approver.fullName}</strong> phê duyệt.</p><p><a href="{link}">Nhấn vào đây</a> để xem tờ trình.</p>`,
  },
  E004: {
    subject: 'Tờ trình {code} bị từ chối',
    body: `<p>Kính gửi,</p><p>Tờ trình <strong>{code}</strong> – "{title}" của bạn bị từ chối.</p><p><strong>Lý do:</strong> {reason}</p><p><a href="{link}">Nhấn vào đây</a> để chỉnh sửa và gửi lại tờ trình.</p>`,
  },
  E005: {
    subject: 'Tờ trình {code} bị từ chối thẩm định',
    body: `<p>Kính gửi,</p><p>Tờ trình <strong>{code}</strong> – "{title}" của bạn đã bị <strong>{decider.fullName}</strong> từ chối ở bước thẩm định.</p><p><strong>Lý do:</strong> {reason}</p><p><a href="{link}">Nhấn vào đây</a> để chỉnh sửa và gửi lại tờ trình.</p>`,
  },
  E006: {
    subject: 'Tờ trình {code} bị từ chối phê duyệt',
    body: `<p>Kính gửi,</p><p>Tờ trình <strong>{code}</strong> – "{title}" của bạn đã bị <strong>{decider.fullName}</strong> từ chối ở bước phê duyệt.</p><p><strong>Lý do:</strong> {reason}</p><p><a href="{link}">Nhấn vào đây</a> để chỉnh sửa và gửi lại tờ trình.</p>`,
  },
};

export class SaveAttachmentDto {
  @IsString() name!: string;
  @IsString() url!: string;        // kept for backward-compat (legacy presigned flow)
  @IsString() fileType!: string;
  @IsString() mimeType!: string;
  @IsNumber() @Min(0) sizeBytes!: number;
}

const STAFF_NAME_SELECT = { id: true, firstName: true, middleName: true, surname: true } as const;

const SUBMISSION_INCLUDE = {
  submitter: { select: { ...STAFF_NAME_SELECT, companyEmailAddress: true } },
  reviewer: { select: { ...STAFF_NAME_SELECT, companyEmailAddress: true } },
  approver: { select: { ...STAFF_NAME_SELECT, companyEmailAddress: true } },
  department: { select: { id: true, name: true } },
  costCode: { select: { id: true, code: true, name: true } },
  expenseLines: { orderBy: { sortOrder: 'asc' as const } },
  existingInventory: { orderBy: { sortOrder: 'asc' as const } },
  attachments: true,
  approvalSteps: {
    orderBy: [{ stepOrder: 'asc' as const }, { logCreatedAt: 'asc' as const }],
    include: {
      approver: { select: STAFF_NAME_SELECT },
      originalApprover: { select: STAFF_NAME_SELECT },
    },
  },
  logs: {
    orderBy: { createdAt: 'desc' as const },
    include: { user: { select: STAFF_NAME_SELECT } },
  },
};

@Injectable()
export class SubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly approvalRules: ApprovalRulesService,
    private readonly notificationChannels: NotificationChannelsService,
  ) {}

  listDepartments() {
    return this.prisma.department.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true, isDisabled: true },
      orderBy: { name: 'asc' },
    });
  }

  listStaffByRole(hvRole: 'reviewer' | 'approver') {
    return this.prisma.staff.findMany({
      where: { isDeleted: false, hvRoles: { has: hvRole } },
      select: { id: true, firstName: true, middleName: true, surname: true },
      orderBy: { surname: 'asc' },
    });
  }

  private async buildUserScope(user: IJwtPayload): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = { isDeleted: false };
    if (!user.hvRoles?.some((r) => ['reviewer', 'approver', 'admin'].includes(r))) {
      const staff = await this.prisma.staff.findUnique({ where: { id: user.staffId }, select: { departmentId: true } });
      // §3.3: staff sees submissions in their department OR created by themselves
      const orClauses: Record<string, unknown>[] = [{ submitterId: user.staffId }];
      if (staff?.departmentId) orClauses.push({ departmentId: staff.departmentId });
      where['OR'] = orClauses;
    }
    return where;
  }

  async getStats(user: IJwtPayload) {
    const base = await this.buildUserScope(user);
    const [total, pendingReview, inReview, approved] = await Promise.all([
      this.prisma.submission.count({ where: { ...base } }),
      this.prisma.submission.count({ where: { ...base, status: 'pending_review' } }),
      this.prisma.submission.count({ where: { ...base, status: 'in_review' } }),
      this.prisma.submission.count({ where: { ...base, status: 'approved' } }),
    ]);
    return { total, pending_review: pendingReview, in_review: inReview, approved };
  }

  getStatusCatalog() {
    return this.prisma.submissionStatus.findMany({ orderBy: { orderNo: 'asc' } });
  }

  async list(user: IJwtPayload, dto: ListSubmissionsDto) {
    const { type, q, department, status, supplier, reviewerId, approverId,
      submittedDateFrom, submittedDateTo, page = 1, limit = 20 } = dto;

    const where = await this.buildUserScope(user);

    if (type) where['type'] = type;
    if (department) where['departmentId'] = department;
    if (status) where['status'] = status;
    if (supplier) where['supplier'] = { contains: supplier, mode: 'insensitive' };
    if (reviewerId) where['reviewerId'] = reviewerId;
    if (approverId) where['approverId'] = approverId;
    if (submittedDateFrom || submittedDateTo) {
      where['submittedDate'] = {
        ...(submittedDateFrom ? { gte: new Date(submittedDateFrom) } : {}),
        ...(submittedDateTo ? { lte: new Date(submittedDateTo) } : {}),
      };
    }
    if (q) {
      where['OR'] = [
        { code: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        include: {
          submitter: { select: { id: true, firstName: true, middleName: true, surname: true } },
          reviewer: { select: { id: true, firstName: true, middleName: true, surname: true } },
          approver: { select: { id: true, firstName: true, middleName: true, surname: true } },
          department: { select: { id: true, name: true } },
          expenseLines: { select: { amountIncVat: true } },
          attachments: { select: { id: true, fileType: true, storageKey: true, name: true } },
          approvalSteps: {
            orderBy: [{ stepOrder: 'asc' as const }, { logCreatedAt: 'asc' as const }],
            include: { approver: { select: STAFF_NAME_SELECT } },
          },
        },
        orderBy: { logCreatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.submission.count({ where }),
    ]);

    const publicUrlBase = await this.storage.getPublicUrlBase().catch(() => '');
    const itemsWithUrls = items.map((item) => ({
      ...item,
      attachments: item.attachments.map((a) => ({
        ...a,
        publicUrl: publicUrlBase ? `${publicUrlBase}/${a.storageKey}` : a.storageKey,
      })),
    }));

    return { items: itemsWithUrls, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(user: IJwtPayload, id: string) {
    const submission = await this.prisma.submission.findUnique({ where: { id }, include: SUBMISSION_INCLUDE });
    if (!submission || submission.isDeleted) throw new NotFoundException('Submission not found');
    await this.assertCanView(user, submission);

    const publicUrlBase = await this.storage.getPublicUrlBase().catch(() => '');
    return {
      ...submission,
      attachments: submission.attachments.map((a) => ({
        ...a,
        publicUrl: publicUrlBase ? `${publicUrlBase}/${a.storageKey}` : a.storageKey,
      })),
    };
  }

  async create(user: IJwtPayload, dto: CreateSubmissionDto) {
    const isSubmit = dto.action === 'submit';

    // BA §5.4: every expense line must match submission.costCodeId.
    if (dto.type === 'MS') {
      if (!dto.costCodeId) throw new BadRequestException('costCodeId là bắt buộc cho tờ trình Mua sắm');
      this.assertLinesMatchCostCode(dto.expenseLines, dto.costCodeId);
    }


    if (dto.type === 'NT') {
      if (!dto.supplier?.trim()) throw new BadRequestException('Nhà cung cấp là bắt buộc');
      if (!dto.contractStartDate) throw new BadRequestException('Ngày bắt đầu hợp đồng là bắt buộc');
      if (!dto.contractEndDate) throw new BadRequestException('Ngày kết thúc hợp đồng là bắt buộc');
    }

    // Resolve plan BEFORE the tx so a missing-rule failure doesn't leave a half-created submission.
    let plan: Awaited<ReturnType<ApprovalRulesService['resolvePlan']>>['plan'] | null = null;
    if (isSubmit) {
      const total = dto.type === 'NT' ? null : this.sumLines(dto.expenseLines ?? []);
      // BA §6.1: dept = submission.submitter.departmentId (Staff record, always reliable).
      let submitterDeptId: string | null = null;
      if (dto.type === 'NT') {
        const staff = await this.prisma.staff.findUnique({
          where: { id: user.staffId },
          select: { departmentId: true },
        });
        submitterDeptId = staff?.departmentId ?? null;
      }
      const resolved = await this.approvalRules.resolvePlan(
        dto.type,
        dto.type === 'NT' ? null : dto.costCodeId ?? null,
        total,
        submitterDeptId,
      );
      plan = resolved.plan;
    }

    const status = isSubmit ? 'pending_review' : 'draft';
    const code = await this.generateCode(dto.type);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.submission.create({
        data: {
          id: uuidv7(),
          type: dto.type,
          code,
          submitterId: user.staffId,
          departmentId: dto.departmentId,
          costCodeId: dto.costCodeId || null,
          submittedDate: new Date(dto.submittedDate),
          title: dto.title,
          content: dto.content ?? '',
          status,
          contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : null,
          contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : null,
          supplier: dto.supplier ?? null,
          logCreatedBy: user.staffId,
        },
      });

      if (dto.expenseLines?.length) {
        await tx.expenseLine.createMany({
          data: dto.expenseLines.map((el, i) => {
            const vatRate = el.vatRate ?? 10;
            const amountExVat = BigInt(Math.round(el.amountExVat));
            const amountIncVat = BigInt(Math.round(el.amountExVat * (1 + vatRate / 100)));
            return {
              id: uuidv7(),
              submissionId: created.id,
              costCodeId: el.costCodeId,
              costCodeName: el.costCodeName,
              amountExVat,
              vatRate,
              amountIncVat,
              supplier: el.supplier ?? '',
              purchasedFor: el.purchasedFor ?? null,
              purpose: el.purpose ?? null,
              usedBy: el.usedBy ?? null,
              sortOrder: el.sortOrder ?? i + 1,
            };
          }),
        });
      }

      if (dto.existingInventory?.length) {
        await tx.existingInventory.createMany({
          data: dto.existingInventory.map((inv, i) => ({
            id: uuidv7(),
            submissionId: created.id,
            itemName: inv.itemName,
            quantity: inv.quantity,
            unit: inv.unit,
            sortOrder: inv.sortOrder ?? i + 1,
          })),
        });
      }

      if (isSubmit && plan) {
        await this.snapshotPlan(tx, created.id, plan);
        await this.activateNextGroup(tx, created.id, user.staffId);
      }

      await tx.submissionLog.create({
        data: {
          id: uuidv7(),
          submissionId: created.id,
          userId: user.staffId,
          action: isSubmit ? 'submit' : 'create',
          toStatus: status,
        },
      });

      return created;
    });
  }

  async update(user: IJwtPayload, id: string, dto: UpdateSubmissionDto) {
    const submission = await this.getOrThrow(id);
    const isPendingReviewEditable =
      submission.status === 'pending_review' && (await this.hasNoDecidedSteps(id));
    if (!['draft', 'rejected'].includes(submission.status) && !isPendingReviewEditable) {
      throw new BadRequestException('Can only edit draft, rejected, or not-yet-reviewed pending submissions');
    }
    this.assertOwnerOrAdmin(user, submission);

    // BA §5.4: changing costCode forces all lines to match new code; FE confirms before sending.
    const newCostCodeId = dto.costCodeId ?? submission.costCodeId ?? null;
    if (submission.type === 'MS' && dto.expenseLines !== undefined && newCostCodeId) {
      this.assertLinesMatchCostCode(dto.expenseLines, newCostCodeId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.submission.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.content && { content: dto.content }),
          ...(dto.submittedDate && { submittedDate: new Date(dto.submittedDate) }),
          ...(dto.contractStartDate && { contractStartDate: new Date(dto.contractStartDate) }),
          ...(dto.contractEndDate && { contractEndDate: new Date(dto.contractEndDate) }),
          ...(dto.supplier !== undefined && { supplier: dto.supplier ?? null }),
          ...(dto.costCodeId !== undefined && { costCodeId: dto.costCodeId }),
          logUpdatedBy: user.staffId,
        },
      });

      if (dto.expenseLines !== undefined) {
        await tx.expenseLine.deleteMany({ where: { submissionId: id } });
        if (dto.expenseLines.length) {
          await tx.expenseLine.createMany({
            data: dto.expenseLines.map((el, i) => {
              const vatRate = el.vatRate ?? 10;
              const amountExVat = BigInt(Math.round(el.amountExVat));
              const amountIncVat = BigInt(Math.round(el.amountExVat * (1 + vatRate / 100)));
              return {
                id: uuidv7(),
                submissionId: id,
                costCodeId: el.costCodeId,
                costCodeName: el.costCodeName,
                amountExVat,
                vatRate,
                amountIncVat,
                supplier: el.supplier ?? '',
                purchasedFor: el.purchasedFor ?? null,
                purpose: el.purpose ?? null,
                usedBy: el.usedBy ?? null,
                sortOrder: el.sortOrder ?? i + 1,
              };
            }),
          });
        }
      }

      if (dto.existingInventory !== undefined) {
        await tx.existingInventory.deleteMany({ where: { submissionId: id } });
        if (dto.existingInventory.length) {
          await tx.existingInventory.createMany({
            data: dto.existingInventory.map((inv, i) => ({
              id: uuidv7(),
              submissionId: id,
              itemName: inv.itemName,
              quantity: inv.quantity,
              unit: inv.unit,
              sortOrder: inv.sortOrder ?? i + 1,
            })),
          });
        }
      }

      if (isPendingReviewEditable) {
        // BA §6.1: content changed while still un-reviewed → re-resolve and re-snapshot the approval plan.
        let submitterDeptId: string | null = null;
        if (submission.type === 'NT') {
          const staff = await tx.staff.findUnique({
            where: { id: submission.submitterId },
            select: { departmentId: true },
          });
          submitterDeptId = staff?.departmentId ?? null;
        }
        const total =
          submission.type === 'NT'
            ? null
            : (
                await tx.expenseLine.aggregate({
                  where: { submissionId: id },
                  _sum: { amountIncVat: true },
                })
              )._sum.amountIncVat ?? 0n;

        const { plan } = await this.approvalRules.resolvePlan(
          submission.type as 'MS' | 'NT',
          submission.type === 'NT' ? null : updated.costCodeId,
          total,
          submitterDeptId,
        );

        // Only notify approvers who are newly assigned to the first (in_progress) step group —
        // re-editing while pending review must not re-notify approvers unaffected by the change.
        const oldFirstGroupApproverIds = new Set(
          (
            await tx.submissionApprovalStep.findMany({
              where: { submissionId: id, status: 'in_progress' },
              select: { approverId: true },
            })
          ).map((s) => s.approverId),
        );

        await tx.submissionApprovalStep.deleteMany({ where: { submissionId: id } });
        await this.snapshotPlan(tx, id, plan);

        const minStepOrder = Math.min(...plan.map((p) => p.stepOrder));
        const newFirstGroupApproverIds = new Set(
          plan.filter((p) => p.stepOrder === minStepOrder).map((p) => p.approverId),
        );
        const approversToNotify = new Set(
          [...newFirstGroupApproverIds].filter((a) => !oldFirstGroupApproverIds.has(a)),
        );

        await this.activateNextGroup(tx, id, user.staffId, approversToNotify);
      }

      await tx.submissionLog.create({
        data: { id: uuidv7(), submissionId: id, userId: user.staffId, action: 'edit' },
      });

      return updated;
    });
  }

  async remove(user: IJwtPayload, id: string) {
    const submission = await this.getOrThrow(id);
    if (submission.status !== 'draft') throw new BadRequestException('Can only delete draft submissions');
    this.assertOwnerOrAdmin(user, submission);
    return this.prisma.submission.update({ where: { id }, data: { isDeleted: true, logUpdatedBy: user.staffId } });
  }

  /** Submit a previously-drafted submission (BA §6.1). Resolves plan + snapshots steps. */
  async submit(user: IJwtPayload, id: string) {
    const submission = await this.getOrThrow(id);
    if (!['draft', 'rejected'].includes(submission.status)) {
      throw new BadRequestException('Can only submit draft or rejected submissions');
    }
    this.assertOwnerOrAdmin(user, submission);

    if (submission.type === 'MS') {
      if (!submission.costCodeId) throw new BadRequestException('Tờ trình chưa có loại chi phí');
    }

    const total = submission.type === 'NT'
      ? null
      : await this.computeTotal(id);

    // BA §6.1: dept = submission.submitter.departmentId (Staff record, always reliable).
    let submitterDeptId: string | null = null;
    if (submission.type === 'NT') {
      const staff = await this.prisma.staff.findUnique({
        where: { id: submission.submitterId },
        select: { departmentId: true },
      });
      submitterDeptId = staff?.departmentId ?? null;
    }

    const { plan } = await this.approvalRules.resolvePlan(
      submission.type as 'MS' | 'NT',
      submission.type === 'NT' ? null : submission.costCodeId,
      total,
      submitterDeptId,
    );

    return this.prisma.$transaction(async (tx) => {
      // re-submit (status='rejected'): clear prior step snapshot before re-snapshotting.
      await tx.submissionApprovalStep.deleteMany({ where: { submissionId: id } });

      const updated = await tx.submission.update({
        where: { id },
        data: {
          status: 'pending_review',
          rejectionReason: null,
          logUpdatedBy: user.staffId,
        },
      });

      await this.snapshotPlan(tx, id, plan);
      await this.activateNextGroup(tx, id, user.staffId);

      await tx.submissionLog.create({
        data: { id: uuidv7(), submissionId: id, userId: user.staffId, action: 'submit',
          fromStatus: submission.status, toStatus: 'pending_review' },
      });

      return updated;
    });
  }

  /** Step-based approve (BA §6.2). One approver decides one in_progress step they own. */
  async approveStep(user: IJwtPayload, submissionId: string, dto: StepApproveDto) {
    const step = await this.loadStepForAction(submissionId, dto.stepId);
    if (step.approverId !== user.staffId && !user.hvRoles?.includes('admin')) {
      throw new ForbiddenException('Bạn không có quyền duyệt bước này.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.submissionApprovalStep.update({
        where: { id: step.id },
        data: {
          status: 'approved',
          decidedAt: new Date(),
          decidedBy: user.staffId,
          comment: dto.comment ?? null,
        },
      });

      // ANY: peer steps in the same group → skipped.
      // ALL: wait until every peer step is approved.
      const peers = await tx.submissionApprovalStep.findMany({
        where: { submissionId, stepOrder: step.stepOrder, NOT: { id: step.id } },
      });

      if (step.mode === 'ANY' && peers.some((p) => p.status === 'in_progress' || p.status === 'pending')) {
        await tx.submissionApprovalStep.updateMany({
          where: {
            submissionId,
            stepOrder: step.stepOrder,
            id: { not: step.id },
            status: { in: ['pending', 'in_progress'] },
          },
          data: { status: 'skipped' },
        });
      }

      const groupComplete =
        step.mode === 'ANY'
          ? true
          : peers.every((p) => p.status === 'approved' || p.status === 'skipped');

      let nextStatus: 'pending_review' | 'in_review' | 'approved' | null = null;
      if (groupComplete) {
        const nextStepType = await this.activateNextGroup(tx, submissionId, user.staffId);
        if (!nextStepType) {
          // no more steps → submission approved.
          await tx.submission.update({
            where: { id: submissionId },
            data: { status: 'approved', approvedAt: new Date(), logUpdatedBy: user.staffId },
          });
          nextStatus = 'approved';

          const submission = await tx.submission.findUnique({ where: { id: submissionId } });
          if (submission) {
            await this.queueNotification(submission.submitterId, 'E003', submissionId, {}, tx);
          }
        } else if (nextStepType === 'REVIEW') {
          // next group is still REVIEW — stay in pending_review.
          await tx.submission.update({
            where: { id: submissionId },
            data: { status: 'pending_review', logUpdatedBy: user.staffId },
          });
          nextStatus = 'pending_review';
        } else {
          // next group is APPROVE → move to in_review.
          await tx.submission.update({
            where: { id: submissionId },
            data: { status: 'in_review', logUpdatedBy: user.staffId },
          });
          nextStatus = 'in_review';
        }
      }

      await tx.submissionLog.create({
        data: {
          id: uuidv7(),
          submissionId,
          userId: user.staffId,
          action: 'approve',
          note: step.stepLabel ?? null,
          toStatus: nextStatus ?? undefined,
        },
      });

      return { ok: true };
    });
  }

  /** Step-based reject (BA §6.3). Rejecting any step terminates the submission. */
  async rejectStep(user: IJwtPayload, submissionId: string, dto: StepRejectDto) {
    const step = await this.loadStepForAction(submissionId, dto.stepId);
    if (step.approverId !== user.staffId && !user.hvRoles?.includes('admin')) {
      throw new ForbiddenException('Bạn không có quyền từ chối bước này.');
    }
    if (!dto.comment?.trim()) throw new BadRequestException('Lý do từ chối là bắt buộc');

    return this.prisma.$transaction(async (tx) => {
      await tx.submissionApprovalStep.update({
        where: { id: step.id },
        data: {
          status: 'rejected',
          decidedAt: new Date(),
          decidedBy: user.staffId,
          comment: dto.comment,
        },
      });

      // Skip all remaining live steps.
      await tx.submissionApprovalStep.updateMany({
        where: { submissionId, status: { in: ['pending', 'in_progress'] } },
        data: { status: 'skipped' },
      });

      const submission = await tx.submission.update({
        where: { id: submissionId },
        data: { status: 'rejected', rejectionReason: dto.comment, logUpdatedBy: user.staffId },
      });

      await tx.submissionLog.create({
        data: {
          id: uuidv7(),
          submissionId,
          userId: user.staffId,
          action: 'reject',
          note: dto.comment,
          toStatus: 'rejected',
        },
      });

      const decider = await tx.staff.findUnique({
        where: { id: user.staffId },
        select: { firstName: true, middleName: true, surname: true },
      });
      const deciderName = [decider?.firstName, decider?.middleName, decider?.surname].filter(Boolean).join(' ');
      const rejectEventId = step.stepType === 'APPROVE' ? 'E006' : 'E005';
      await this.queueNotification(submission.submitterId, rejectEventId, submissionId, { reason: dto.comment, 'decider.fullName': deciderName }, tx);
      return { ok: true };
    });
  }

  /** Admin-only reassign of step.approverId (BA §6.4). */
  async reassignStep(user: IJwtPayload, submissionId: string, stepId: string, dto: ReassignStepDto) {
    if (!user.hvRoles?.includes('admin')) {
      throw new ForbiddenException('Chỉ admin mới được đổi người duyệt.');
    }

    const step = await this.prisma.submissionApprovalStep.findFirst({
      where: { id: stepId, submissionId },
    });
    if (!step) throw new NotFoundException('Step not found');
    if (!['pending', 'in_progress'].includes(step.status)) {
      throw new BadRequestException('Chỉ đổi được người duyệt khi bước đang chờ hoặc đang xử lý.');
    }
    if (step.approverId === dto.newApproverId) {
      throw new BadRequestException('Người duyệt mới trùng với người hiện tại.');
    }

    const newApprover = await this.prisma.staff.findFirst({
      where: { id: dto.newApproverId, isDeleted: false },
    });
    if (!newApprover) throw new BadRequestException('Người duyệt mới không tồn tại.');

    return this.prisma.$transaction(async (tx) => {
      await tx.submissionApprovalStep.update({
        where: { id: stepId },
        data: {
          approverId: dto.newApproverId,
          reassignedAt: new Date(),
          reassignedBy: user.staffId,
          reassignReason: dto.reason,
        },
      });

      await tx.submissionLog.create({
        data: {
          id: uuidv7(),
          submissionId,
          userId: user.staffId,
          action: 'reassign',
          note: dto.reason,
        },
      });

      if (step.status === 'in_progress') {
        // notify new approver immediately
        const eventId = step.stepType === 'APPROVE' ? 'E002' : 'E001';
        await this.queueNotification(dto.newApproverId, eventId, submissionId, {}, tx);
      }

      return { ok: true };
    });
  }

  /** Back-compat shim: legacy callers may still POST /reject with a submission-level reason. */
  async reject(user: IJwtPayload, id: string, dto: RejectSubmissionDto) {
    const activeStep = await this.prisma.submissionApprovalStep.findFirst({
      where: { submissionId: id, status: 'in_progress' },
    });
    if (!activeStep) {
      throw new BadRequestException('Không có bước nào đang chờ xử lý để từ chối.');
    }
    return this.rejectStep(user, id, { stepId: activeStep.id, comment: dto.reason });
  }

  async getUploadUrl(mimeType: string, ext: string) {
    return this.storage.getPresignedUploadUrl('submissions', ext, mimeType);
  }

  async saveAttachment(user: IJwtPayload, submissionId: string, dto: SaveAttachmentDto) {
    const submission = await this.getOrThrow(submissionId);
    this.assertOwnerOrAdmin(user, submission);
    // signed_contract is a single-slot: overwrite any existing one
    if (dto.fileType === 'signed_contract') {
      await this.prisma.attachment.deleteMany({ where: { submissionId, fileType: 'signed_contract' } });
    }
    return this.prisma.attachment.create({
      data: {
        id: uuidv7(),
        submissionId,
        fileType: dto.fileType,
        name: dto.name,
        storageKey: dto.url,   // legacy flow stores full URL as key (presigned upload)
        mimeType: dto.mimeType,
        sizeBytes: BigInt(dto.sizeBytes),
        uploadedBy: user.staffId,
      },
    });
  }

  // ──────── helpers: approval engine ────────

  private sumLines(lines: Array<{ amountExVat: number; vatRate?: number }>): bigint {
    return lines.reduce((acc, l) => {
      const rate = l.vatRate ?? 10;
      return acc + BigInt(Math.round(l.amountExVat * (1 + rate / 100)));
    }, 0n);
  }

  private async computeTotal(submissionId: string): Promise<bigint> {
    const agg = await this.prisma.expenseLine.aggregate({
      where: { submissionId },
      _sum: { amountIncVat: true },
    });
    return agg._sum.amountIncVat ?? 0n;
  }

  private assertLinesMatchCostCode(
    lines: Array<{ costCodeId: string }> | undefined,
    submissionCostCodeId: string,
  ) {
    if (!lines?.length) return;
    if (lines.some((l) => l.costCodeId !== submissionCostCodeId)) {
      throw new BadRequestException('Tất cả dòng chi phí phải cùng loại với tờ trình.');
    }
  }

  private async snapshotPlan(
    tx: Prisma.TransactionClient,
    submissionId: string,
    plan: Array<{ stepOrder: number; stepType: string; stepLabel: string | null; approverId: string; mode: string }>,
  ) {
    await tx.submissionApprovalStep.createMany({
      data: plan.map((d) => ({
        id: uuidv7(),
        submissionId,
        stepOrder: d.stepOrder,
        stepType: d.stepType,
        stepLabel: d.stepLabel,
        approverId: d.approverId,
        originalApproverId: d.approverId,
        mode: d.mode,
        status: 'pending',
      })),
    });
  }

  /**
   * Find the next group of pending steps (smallest stepOrder), flip them to in_progress,
   * notify each approver. Returns the stepType of the activated group, or null if none remain.
   */
  private async activateNextGroup(
    tx: Prisma.TransactionClient,
    submissionId: string,
    _actor: string,
    notifyApproverIds?: Set<string>,
  ): Promise<string | null> {
    const next = await tx.submissionApprovalStep.findFirst({
      where: { submissionId, status: 'pending' },
      orderBy: { stepOrder: 'asc' },
    });
    if (!next) return null;

    const group = await tx.submissionApprovalStep.findMany({
      where: { submissionId, stepOrder: next.stepOrder, status: 'pending' },
    });

    await tx.submissionApprovalStep.updateMany({
      where: { submissionId, stepOrder: next.stepOrder, status: 'pending' },
      data: { status: 'in_progress' },
    });

    for (const s of group) {
      if (notifyApproverIds && !notifyApproverIds.has(s.approverId)) continue;
      const eventId = s.stepType === 'APPROVE' ? 'E002' : 'E001';
      await this.queueNotification(s.approverId, eventId, submissionId, {}, tx);
    }
    return next.stepType;
  }

  private async hasNoDecidedSteps(submissionId: string): Promise<boolean> {
    const decided = await this.prisma.submissionApprovalStep.findFirst({
      where: { submissionId, status: { notIn: ['pending', 'in_progress'] } },
    });
    return !decided;
  }

  private async loadStepForAction(submissionId: string, stepId: string) {
    const step = await this.prisma.submissionApprovalStep.findFirst({
      where: { id: stepId, submissionId },
    });
    if (!step) throw new NotFoundException('Step not found');
    if (step.status !== 'in_progress') {
      throw new BadRequestException('Bước này đã được xử lý.');
    }
    return step;
  }

  private async getOrThrow(id: string) {
    const s = await this.prisma.submission.findUnique({ where: { id } });
    if (!s || s.isDeleted) throw new NotFoundException('Submission not found');
    return s;
  }

  private async assertCanView(user: IJwtPayload, submission: { submitterId: string; departmentId: string }) {
    if (user.hvRoles?.some((r) => ['admin', 'reviewer', 'approver'].includes(r))) return;
    if (submission.submitterId === user.staffId) return;
    // §3.3: staff can also view submissions in their own department
    const staff = await this.prisma.staff.findUnique({ where: { id: user.staffId }, select: { departmentId: true } });
    if (staff?.departmentId && staff.departmentId === submission.departmentId) return;
    throw new ForbiddenException('Access denied');
  }

  private assertOwnerOrAdmin(user: IJwtPayload, submission: { submitterId: string }) {
    if (user.hvRoles?.includes('admin')) return;
    if (submission.submitterId !== user.staffId) throw new ForbiddenException('Not your submission');
  }

  private async generateCode(type: string): Promise<string> {
    const prefix = type === 'MS' ? 'MS' : 'NT';
    // Must include soft-deleted rows to avoid reusing a code that still holds the unique index.
    // Middleware adds isDeleted:false to every read, so we use $queryRaw here.
    // Prisma.raw() for the integer literal avoids the bigint cast error on SUBSTRING's position arg.
    const pos = Prisma.raw(String(prefix.length + 1));
    const rows = await this.prisma.$queryRaw<{ max_suffix: number | null }[]>(
      Prisma.sql`
        SELECT MAX(CAST(SUBSTRING("Code", ${pos}) AS INTEGER)) AS max_suffix
        FROM "Submission"
        WHERE "Type" = ${type}
      `,
    );
    const lastNum = Number(rows[0]?.max_suffix ?? 0);
    return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
  }

  private submissionUrl(id: string): string {
    return `${(process.env.CORS_ORIGIN ?? 'http://localhost:5418').replace(/\/$/, '')}/submissions/${id}`;
  }

  private async queueNotification(
    toStaffId: string,
    eventId: 'E001' | 'E002' | 'E003' | 'E004' | 'E005' | 'E006',
    submissionId: string,
    extra: Record<string, string> = {},
    db: Prisma.TransactionClient = this.prisma as unknown as Prisma.TransactionClient,
  ) {
    const staffName = (s: { firstName: string | null; middleName?: string | null; surname: string | null } | null) =>
      [s?.surname, s?.middleName, s?.firstName].filter(Boolean).join(' ') || '';

    const [toStaff, submission, subjectRow, bodyRow] = await Promise.all([
      db.staff.findUnique({ where: { id: toStaffId }, select: { companyEmailAddress: true, firstName: true, middleName: true, surname: true, userLogin: { select: { username: true } } } }),
      db.submission.findUnique({
        where: { id: submissionId },
        select: {
          code: true, title: true, submittedDate: true,
          submitter: { select: { firstName: true, middleName: true, surname: true, userLogin: { select: { username: true } } } },
          reviewer:  { select: { firstName: true, middleName: true, surname: true } },
          approver:  { select: { firstName: true, middleName: true, surname: true } },
          department: { select: { name: true } },
        },
      }),
      db.systemSetting.findUnique({ where: { key: `hv.email.${eventId}.subject` } }),
      db.systemSetting.findUnique({ where: { key: `hv.email.${eventId}.body` } }),
    ]);

    if (!submission) return;

    const vars: Record<string, string> = {
      code: submission.code,
      title: submission.title,
      'recipient': staffName(toStaff),
      'recipient.fullName': staffName(toStaff),
      'submitter.fullName': staffName(submission.submitter),
      'reviewer.fullName':  staffName(submission.reviewer),
      'approver.fullName':  staffName(submission.approver),
      department: submission.department?.name ?? '',
      submittedDate: submission.submittedDate
        ? new Date(submission.submittedDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '',
      link: this.submissionUrl(submissionId),
      submitter_username: submission.submitter?.userLogin?.username ?? '',
      recipient_username: toStaff?.userLogin?.username ?? '',
      ...extra,
    };

    const fill = (tpl: string) =>
      Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), tpl);

    const defaults = HV_EMAIL_DEFAULTS[eventId];
    const subject  = fill(subjectRow?.value?.trim() || defaults.subject);
    const bodyHtml = fill(bodyRow?.value?.trim()    || defaults.body);

    // E001/E002/E003/E005/E006 honor the per-channel toggle. E004 is email-only by spec.
    const channelGated = eventId === 'E001' || eventId === 'E002' || eventId === 'E003' || eventId === 'E005' || eventId === 'E006';
    const emailEnabled = channelGated ? await this.notificationChannels.isEmailEnabled() : true;

    if (emailEnabled && toStaff?.companyEmailAddress) {
      await db.emailQueue.create({
        data: {
          id: uuidv7(),
          to: toStaff.companyEmailAddress,
          subject,
          bodyHtml,
          type: 'submission_notification',
          logCreatedBy: 'system',
        },
      });
    }

    // For E001/E002/E003/E005/E006 also dispatch to enabled webhook channels (Google Chat / Custom).
    if (channelGated) {
      // Best-effort; never block the workflow on a webhook failure.
      void this.notificationChannels.dispatchToEnabledWebhooks({
        event: eventId as import('../notification-channels/notification-channels.service').WebhookEventId,
        submissionCode: submission.code,
        submissionTitle: submission.title,
        submissionUrl: this.submissionUrl(submissionId),
        recipientName: staffName(toStaff),
        submitterName: staffName(submission.submitter),
        triggeredAt: new Date().toISOString(),
        submitterUsername: submission.submitter?.userLogin?.username ?? undefined,
        recipientUsername: toStaff?.userLogin?.username ?? undefined,
        ...(extra['decider.fullName'] !== undefined && { deciderName: extra['decider.fullName'] }),
        ...(extra['reason'] !== undefined && { reason: extra['reason'] }),
      });
    }
  }
}
