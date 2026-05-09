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
import { IJwtPayload } from '../auth/strategies/jwt.strategy';

const HV_EMAIL_DEFAULTS: Record<'E001' | 'E002' | 'E003' | 'E004', { subject: string; body: string }> = {
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
};

export class SaveAttachmentDto {
  @IsString() name!: string;
  @IsString() url!: string;        // kept for backward-compat (legacy presigned flow)
  @IsString() fileType!: string;
  @IsString() mimeType!: string;
  @IsNumber() @Min(0) sizeBytes!: number;
}

const SUBMISSION_INCLUDE = {
  submitter: { select: { id: true, firstName: true, middleName: true, surname: true, companyEmailAddress: true } },
  reviewer: { select: { id: true, firstName: true, middleName: true, surname: true, companyEmailAddress: true } },
  approver: { select: { id: true, firstName: true, middleName: true, surname: true, companyEmailAddress: true } },
  department: { select: { id: true, name: true } },
  expenseLines: { orderBy: { sortOrder: 'asc' as const } },
  existingInventory: { orderBy: { sortOrder: 'asc' as const } },
  attachments: true,
  logs: {
    orderBy: { createdAt: 'desc' as const },
    include: { user: { select: { id: true, firstName: true, middleName: true, surname: true } } },
  },
};

@Injectable()
export class SubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  listDepartments() {
    return this.prisma.department.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  listStaffByRole(hvRole: 'reviewer' | 'approver') {
    return this.prisma.staff.findMany({
      where: { isDeleted: false, hvRole },
      select: { id: true, firstName: true, middleName: true, surname: true },
      orderBy: { surname: 'asc' },
    });
  }

  private async buildUserScope(user: IJwtPayload): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = { isDeleted: false };
    if (user.hvRole === 'staff') {
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
    const config = await this.prisma.approvalConfig.findUnique({ where: { departmentId: dto.departmentId } });
    if (!config) throw new BadRequestException('No approval config for this department');

    const isSubmit = dto.action === 'submit';

    // Submitting MS requires at least 1 expense line
    if (isSubmit && dto.type === 'MS' && (!dto.expenseLines || dto.expenseLines.length === 0)) {
      throw new BadRequestException('Mua sắm submission requires at least one expense line');
    }

    // NT requires supplier and contract dates
    if (dto.type === 'NT') {
      if (!dto.supplier?.trim()) throw new BadRequestException('Nhà cung cấp là bắt buộc');
      if (!dto.contractStartDate) throw new BadRequestException('Ngày bắt đầu hợp đồng là bắt buộc');
      if (!dto.contractEndDate) throw new BadRequestException('Ngày kết thúc hợp đồng là bắt buộc');
    }

    const status = isSubmit ? 'pending_review' : 'draft';
    const code = await this.generateCode(dto.type);

    const submission = await this.prisma.$transaction(async (tx) => {
      const created = await tx.submission.create({
        data: {
          id: uuidv7(),
          type: dto.type,
          code,
          submitterId: user.staffId,
          departmentId: dto.departmentId,
          submittedDate: new Date(dto.submittedDate),
          title: dto.title,
          content: dto.content ?? '',
          status,
          reviewerId: config.reviewerId,
          approverId: config.approverId,
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

      await tx.submissionLog.create({
        data: {
          id: uuidv7(),
          submissionId: created.id,
          userId: user.staffId,
          action: isSubmit ? 'submit' : 'create',
          toStatus: status,
        },
      });

      if (isSubmit) {
        await this.queueNotification(created.reviewerId, 'E001', created.id, {}, tx);
      }

      return created;
    });

    return submission;
  }

  async update(user: IJwtPayload, id: string, dto: UpdateSubmissionDto) {
    const submission = await this.getOrThrow(id);
    if (!['draft', 'rejected'].includes(submission.status)) {
      throw new BadRequestException('Can only edit draft or rejected submissions');
    }
    this.assertOwnerOrAdmin(user, submission);

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

  async submit(user: IJwtPayload, id: string) {
    const submission = await this.getOrThrow(id);
    if (!['draft', 'rejected'].includes(submission.status)) {
      throw new BadRequestException('Can only submit draft or rejected submissions');
    }
    this.assertOwnerOrAdmin(user, submission);

    if (submission.type === 'MS') {
      const lineCount = await this.prisma.expenseLine.count({ where: { submissionId: id } });
      if (lineCount === 0) throw new BadRequestException('Mua sắm submission requires at least one expense line');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.submission.update({
        where: { id },
        data: { status: 'pending_review', logUpdatedBy: user.staffId },
      });

      await tx.submissionLog.create({
        data: { id: uuidv7(), submissionId: id, userId: user.staffId, action: 'submit',
          fromStatus: submission.status, toStatus: 'pending_review' },
      });

      await this.queueNotification(submission.reviewerId, 'E001', id, {}, tx);
      return updated;
    });
  }

  async review(user: IJwtPayload, id: string) {
    const submission = await this.getOrThrow(id);
    if (submission.status !== 'pending_review') throw new BadRequestException('Submission is not pending review');
    if (user.hvRole !== 'admin' && submission.reviewerId !== user.staffId) {
      throw new ForbiddenException('You are not the reviewer for this submission');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.submission.update({
        where: { id },
        data: { status: 'in_review', reviewedAt: new Date(), logUpdatedBy: user.staffId },
      });

      await tx.submissionLog.create({
        data: { id: uuidv7(), submissionId: id, userId: user.staffId, action: 'review',
          fromStatus: 'pending_review', toStatus: 'in_review' },
      });

      await this.queueNotification(submission.approverId, 'E002', id, {}, tx);
      return updated;
    });
  }

  async approve(user: IJwtPayload, id: string) {
    const submission = await this.getOrThrow(id);
    if (submission.status !== 'in_review') throw new BadRequestException('Submission is not in review');
    if (user.hvRole !== 'admin' && submission.approverId !== user.staffId) {
      throw new ForbiddenException('You are not the approver for this submission');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.submission.update({
        where: { id },
        data: { status: 'approved', approvedAt: new Date(), logUpdatedBy: user.staffId },
      });

      await tx.submissionLog.create({
        data: { id: uuidv7(), submissionId: id, userId: user.staffId, action: 'approve',
          fromStatus: 'in_review', toStatus: 'approved' },
      });

      await this.queueNotification(submission.submitterId, 'E003', id, {}, tx);
      return updated;
    });
  }

  async reject(user: IJwtPayload, id: string, dto: RejectSubmissionDto) {
    const submission = await this.getOrThrow(id);
    if (!['pending_review', 'in_review'].includes(submission.status)) {
      throw new BadRequestException('Submission cannot be rejected in current status');
    }

    const isReviewer = user.hvRole === 'reviewer' || user.hvRole === 'admin';
    const isApprover = user.hvRole === 'approver' || user.hvRole === 'admin';

    if (submission.status === 'pending_review' && !isReviewer) throw new ForbiddenException('Only reviewer can reject at this stage');
    if (submission.status === 'in_review' && !isApprover) throw new ForbiddenException('Only approver can reject at this stage');

    if (user.hvRole !== 'admin') {
      if (submission.status === 'pending_review' && submission.reviewerId !== user.staffId) throw new ForbiddenException('Not your submission to review');
      if (submission.status === 'in_review' && submission.approverId !== user.staffId) throw new ForbiddenException('Not your submission to approve');
    }

    const fromStatus = submission.status;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.submission.update({
        where: { id },
        data: { status: 'rejected', rejectionReason: dto.reason, logUpdatedBy: user.staffId },
      });

      await tx.submissionLog.create({
        data: { id: uuidv7(), submissionId: id, userId: user.staffId, action: 'reject',
          fromStatus, toStatus: 'rejected', note: dto.reason },
      });

      await this.queueNotification(submission.submitterId, 'E004', id, { reason: dto.reason }, tx);
      return updated;
    });
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

  private async getOrThrow(id: string) {
    const s = await this.prisma.submission.findUnique({ where: { id } });
    if (!s || s.isDeleted) throw new NotFoundException('Submission not found');
    return s;
  }

  private async assertCanView(user: IJwtPayload, submission: { submitterId: string; departmentId: string }) {
    if (user.hvRole === 'admin' || user.hvRole === 'reviewer' || user.hvRole === 'approver') return;
    if (submission.submitterId === user.staffId) return;
    // §3.3: staff can also view submissions in their own department
    const staff = await this.prisma.staff.findUnique({ where: { id: user.staffId }, select: { departmentId: true } });
    if (staff?.departmentId && staff.departmentId === submission.departmentId) return;
    throw new ForbiddenException('Access denied');
  }

  private assertOwnerOrAdmin(user: IJwtPayload, submission: { submitterId: string }) {
    if (user.hvRole === 'admin') return;
    if (submission.submitterId !== user.staffId) throw new ForbiddenException('Not your submission');
  }

  private async generateCode(type: string): Promise<string> {
    const prefix = type === 'MS' ? 'MS' : 'NT';
    const count = await this.prisma.submission.count({ where: { type } });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private submissionUrl(id: string): string {
    return `${(process.env.CORS_ORIGIN ?? 'http://localhost:5418').replace(/\/$/, '')}/submissions/${id}`;
  }

  private async queueNotification(
    toStaffId: string,
    eventId: 'E001' | 'E002' | 'E003' | 'E004',
    submissionId: string,
    extra: Record<string, string> = {},
    db: Prisma.TransactionClient = this.prisma as unknown as Prisma.TransactionClient,
  ) {
    const staffName = (s: { firstName: string | null; middleName?: string | null; surname: string | null } | null) =>
      [s?.firstName, s?.middleName, s?.surname].filter(Boolean).join(' ') || '';

    const [toStaff, submission, subjectRow, bodyRow] = await Promise.all([
      db.staff.findUnique({ where: { id: toStaffId }, select: { companyEmailAddress: true } }),
      db.submission.findUnique({
        where: { id: submissionId },
        select: {
          code: true, title: true, submittedDate: true,
          submitter: { select: { firstName: true, middleName: true, surname: true } },
          reviewer:  { select: { firstName: true, middleName: true, surname: true } },
          approver:  { select: { firstName: true, middleName: true, surname: true } },
          department: { select: { name: true } },
        },
      }),
      db.systemSetting.findUnique({ where: { key: `hv.email.${eventId}.subject` } }),
      db.systemSetting.findUnique({ where: { key: `hv.email.${eventId}.body` } }),
    ]);

    if (!toStaff?.companyEmailAddress || !submission) return;

    const vars: Record<string, string> = {
      code: submission.code,
      title: submission.title,
      'submitter.fullName': staffName(submission.submitter),
      'reviewer.fullName':  staffName(submission.reviewer),
      'approver.fullName':  staffName(submission.approver),
      department: submission.department?.name ?? '',
      submittedDate: submission.submittedDate
        ? new Date(submission.submittedDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '',
      link: this.submissionUrl(submissionId),
      ...extra,
    };

    const fill = (tpl: string) =>
      Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), tpl);

    const defaults = HV_EMAIL_DEFAULTS[eventId];
    const subject  = fill(subjectRow?.value?.trim() || defaults.subject);
    const bodyHtml = fill(bodyRow?.value?.trim()    || defaults.body);

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
}
