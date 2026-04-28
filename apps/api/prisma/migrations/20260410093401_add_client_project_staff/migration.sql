-- CreateTable
CREATE TABLE "ClientProjectStaff" (
    "id" TEXT NOT NULL,
    "ClientProjectId" TEXT NOT NULL,
    "StaffId" TEXT NOT NULL,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "ClientProjectStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientProjectStaff_ClientProjectId_IsDeleted_idx" ON "ClientProjectStaff"("ClientProjectId", "IsDeleted");

-- CreateIndex
CREATE INDEX "ClientProjectStaff_StaffId_IsDeleted_idx" ON "ClientProjectStaff"("StaffId", "IsDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProjectStaff_ClientProjectId_StaffId_key" ON "ClientProjectStaff"("ClientProjectId", "StaffId");

-- AddForeignKey
ALTER TABLE "ClientProjectStaff" ADD CONSTRAINT "ClientProjectStaff_ClientProjectId_fkey" FOREIGN KEY ("ClientProjectId") REFERENCES "ClientProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProjectStaff" ADD CONSTRAINT "ClientProjectStaff_StaffId_fkey" FOREIGN KEY ("StaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
