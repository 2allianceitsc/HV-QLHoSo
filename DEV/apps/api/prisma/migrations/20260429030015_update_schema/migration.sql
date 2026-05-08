/*
  Warnings:

  - You are about to drop the column `ClientId` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `ClientId` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `ClientEndTime` on the `TimeTracking` table. All the data in the column will be lost.
  - You are about to drop the column `ClientStartTime` on the `TimeTracking` table. All the data in the column will be lost.
  - You are about to drop the `BusinessClient` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClientContacts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClientDepartment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClientProject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClientProjectStaff` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClientStaff` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StatusDefinition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `integrity_check_registry` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[Name]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ClientContacts" DROP CONSTRAINT "ClientContacts_ClientId_fkey";

-- DropForeignKey
ALTER TABLE "ClientDepartment" DROP CONSTRAINT "ClientDepartment_ClientId_fkey";

-- DropForeignKey
ALTER TABLE "ClientProject" DROP CONSTRAINT "ClientProject_ClientId_fkey";

-- DropForeignKey
ALTER TABLE "ClientProject" DROP CONSTRAINT "ClientProject_DepartmentId_fkey";

-- DropForeignKey
ALTER TABLE "ClientProjectStaff" DROP CONSTRAINT "ClientProjectStaff_ClientProjectId_fkey";

-- DropForeignKey
ALTER TABLE "ClientProjectStaff" DROP CONSTRAINT "ClientProjectStaff_StaffId_fkey";

-- DropForeignKey
ALTER TABLE "ClientStaff" DROP CONSTRAINT "ClientStaff_ClientDepartmentId_fkey";

-- DropForeignKey
ALTER TABLE "ClientStaff" DROP CONSTRAINT "ClientStaff_ClientId_fkey";

-- DropForeignKey
ALTER TABLE "ClientStaff" DROP CONSTRAINT "ClientStaff_StaffId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_TabId_fkey";

-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_ClientId_fkey";

-- DropForeignKey
ALTER TABLE "StatusDefinition" DROP CONSTRAINT "StatusDefinition_ClientId_fkey";

-- DropForeignKey
ALTER TABLE "StatusDefinition" DROP CONSTRAINT "StatusDefinition_CompanyId_fkey";

-- DropForeignKey
ALTER TABLE "StatusDefinition" DROP CONSTRAINT "StatusDefinition_OfficeId_fkey";

-- DropForeignKey
ALTER TABLE "StatusDefinition" DROP CONSTRAINT "StatusDefinition_TeamId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_ClientId_fkey";

-- DropForeignKey
ALTER TABLE "TimeTracking" DROP CONSTRAINT "TimeTracking_StatusId_fkey";

-- AlterTable
ALTER TABLE "CompanyManager" ALTER COLUMN "Log_UpdatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DepartmentManager" ALTER COLUMN "Log_UpdatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EmailProviderConfig" ALTER COLUMN "FromName" SET DEFAULT 'HVFlow';

-- AlterTable
ALTER TABLE "OfficeManager" ALTER COLUMN "Log_UpdatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Staff" DROP COLUMN "ClientId";

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "ClientId";

-- AlterTable
ALTER TABLE "TeamManager" ALTER COLUMN "Log_UpdatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TimeTracking" DROP COLUMN "ClientEndTime",
DROP COLUMN "ClientStartTime";

-- AlterTable
ALTER TABLE "UserLogin" ALTER COLUMN "Auth2FAMethod" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "BusinessClient";

-- DropTable
DROP TABLE "ClientContacts";

-- DropTable
DROP TABLE "ClientDepartment";

-- DropTable
DROP TABLE "ClientProject";

-- DropTable
DROP TABLE "ClientProjectStaff";

-- DropTable
DROP TABLE "ClientStaff";

-- DropTable
DROP TABLE "StatusDefinition";

-- DropTable
DROP TABLE "integrity_check_registry";

-- CreateIndex
CREATE UNIQUE INDEX "Role_Name_key" ON "Role"("Name");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_TabId_fkey" FOREIGN KEY ("TabId") REFERENCES "ScreenTab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginOtp" ADD CONSTRAINT "LoginOtp_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "UserLogin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
