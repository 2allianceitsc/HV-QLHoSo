import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateVibeIconDto,
  UpdateVibeIconDto,
  ReorderVibeIconsDto,
  CreateVibeIconSetDto,
  UpdateVibeIconSetDto,
} from './dto/vibe-icon.dto';
import { uuidv7 } from 'uuidv7';

export interface IVibeIconUrlIssue {
  id: string;
  name: string;
  iconUrl: string;
  vibeIconSetId: string | null;
  vibeIconSetName: string | null;
  httpStatus?: number;
  error?: string;
}

export interface IVibeIconUrlScanResult {
  scannedAt: string;
  totalChecked: number;
  brokenCount: number;
  broken: IVibeIconUrlIssue[];
}

interface IVibeIconCheckOptions {
  onlyActiveSet?: boolean;
  includeDisabled?: boolean;
}

@Injectable()
export class SystemVibeIconsService {
  private readonly ICON_URL_TIMEOUT_MS = 5000;
  private readonly ICON_SCAN_CONCURRENCY = 6;

  constructor(private readonly prisma: PrismaService) {}

  // ── Icon Sets ──────────────────────────────────────────────────────────────

  async findAllSets() {
    return this.prisma.vIBEIconSet.findMany({
      where: { isDeleted: false },
      orderBy: { orderNo: 'asc' },
      include: {
        _count: { select: { icons: { where: { isDeleted: false } } } },
      },
    });
  }

  async findOneSet(id: string) {
    const set = await this.prisma.vIBEIconSet.findFirst({
      where: { id, isDeleted: false },
    });
    if (!set) throw new NotFoundException(`VIBE Icon Set ${id} not found`);
    return set;
  }

  async createSet(dto: CreateVibeIconSetDto, createdBy: string) {
    return this.prisma.vIBEIconSet.create({
      data: {
        id: uuidv7(),
        setName: dto.setName,
        description: dto.description,
        isActive: false,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async updateSet(id: string, dto: UpdateVibeIconSetDto, updatedBy: string) {
    await this.findOneSet(id);
    return this.prisma.vIBEIconSet.update({
      where: { id },
      data: { setName: dto.setName, description: dto.description, logUpdatedBy: updatedBy },
    });
  }

  async removeSet(id: string) {
    const set = await this.findOneSet(id);
    if (set.isActive) {
      throw new BadRequestException('Cannot delete the active icon set. Activate another set first.');
    }
    return this.prisma.vIBEIconSet.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /** Activate a set — deactivates all others atomically */
  async activateSet(id: string, updatedBy: string) {
    await this.findOneSet(id);
    await this.prisma.$transaction([
      this.prisma.vIBEIconSet.updateMany({
        where: { isActive: true },
        data: { isActive: false, logUpdatedBy: updatedBy },
      }),
      this.prisma.vIBEIconSet.update({
        where: { id },
        data: { isActive: true, logUpdatedBy: updatedBy },
      }),
    ]);
    return this.prisma.vIBEIconSet.findUnique({ where: { id } });
  }

  /** Copy all non-deleted icons from sourceSetId into targetSetId (appended after existing) */
  async copyIconsToSet(targetSetId: string, sourceSetId: string, createdBy: string) {
    await this.findOneSet(targetSetId);
    await this.findOneSet(sourceSetId);

    const sourceIcons = await this.prisma.vIBEIcons.findMany({
      where: { vibeIconSetId: sourceSetId, isDeleted: false },
      orderBy: { orderNo: 'asc' },
    });

    if (sourceIcons.length === 0) return { copied: 0 };

    const maxOrder = await this.prisma.vIBEIcons.aggregate({
      where: { vibeIconSetId: targetSetId, isDeleted: false },
      _max: { orderNo: true },
    });
    const offset = (maxOrder._max.orderNo ?? -1) + 1;

    await this.prisma.$transaction(
      sourceIcons.map((icon, index) =>
        this.prisma.vIBEIcons.create({
          data: {
            id: uuidv7(),
            vibeIconSetId: targetSetId,
            name: icon.name,
            hoverText: icon.hoverText,
            iconText: icon.iconText,
            emojiCode: icon.emojiCode,
            iconUrl: icon.iconUrl,
            description: icon.description,
            category: icon.category,
            orderNo: offset + index,
            logCreatedBy: createdBy,
            logUpdatedBy: createdBy,
          },
        }),
      ),
    );

    return { copied: sourceIcons.length };
  }

  /** Duplicate a set (creates new set with "Copy of …" name + all icons) */
  async duplicateSet(id: string, createdBy: string) {
    const source = await this.findOneSet(id);

    const sourceIcons = await this.prisma.vIBEIcons.findMany({
      where: { vibeIconSetId: id, isDeleted: false },
      orderBy: { orderNo: 'asc' },
    });

    const newSetId = uuidv7();

    await this.prisma.$transaction([
      this.prisma.vIBEIconSet.create({
        data: {
          id: newSetId,
          setName: `Copy of ${source.setName}`,
          description: source.description,
          isActive: false,
          logCreatedBy: createdBy,
          logUpdatedBy: createdBy,
        },
      }),
      ...sourceIcons.map((icon) =>
        this.prisma.vIBEIcons.create({
          data: {
            id: uuidv7(),
            vibeIconSetId: newSetId,
            name: icon.name,
            hoverText: icon.hoverText,
            iconText: icon.iconText,
            emojiCode: icon.emojiCode,
            iconUrl: icon.iconUrl,
            description: icon.description,
            category: icon.category,
            orderNo: icon.orderNo,
            logCreatedBy: createdBy,
            logUpdatedBy: createdBy,
          },
        }),
      ),
    ]);

    return this.prisma.vIBEIconSet.findUnique({
      where: { id: newSetId },
      include: { _count: { select: { icons: { where: { isDeleted: false } } } } },
    });
  }

  /** Move all orphaned icons (vibeIconSetId = null) into a "NoName" set */
  async collectOrphans(updatedBy: string) {
    const orphans = await this.prisma.vIBEIcons.findMany({
      where: { vibeIconSetId: null, isDeleted: false },
      select: { id: true },
    });

    if (orphans.length === 0) return { collected: 0, setId: null };

    let noNameSet = await this.prisma.vIBEIconSet.findFirst({
      where: { setName: 'NoName', isDeleted: false },
    });

    if (!noNameSet) {
      noNameSet = await this.prisma.vIBEIconSet.create({
        data: {
          id: uuidv7(),
          setName: 'NoName',
          description: 'Icons without a set — auto-collected',
          isActive: false,
          logCreatedBy: updatedBy,
          logUpdatedBy: updatedBy,
        },
      });
    }

    await this.prisma.vIBEIcons.updateMany({
      where: { vibeIconSetId: null, isDeleted: false },
      data: { vibeIconSetId: noNameSet.id, logUpdatedBy: updatedBy },
    });

    return { collected: orphans.length, setId: noNameSet.id };
  }

  async findIconsBySet(setId: string) {
    return this.prisma.vIBEIcons.findMany({
      where: { vibeIconSetId: setId, isDeleted: false },
      orderBy: { orderNo: 'asc' },
    });
  }

  // ── Icons ──────────────────────────────────────────────────────────────────

  async findAll() {
    return this.prisma.vIBEIcons.findMany({
      where: { isDeleted: false },
      orderBy: { orderNo: 'asc' },
      include: { vibeIconSet: { select: { id: true, setName: true, isActive: true } } },
    });
  }

  async scanIconUrls(options: IVibeIconCheckOptions = {}): Promise<IVibeIconUrlScanResult> {
    const { onlyActiveSet = false, includeDisabled = true } = options;

    const icons = await this.prisma.vIBEIcons.findMany({
      where: {
        isDeleted: false,
        isDisabled: includeDisabled ? undefined : false,
        iconUrl: { not: null },
        vibeIconSet: onlyActiveSet
          ? {
              is: {
                isDeleted: false,
                isActive: true,
              },
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        iconUrl: true,
        vibeIconSetId: true,
        vibeIconSet: {
          select: {
            setName: true,
          },
        },
      },
      orderBy: { orderNo: 'asc' },
    });

    const candidates = icons.filter((icon) => !!icon.iconUrl?.trim());

    const checks = await this.mapWithConcurrency(candidates, this.ICON_SCAN_CONCURRENCY, async (icon) => {
      const check = await this.checkSingleIconUrl(icon.iconUrl!.trim());
      return {
        ...icon,
        ...check,
      };
    });

    const broken = checks
      .filter((item) => !item.ok)
      .map<IVibeIconUrlIssue>((item) => ({
        id: item.id,
        name: item.name,
        iconUrl: item.iconUrl!,
        vibeIconSetId: item.vibeIconSetId,
        vibeIconSetName: item.vibeIconSet?.setName ?? null,
        httpStatus: item.httpStatus,
        error: item.error,
      }));

    return {
      scannedAt: new Date().toISOString(),
      totalChecked: candidates.length,
      brokenCount: broken.length,
      broken,
    };
  }

  async findOne(id: string) {
    const icon = await this.prisma.vIBEIcons.findFirst({
      where: { id, isDeleted: false },
    });
    if (!icon) throw new NotFoundException(`VIBE Icon ${id} not found`);
    return icon;
  }

  async create(dto: CreateVibeIconDto, createdBy: string) {
    return this.prisma.vIBEIcons.create({
      data: {
        id: uuidv7(),
        vibeIconSetId: dto.vibeIconSetId ?? null,
        name: dto.name,
        hoverText: dto.hoverText,
        iconText: dto.iconText,
        emojiCode: dto.emojiCode,
        iconUrl: dto.iconUrl,
        description: dto.description,
        category: dto.category,
        orderNo: dto.orderNo ?? 0,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateVibeIconDto, updatedBy: string) {
    await this.findOne(id);
    // Empty string means "clear this field" — Prisma needs null, not undefined
    // (undefined = skip/don't-update; null = set to NULL in DB).
    const clear = (v: string | undefined) =>
      v === undefined ? undefined : (v || null);
    return this.prisma.vIBEIcons.update({
      where: { id },
      data: {
        vibeIconSetId: dto.vibeIconSetId ?? undefined,
        name: dto.name,
        hoverText: clear(dto.hoverText),
        iconText: clear(dto.iconText),
        emojiCode: clear(dto.emojiCode),
        iconUrl: clear(dto.iconUrl),
        description: clear(dto.description),
        category: clear(dto.category),
        orderNo: dto.orderNo ?? undefined,
        logUpdatedBy: updatedBy,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vIBEIcons.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async toggleDisabled(id: string, updatedBy: string) {
    const icon = await this.findOne(id);
    return this.prisma.vIBEIcons.update({
      where: { id },
      data: { isDisabled: !icon.isDisabled, logUpdatedBy: updatedBy },
    });
  }

  async reorder(dto: ReorderVibeIconsDto, updatedBy: string) {
    const ops = dto.ids.map((id, index) =>
      this.prisma.vIBEIcons.update({
        where: { id },
        data: { orderNo: index, logUpdatedBy: updatedBy },
      }),
    );
    await this.prisma.$transaction(ops);
    return { reordered: dto.ids.length };
  }

  private async checkSingleIconUrl(iconUrl: string): Promise<{ ok: boolean; httpStatus?: number; error?: string }> {
    if (iconUrl.startsWith('data:')) {
      return { ok: true, httpStatus: 200 };
    }

    let parsed: URL;
    try {
      parsed = new URL(iconUrl);
    } catch {
      return { ok: false, error: 'Invalid URL format' };
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, error: `Unsupported protocol: ${parsed.protocol}` };
    }

    const headResult = await this.fetchStatus(parsed.toString(), 'HEAD');
    if (headResult.networkError) {
      return { ok: false, error: headResult.networkError };
    }

    if (headResult.status === 405) {
      const getResult = await this.fetchStatus(parsed.toString(), 'GET');
      if (getResult.networkError) {
        return { ok: false, error: getResult.networkError };
      }
      return {
        ok: !!getResult.status && getResult.status >= 200 && getResult.status < 400,
        httpStatus: getResult.status,
        error: !getResult.status || getResult.status < 200 || getResult.status >= 400
          ? `HTTP ${getResult.status}`
          : undefined,
      };
    }

    return {
      ok: !!headResult.status && headResult.status >= 200 && headResult.status < 400,
      httpStatus: headResult.status,
      error: !headResult.status || headResult.status < 200 || headResult.status >= 400
        ? `HTTP ${headResult.status}`
        : undefined,
    };
  }

  private async fetchStatus(url: string, method: 'HEAD' | 'GET'): Promise<{ status?: number; networkError?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.ICON_URL_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
      });
      return { status: response.status };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { networkError: message };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<R>,
  ): Promise<R[]> {
    if (items.length === 0) return [];
    const results = new Array<R>(items.length);
    let index = 0;

    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (true) {
        const currentIndex = index;
        index += 1;
        if (currentIndex >= items.length) break;
        results[currentIndex] = await worker(items[currentIndex]);
      }
    });

    await Promise.all(runners);
    return results;
  }
}
