-- NotificationChannel — kênh thông báo cho E001/E002 (BA §6.8)
-- One row per channel type. Defaults: email enabled, others disabled.

CREATE TABLE "NotificationChannel" (
  "Type"          TEXT NOT NULL PRIMARY KEY,
  "IsEnabled"     BOOLEAN NOT NULL DEFAULT FALSE,
  "WebhookUrl"    TEXT,
  "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
  "Log_UpdatedBy" TEXT
);

-- Seed three default channels.
INSERT INTO "NotificationChannel" ("Type", "IsEnabled", "WebhookUrl", "Log_UpdatedAt", "Log_UpdatedBy")
VALUES
  ('email',          TRUE,  NULL, CURRENT_TIMESTAMP, 'system'),
  ('google_chat',    FALSE, NULL, CURRENT_TIMESTAMP, 'system'),
  ('custom_webhook', FALSE, NULL, CURRENT_TIMESTAMP, 'system');
