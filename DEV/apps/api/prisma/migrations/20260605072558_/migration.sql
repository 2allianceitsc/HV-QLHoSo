-- DropForeignKey
ALTER TABLE "CostCodeApprovalRule" DROP CONSTRAINT "CostCodeApprovalRule_CostCodeId_fkey";

-- DropForeignKey
ALTER TABLE "CostCodeApprovalRuleDetail" DROP CONSTRAINT "CostCodeApprovalRuleDetail_ApproverId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_ApproverId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_CostCodeId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_ReviewerId_fkey";

-- DropForeignKey
ALTER TABLE "SubmissionApprovalStep" DROP CONSTRAINT "SubmissionApprovalStep_ApproverId_fkey";

-- DropForeignKey
ALTER TABLE "SubmissionApprovalStep" DROP CONSTRAINT "SubmissionApprovalStep_OriginalApproverId_fkey";

-- AlterTable
ALTER TABLE "CostCodeApprovalRuleDetail" ADD COLUMN     "DepartmentId" TEXT;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_CostCodeId_fkey" FOREIGN KEY ("CostCodeId") REFERENCES "CostCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_ReviewerId_fkey" FOREIGN KEY ("ReviewerId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_ApproverId_fkey" FOREIGN KEY ("ApproverId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCodeApprovalRule" ADD CONSTRAINT "CostCodeApprovalRule_CostCodeId_fkey" FOREIGN KEY ("CostCodeId") REFERENCES "CostCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCodeApprovalRuleDetail" ADD CONSTRAINT "CostCodeApprovalRuleDetail_ApproverId_fkey" FOREIGN KEY ("ApproverId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCodeApprovalRuleDetail" ADD CONSTRAINT "CostCodeApprovalRuleDetail_DepartmentId_fkey" FOREIGN KEY ("DepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionApprovalStep" ADD CONSTRAINT "SubmissionApprovalStep_ApproverId_fkey" FOREIGN KEY ("ApproverId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionApprovalStep" ADD CONSTRAINT "SubmissionApprovalStep_OriginalApproverId_fkey" FOREIGN KEY ("OriginalApproverId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
