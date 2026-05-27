-- HV approval-rules refactor (BA: approval-rules-by-cost-code.md)
-- - Adds Submission.CostCodeId (nullable for back-compat; NT may be NULL)
-- - Loosens Submission.ReviewerId/ApproverId to NULL (legacy 1-1 deprecated; replaced by SubmissionApprovalStep)
-- - New tables: CostCodeApprovalRule, CostCodeApprovalRuleDetail, SubmissionApprovalStep
-- - ApprovalConfig retained for 1 release per BA D9; not modified by this migration.

-- 1. Submission: add CostCodeId + relax legacy approver/reviewer
ALTER TABLE "Submission" ADD COLUMN "CostCodeId" TEXT;
ALTER TABLE "Submission" ALTER COLUMN "ReviewerId" DROP NOT NULL;
ALTER TABLE "Submission" ALTER COLUMN "ApproverId" DROP NOT NULL;

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_CostCodeId_fkey"
  FOREIGN KEY ("CostCodeId") REFERENCES "CostCode"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- 2. CostCodeApprovalRule (header)
CREATE TABLE "CostCodeApprovalRule" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "SubmissionType" TEXT NOT NULL,
  "CostCodeId"     TEXT,
  "Name"           TEXT,
  "IsActive"       BOOLEAN NOT NULL DEFAULT TRUE,
  "IsDeleted"      BOOLEAN NOT NULL DEFAULT FALSE,
  "Log_CreatedAt"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Log_CreatedBy"  TEXT,
  "Log_UpdatedAt"  TIMESTAMPTZ NOT NULL,
  "Log_UpdatedBy"  TEXT,
  CONSTRAINT "CostCodeApprovalRule_CostCodeId_fkey"
    FOREIGN KEY ("CostCodeId") REFERENCES "CostCode"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CostCodeApprovalRule_SubmissionType_CostCodeId_key"
  ON "CostCodeApprovalRule"("SubmissionType", "CostCodeId");

CREATE INDEX "CostCodeApprovalRule_SubmissionType_IsActive_IsDeleted_idx"
  ON "CostCodeApprovalRule"("SubmissionType", "IsActive", "IsDeleted");

-- 3. CostCodeApprovalRuleDetail
CREATE TABLE "CostCodeApprovalRuleDetail" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "RuleId"        TEXT NOT NULL,
  "StepOrder"     INTEGER NOT NULL,
  "StepType"      TEXT NOT NULL,
  "StepLabel"     TEXT,
  "MinAmount"     BIGINT,
  "MaxAmount"     BIGINT,
  "ApproverId"    TEXT NOT NULL,
  "Mode"          TEXT NOT NULL DEFAULT 'ANY',
  "IsDeleted"     BOOLEAN NOT NULL DEFAULT FALSE,
  "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Log_CreatedBy" TEXT,
  "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
  "Log_UpdatedBy" TEXT,
  CONSTRAINT "CostCodeApprovalRuleDetail_RuleId_fkey"
    FOREIGN KEY ("RuleId") REFERENCES "CostCodeApprovalRule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CostCodeApprovalRuleDetail_ApproverId_fkey"
    FOREIGN KEY ("ApproverId") REFERENCES "Staff"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE INDEX "CostCodeApprovalRuleDetail_RuleId_StepOrder_IsDeleted_idx"
  ON "CostCodeApprovalRuleDetail"("RuleId", "StepOrder", "IsDeleted");

-- 4. SubmissionApprovalStep
CREATE TABLE "SubmissionApprovalStep" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "SubmissionId"       TEXT NOT NULL,
  "StepOrder"          INTEGER NOT NULL,
  "StepType"           TEXT NOT NULL,
  "StepLabel"          TEXT,
  "ApproverId"         TEXT NOT NULL,
  "OriginalApproverId" TEXT NOT NULL,
  "Mode"               TEXT NOT NULL,
  "Status"             TEXT NOT NULL DEFAULT 'pending',
  "DecidedAt"          TIMESTAMPTZ,
  "DecidedBy"          TEXT,
  "Comment"            TEXT,
  "ReassignedAt"       TIMESTAMPTZ,
  "ReassignedBy"       TEXT,
  "ReassignReason"     TEXT,
  "Log_CreatedAt"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionApprovalStep_SubmissionId_fkey"
    FOREIGN KEY ("SubmissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SubmissionApprovalStep_ApproverId_fkey"
    FOREIGN KEY ("ApproverId") REFERENCES "Staff"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "SubmissionApprovalStep_OriginalApproverId_fkey"
    FOREIGN KEY ("OriginalApproverId") REFERENCES "Staff"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE INDEX "SubmissionApprovalStep_SubmissionId_StepOrder_idx"
  ON "SubmissionApprovalStep"("SubmissionId", "StepOrder");

CREATE INDEX "SubmissionApprovalStep_ApproverId_Status_idx"
  ON "SubmissionApprovalStep"("ApproverId", "Status");
