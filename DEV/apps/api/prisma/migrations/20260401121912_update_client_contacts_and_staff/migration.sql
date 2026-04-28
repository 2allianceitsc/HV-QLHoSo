/*
  Warnings:

  - You are about to drop the column `ContactName` on the `ClientContacts` table. All the data in the column will be lost.
  - You are about to drop the column `Email` on the `ClientContacts` table. All the data in the column will be lost.
  - You are about to drop the column `IsPrimary` on the `ClientContacts` table. All the data in the column will be lost.
  - You are about to drop the column `Phone` on the `ClientContacts` table. All the data in the column will be lost.
  - You are about to drop the column `Role` on the `ClientContacts` table. All the data in the column will be lost.
  - Added the required column `FirstName` to the `ClientContacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Surname` to the `ClientContacts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BusinessClient" ADD COLUMN     "ColorHex" TEXT,
ADD COLUMN     "Country" TEXT,
ADD COLUMN     "DefaultEndTime" TEXT,
ADD COLUMN     "DefaultStartTime" TEXT,
ADD COLUMN     "Timezone" TEXT;

-- AlterTable
ALTER TABLE "ClientContacts" DROP COLUMN "ContactName",
DROP COLUMN "Email",
DROP COLUMN "IsPrimary",
DROP COLUMN "Phone",
DROP COLUMN "Role",
ADD COLUMN     "City" TEXT,
ADD COLUMN     "Country" TEXT,
ADD COLUMN     "EmailAddress" TEXT,
ADD COLUMN     "FirstName" TEXT NOT NULL,
ADD COLUMN     "LandlineAreaCode" TEXT,
ADD COLUMN     "LandlineCountryCode" TEXT,
ADD COLUMN     "LandlineNumber" TEXT,
ADD COLUMN     "MobileCountryCode" TEXT,
ADD COLUMN     "MobileNumber" TEXT,
ADD COLUMN     "PostcodeZipcode" TEXT,
ADD COLUMN     "State" TEXT,
ADD COLUMN     "StreetAddress" TEXT,
ADD COLUMN     "Suburb" TEXT,
ADD COLUMN     "Surname" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ClientStaff" ADD COLUMN     "ClientDepartmentId" TEXT;

-- AddForeignKey
ALTER TABLE "ClientStaff" ADD CONSTRAINT "ClientStaff_ClientDepartmentId_fkey" FOREIGN KEY ("ClientDepartmentId") REFERENCES "ClientDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
