-- AlterTable
ALTER TABLE "VIBEIconSet" ALTER COLUMN "Log_UpdatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "AuditLog_CreatedAt_idx" ON "AuditLog"("CreatedAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_ActorId_CreatedAt_idx" ON "AuditLog"("ActorId", "CreatedAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_Entity_Action_CreatedAt_idx" ON "AuditLog"("Entity", "Action", "CreatedAt" DESC);

-- CreateIndex
CREATE INDEX "ClientStaff_StaffId_IsDeleted_idx" ON "ClientStaff"("StaffId", "IsDeleted");

-- CreateIndex
CREATE INDEX "ClientStaff_ClientId_IsDeleted_idx" ON "ClientStaff"("ClientId", "IsDeleted");

-- CreateIndex
CREATE INDEX "MoodLog_StaffId_LoggedAt_idx" ON "MoodLog"("StaffId", "LoggedAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_StaffId_IsDeleted_IsRead_idx" ON "Notification"("StaffId", "IsDeleted", "IsRead");

-- CreateIndex
CREATE INDEX "Staff_CompanyId_IsDeleted_idx" ON "Staff"("CompanyId", "IsDeleted");

-- CreateIndex
CREATE INDEX "Staff_ManagerId_IsDeleted_idx" ON "Staff"("ManagerId", "IsDeleted");

-- CreateIndex
CREATE INDEX "Staff_IsDeleted_IsDisabled_idx" ON "Staff"("IsDeleted", "IsDisabled");

-- CreateIndex
CREATE INDEX "StaffRole_StaffId_IsDeleted_idx" ON "StaffRole"("StaffId", "IsDeleted");

-- CreateIndex
CREATE INDEX "UserLogin_Username_IsDeleted_idx" ON "UserLogin"("Username", "IsDeleted");

-- CreateIndex
CREATE INDEX "UserLogin_Email_IsDeleted_idx" ON "UserLogin"("Email", "IsDeleted");
