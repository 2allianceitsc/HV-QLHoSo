-- WebhookMessageTemplate — nội dung tin nhắn cho webhook E001/E002 (BA §6.8)
-- Shared by all webhook channels (Google Chat + Custom). Email uses S16.

CREATE TABLE "WebhookMessageTemplate" (
  "EventId"       TEXT NOT NULL PRIMARY KEY,
  "Message"       TEXT NOT NULL,
  "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
  "Log_UpdatedBy" TEXT
);

-- Seed default templates for E001 and E002.
INSERT INTO "WebhookMessageTemplate" ("EventId", "Message", "Log_UpdatedAt", "Log_UpdatedBy") VALUES
  (
    'E001',
    E'Tờ trình {code} - "{title}" từ {submitter} đang chờ {recipient} thẩm định.\nLink: {link}',
    CURRENT_TIMESTAMP,
    'system'
  ),
  (
    'E002',
    E'Tờ trình {code} - "{title}" đã được thẩm định, đang chờ {recipient} phê duyệt.\nLink: {link}',
    CURRENT_TIMESTAMP,
    'system'
  );
