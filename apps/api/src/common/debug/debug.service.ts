import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { uuidv7 } from 'uuidv7';

/**
 * Global debug flag + in-memory debug log store.
 *
 * Priority (highest first):
 *   1. env var DEBUG_MODE=true (boot-time override)
 *   2. SystemSetting `system.debug_mode` = 'true' (runtime toggle via admin UI)
 *
 * When debug is enabled, every `log()` call is:
 *   - written to the NestJS Logger (console / Railway logs)
 *   - appended to an in-memory ring buffer (capped) so SUPER_ADMIN can
 *     review them from the UI without tailing server logs.
 *
 * Ring buffer is process-local; restart clears it. Good enough for live
 * diagnostic sessions ("turn on, reproduce, read").
 */

export interface DebugLogEntry {
  id: string;
  createdAt: string;
  context: string;
  message: string;
  data?: unknown;
}

const MAX_BUFFER = 500;

@Injectable()
export class DebugService {
  private readonly logger = new Logger('Debug');
  private cachedValue = false;
  private cacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 30_000;

  private buffer: DebugLogEntry[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async isEnabled(): Promise<boolean> {
    if (process.env.DEBUG_MODE === 'true') return true;
    if (Date.now() < this.cacheExpiresAt) return this.cachedValue;

    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'system.debug_mode' },
      });
      this.cachedValue = setting?.value === 'true';
    } catch {
      this.cachedValue = false;
    }
    this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;
    return this.cachedValue;
  }

  /** Log a debug message — no-op when debug mode is off. Never throws. */
  async log(context: string, message: string, data?: unknown): Promise<void> {
    try {
      if (!(await this.isEnabled())) return;
      const entry: DebugLogEntry = {
        id: uuidv7(),
        createdAt: new Date().toISOString(),
        context,
        message,
        data,
      };
      this.pushEntry(entry);
      const suffix = data !== undefined ? ` ${safeStringify(data)}` : '';
      this.logger.log(`[${context}] ${message}${suffix}`);
    } catch {
      // intentionally silent — debug logging must not affect the main flow
    }
  }

  /** Return the most recent entries (newest first), optionally filtered. */
  getRecent(opts: { limit?: number; offset?: number; context?: string } = {}): {
    entries: DebugLogEntry[];
    total: number;
    enabled: boolean;
  } {
    const { limit = 200, offset = 0, context } = opts;
    const filtered = context
      ? this.buffer.filter((e) => e.context.toLowerCase().includes(context.toLowerCase()))
      : this.buffer;
    const reversed = [...filtered].reverse();
    return {
      entries: reversed.slice(offset, offset + limit),
      total: filtered.length,
      enabled: process.env.DEBUG_MODE === 'true' || this.cachedValue,
    };
  }

  /** Clear all buffered entries. */
  clear(): void {
    this.buffer = [];
  }

  /** Force-invalidate cache. Call after admin toggles the setting. */
  invalidateCache(): void {
    this.cacheExpiresAt = 0;
    this.cachedValue = false;
  }

  private pushEntry(entry: DebugLogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER) {
      this.buffer.splice(0, this.buffer.length - MAX_BUFFER);
    }
  }
}

function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  } catch {
    return '[Unserializable]';
  }
}
