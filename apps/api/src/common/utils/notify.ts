import type { PrismaClient } from '@prisma/client';

/**
 * Send a plain-text alert to Google Chat via incoming webhook.
 * Webhook URL is resolved from SystemSetting key `notification.google_chat_webhook`.
 * Falls back to env GOOGLE_CHAT_WEBHOOK_URL (used during bootstrap before DB is available).
 * Fire-and-forget — never throws, so it won't mask the original error.
 */
export async function notifyGoogleChat(text: string, prisma?: PrismaClient): Promise<void> {
  let url: string | undefined;

  if (prisma) {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'notification.google_chat_webhook' },
      });
      url = setting?.value || undefined;
    } catch {
      // DB unavailable — fall through to env fallback
    }
  }

  if (!url) url = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch {
    // intentionally silent — notification failure must not block the app
  }
}
