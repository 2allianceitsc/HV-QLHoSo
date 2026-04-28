-- CreateTable
CREATE TABLE "SystemSetting" (
    "Key" TEXT NOT NULL,
    "Value" TEXT NOT NULL,
    "Description" TEXT,
    "Category" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("Key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "Action" TEXT NOT NULL,
    "Entity" TEXT NOT NULL,
    "EntityId" TEXT NOT NULL,
    "ActorId" TEXT,
    "ActorName" TEXT,
    "Changes" TEXT,
    "IpAddress" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
