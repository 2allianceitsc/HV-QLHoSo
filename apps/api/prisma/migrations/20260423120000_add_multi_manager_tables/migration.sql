-- CreateTable: CompanyManager
CREATE TABLE "CompanyManager" (
    "id" TEXT NOT NULL,
    "CompanyId" TEXT NOT NULL,
    "StaffId" TEXT NOT NULL,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "CompanyManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DepartmentManager
CREATE TABLE "DepartmentManager" (
    "id" TEXT NOT NULL,
    "DepartmentId" TEXT NOT NULL,
    "StaffId" TEXT NOT NULL,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "DepartmentManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OfficeManager
CREATE TABLE "OfficeManager" (
    "id" TEXT NOT NULL,
    "OfficeId" TEXT NOT NULL,
    "StaffId" TEXT NOT NULL,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "OfficeManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TeamManager
CREATE TABLE "TeamManager" (
    "id" TEXT NOT NULL,
    "TeamId" TEXT NOT NULL,
    "StaffId" TEXT NOT NULL,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "TeamManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyManager_CompanyId_IsDeleted_idx" ON "CompanyManager"("CompanyId", "IsDeleted");
CREATE INDEX "CompanyManager_StaffId_IsDeleted_idx" ON "CompanyManager"("StaffId", "IsDeleted");
CREATE UNIQUE INDEX "CompanyManager_CompanyId_StaffId_key" ON "CompanyManager"("CompanyId", "StaffId");

-- CreateIndex
CREATE INDEX "DepartmentManager_DepartmentId_IsDeleted_idx" ON "DepartmentManager"("DepartmentId", "IsDeleted");
CREATE INDEX "DepartmentManager_StaffId_IsDeleted_idx" ON "DepartmentManager"("StaffId", "IsDeleted");
CREATE UNIQUE INDEX "DepartmentManager_DepartmentId_StaffId_key" ON "DepartmentManager"("DepartmentId", "StaffId");

-- CreateIndex
CREATE INDEX "OfficeManager_OfficeId_IsDeleted_idx" ON "OfficeManager"("OfficeId", "IsDeleted");
CREATE INDEX "OfficeManager_StaffId_IsDeleted_idx" ON "OfficeManager"("StaffId", "IsDeleted");
CREATE UNIQUE INDEX "OfficeManager_OfficeId_StaffId_key" ON "OfficeManager"("OfficeId", "StaffId");

-- CreateIndex
CREATE INDEX "TeamManager_TeamId_IsDeleted_idx" ON "TeamManager"("TeamId", "IsDeleted");
CREATE INDEX "TeamManager_StaffId_IsDeleted_idx" ON "TeamManager"("StaffId", "IsDeleted");
CREATE UNIQUE INDEX "TeamManager_TeamId_StaffId_key" ON "TeamManager"("TeamId", "StaffId");

-- AddForeignKey
ALTER TABLE "CompanyManager" ADD CONSTRAINT "CompanyManager_CompanyId_fkey" FOREIGN KEY ("CompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyManager" ADD CONSTRAINT "CompanyManager_StaffId_fkey" FOREIGN KEY ("StaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentManager" ADD CONSTRAINT "DepartmentManager_DepartmentId_fkey" FOREIGN KEY ("DepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DepartmentManager" ADD CONSTRAINT "DepartmentManager_StaffId_fkey" FOREIGN KEY ("StaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeManager" ADD CONSTRAINT "OfficeManager_OfficeId_fkey" FOREIGN KEY ("OfficeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfficeManager" ADD CONSTRAINT "OfficeManager_StaffId_fkey" FOREIGN KEY ("StaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamManager" ADD CONSTRAINT "TeamManager_TeamId_fkey" FOREIGN KEY ("TeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamManager" ADD CONSTRAINT "TeamManager_StaffId_fkey" FOREIGN KEY ("StaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique indexes (soft-delete aware — active records only)
CREATE UNIQUE INDEX "CompanyManager_companyId_staffId_active_key"
  ON "CompanyManager"("CompanyId", "StaffId") WHERE "IsDeleted" = false;

CREATE UNIQUE INDEX "DepartmentManager_departmentId_staffId_active_key"
  ON "DepartmentManager"("DepartmentId", "StaffId") WHERE "IsDeleted" = false;

CREATE UNIQUE INDEX "OfficeManager_officeId_staffId_active_key"
  ON "OfficeManager"("OfficeId", "StaffId") WHERE "IsDeleted" = false;

CREATE UNIQUE INDEX "TeamManager_teamId_staffId_active_key"
  ON "TeamManager"("TeamId", "StaffId") WHERE "IsDeleted" = false;

-- Backfill TeamManager from Team.ManagerId (legacy single manager)
INSERT INTO "TeamManager" ("id", "TeamId", "StaffId", "IsDeleted", "Log_CreatedAt", "Log_UpdatedAt")
SELECT
  gen_random_uuid()::text,
  t."id",
  t."ManagerId",
  false,
  NOW(),
  NOW()
FROM "Team" t
WHERE t."ManagerId" IS NOT NULL
  AND t."IsDeleted" = false
  AND NOT EXISTS (
    SELECT 1 FROM "TeamManager" tm
    WHERE tm."TeamId" = t."id" AND tm."StaffId" = t."ManagerId" AND tm."IsDeleted" = false
  );
