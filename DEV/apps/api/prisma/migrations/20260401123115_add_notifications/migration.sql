-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "StaffId" TEXT NOT NULL,
    "Title" TEXT NOT NULL,
    "Body" TEXT NOT NULL,
    "Type" TEXT NOT NULL,
    "IsRead" BOOLEAN NOT NULL DEFAULT false,
    "ReadAt" TIMESTAMPTZ,
    "Link" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_StaffId_fkey" FOREIGN KEY ("StaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
