-- CreateTable: DropdownDisplayConfig
-- S09: company-wide dropdown display settings (CR-003)
CREATE TABLE "DropdownDisplayConfig" (
    "id" TEXT NOT NULL,
    "CompanyId" TEXT NOT NULL,
    "EntityType" TEXT NOT NULL,
    "PrimaryField" TEXT NOT NULL,
    "SecondaryFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "DropdownDisplayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DropdownDisplayConfig_CompanyId_EntityType_key"
    ON "DropdownDisplayConfig"("CompanyId", "EntityType");

CREATE INDEX "DropdownDisplayConfig_CompanyId_idx"
    ON "DropdownDisplayConfig"("CompanyId");

-- AddForeignKey
ALTER TABLE "DropdownDisplayConfig"
    ADD CONSTRAINT "DropdownDisplayConfig_CompanyId_fkey"
    FOREIGN KEY ("CompanyId") REFERENCES "Company"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
