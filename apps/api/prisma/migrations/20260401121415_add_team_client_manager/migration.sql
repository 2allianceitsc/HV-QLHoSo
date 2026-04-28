-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "ClientId" TEXT,
ADD COLUMN     "ManagerId" TEXT;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ClientId_fkey" FOREIGN KEY ("ClientId") REFERENCES "BusinessClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ManagerId_fkey" FOREIGN KEY ("ManagerId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
