-- Add ClientInfo column to ApiRequestLog for browser fingerprint data sent via X-Client-Info header

ALTER TABLE "ApiRequestLog" ADD COLUMN "ClientInfo" TEXT;
