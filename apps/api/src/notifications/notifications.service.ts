import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uuidv7 } from 'uuidv7';

export type NotificationType = 'info' | 'warning' | 'alert';

export interface INotificationListParams {
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificationsService {
  // Set by gateway after initialization to avoid circular dep
  private gateway: { sendToStaff: (staffId: string, notification: unknown) => void } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  setGateway(gateway: { sendToStaff: (staffId: string, notification: unknown) => void }) {
    this.gateway = gateway;
  }

  async create(
    staffId: string,
    title: string,
    body: string,
    type: NotificationType,
    link?: string,
    /** Optional dedup key — stored in the `note` field. Use existsByNote() before calling. */
    noteKey?: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        id: uuidv7(),
        staffId,
        title,
        body,
        type,
        link: link ?? null,
        note: noteKey ?? null,
        logCreatedBy: 'system',
        logUpdatedBy: 'system',
      },
    });

    this.gateway?.sendToStaff(staffId, notification);

    return notification;
  }

  /**
   * Returns true if a notification with this exact noteKey already exists for the staff
   * (regardless of date — use date-scoped keys like `ref:late-arrival:{staffId}:2026-04-15`).
   */
  async existsByNote(staffId: string, noteKey: string): Promise<boolean> {
    const found = await this.prisma.notification.findFirst({
      where: { staffId, note: noteKey, isDeleted: false },
      select: { id: true },
    });
    return !!found;
  }

  async findAll(staffId: string, params: INotificationListParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where = { staffId, isDeleted: false };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isRead: 'asc' }, { logCreatedAt: 'desc' }],
      }),
      this.prisma.notification.count({ where }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { staffId, isDeleted: false, isRead: false },
    });

    return {
      data,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(id: string, staffId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, staffId, isDeleted: false },
    });
    if (!notification) return null;

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date(), logUpdatedBy: staffId },
    });
  }

  async markAllAsRead(staffId: string) {
    await this.prisma.notification.updateMany({
      where: { staffId, isRead: false, isDeleted: false },
      data: { isRead: true, readAt: new Date(), logUpdatedBy: staffId },
    });
    return { success: true };
  }
}
