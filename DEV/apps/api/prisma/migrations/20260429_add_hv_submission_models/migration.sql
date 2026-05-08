-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "HvRole" TEXT NOT NULL DEFAULT 'staff';

-- CreateTable
CREATE TABLE "CostCode" (
    "id" TEXT NOT NULL,
    "DepartmentId" TEXT NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "CostCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalConfig" (
    "id" TEXT NOT NULL,
    "DepartmentId" TEXT NOT NULL,
    "ReviewerId" TEXT NOT NULL,
    "ApproverId" TEXT NOT NULL,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "ApprovalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "Type" TEXT NOT NULL,
    "Code" TEXT NOT NULL,
    "SubmitterId" TEXT NOT NULL,
    "DepartmentId" TEXT NOT NULL,
    "SubmittedDate" DATE NOT NULL,
    "Title" TEXT NOT NULL,
    "Content" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'draft',
    "ReviewerId" TEXT NOT NULL,
    "ApproverId" TEXT NOT NULL,
    "ReviewedAt" TIMESTAMPTZ,
    "ApprovedAt" TIMESTAMPTZ,
    "RejectionReason" TEXT,
    "ContractStartDate" DATE,
    "ContractEndDate" DATE,
    "Supplier" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseLine" (
    "id" TEXT NOT NULL,
    "SubmissionId" TEXT NOT NULL,
    "CostCodeId" TEXT NOT NULL,
    "CostCodeName" TEXT NOT NULL,
    "AmountExVat" BIGINT NOT NULL,
    "AmountIncVat" BIGINT NOT NULL,
    "Supplier" TEXT NOT NULL,
    "PurchasedFor" TEXT,
    "Purpose" TEXT,
    "UsedBy" TEXT,
    "SortOrder" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ExpenseLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExistingInventory" (
    "id" TEXT NOT NULL,
    "SubmissionId" TEXT NOT NULL,
    "ItemName" TEXT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "Unit" TEXT NOT NULL,
    "SortOrder" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ExistingInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "SubmissionId" TEXT NOT NULL,
    "FileType" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Url" TEXT NOT NULL,
    "MimeType" TEXT NOT NULL,
    "SizeBytes" BIGINT NOT NULL,
    "UploadedBy" TEXT NOT NULL,
    "UploadedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionLog" (
    "id" TEXT NOT NULL,
    "SubmissionId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Action" TEXT NOT NULL,
    "FromStatus" TEXT,
    "ToStatus" TEXT,
    "Note" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CostCode_Code_key" ON "CostCode"("Code");

-- CreateIndex
CREATE INDEX "CostCode_DepartmentId_IsDeleted_idx" ON "CostCode"("DepartmentId", "IsDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalConfig_DepartmentId_key" ON "ApprovalConfig"("DepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_Code_key" ON "Submission"("Code");

-- CreateIndex
CREATE INDEX "Submission_DepartmentId_Status_IsDeleted_idx" ON "Submission"("DepartmentId", "Status", "IsDeleted");

-- CreateIndex
CREATE INDEX "Submission_SubmitterId_IsDeleted_idx" ON "Submission"("SubmitterId", "IsDeleted");

-- CreateIndex
CREATE INDEX "Submission_Status_IsDeleted_idx" ON "Submission"("Status", "IsDeleted");

-- CreateIndex
CREATE INDEX "ExpenseLine_SubmissionId_idx" ON "ExpenseLine"("SubmissionId");

-- CreateIndex
CREATE INDEX "ExistingInventory_SubmissionId_idx" ON "ExistingInventory"("SubmissionId");

-- CreateIndex
CREATE INDEX "Attachment_SubmissionId_idx" ON "Attachment"("SubmissionId");

-- CreateIndex
CREATE INDEX "SubmissionLog_SubmissionId_idx" ON "SubmissionLog"("SubmissionId");

-- AddForeignKey
ALTER TABLE "CostCode" ADD CONSTRAINT "CostCode_DepartmentId_fkey" FOREIGN KEY ("DepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalConfig" ADD CONSTRAINT "ApprovalConfig_DepartmentId_fkey" FOREIGN KEY ("DepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalConfig" ADD CONSTRAINT "ApprovalConfig_ReviewerId_fkey" FOREIGN KEY ("ReviewerId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalConfig" ADD CONSTRAINT "ApprovalConfig_ApproverId_fkey" FOREIGN KEY ("ApproverId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_SubmitterId_fkey" FOREIGN KEY ("SubmitterId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_DepartmentId_fkey" FOREIGN KEY ("DepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_ReviewerId_fkey" FOREIGN KEY ("ReviewerId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_ApproverId_fkey" FOREIGN KEY ("ApproverId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLine" ADD CONSTRAINT "ExpenseLine_SubmissionId_fkey" FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLine" ADD CONSTRAINT "ExpenseLine_CostCodeId_fkey" FOREIGN KEY ("CostCodeId") REFERENCES "CostCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExistingInventory" ADD CONSTRAINT "ExistingInventory_SubmissionId_fkey" FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_SubmissionId_fkey" FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_UploadedBy_fkey" FOREIGN KEY ("UploadedBy") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionLog" ADD CONSTRAINT "SubmissionLog_SubmissionId_fkey" FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionLog" ADD CONSTRAINT "SubmissionLog_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

