import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { uuidv7 } from 'uuidv7';

export interface ICreateApiLog {
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  requestBody?: string;
  queryParams?: string;
  clientInfo?: string;
}

export interface IApiLogFilter {
  method?: string;
  url?: string;
  statusCode?: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'accesstoken', 'refreshtoken'];
const MAX_BODY_BYTES = 10 * 1024; // 10KB

export function sanitizeBody(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeBody);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    result[key] = SENSITIVE_KEYS.some((k) => lower.includes(k)) ? '[REDACTED]' : sanitizeBody(value);
  }
  return result;
}

export function serializeBody(body: unknown): string | undefined {
  if (!body || (typeof body === 'object' && Object.keys(body as object).length === 0)) return undefined;
  try {
    const sanitized = sanitizeBody(body);
    const json = JSON.stringify(sanitized);
    return json.length > MAX_BODY_BYTES ? json.slice(0, MAX_BODY_BYTES) + '…[truncated]' : json;
  } catch {
    return undefined;
  }
}

@Injectable()
export class ApiLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: ICreateApiLog): Promise<void> {
    await this.prisma.apiRequestLog.create({
      data: {
        id: uuidv7(),
        method: dto.method,
        url: dto.url,
        statusCode: dto.statusCode,
        durationMs: dto.durationMs,
        userId: dto.userId,
        userName: dto.userName,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        requestBody: dto.requestBody,
        queryParams: dto.queryParams,
        clientInfo: dto.clientInfo,
      },
    });
  }

  async findAll(filter: IApiLogFilter) {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {}; // no isDeleted — ApiRequestLog is append-only
    if (filter.method) where['method'] = filter.method.toUpperCase();
    if (filter.url) where['url'] = { contains: filter.url, mode: 'insensitive' };
    if (filter.statusCode) where['statusCode'] = Number(filter.statusCode);
    if (filter.userId) where['userId'] = filter.userId;

    if (filter.startDate || filter.endDate) {
      where['createdAt'] = {
        ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
        ...(filter.endDate ? { lte: new Date(filter.endDate) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.apiRequestLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.apiRequestLog.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
