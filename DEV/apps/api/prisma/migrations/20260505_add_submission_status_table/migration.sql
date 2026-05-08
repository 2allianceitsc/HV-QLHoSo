-- CreateTable
CREATE TABLE "SubmissionStatus" (
    "Code" TEXT NOT NULL,
    "Label" TEXT NOT NULL,
    "ColorHex" TEXT NOT NULL,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "SubmissionStatus_pkey" PRIMARY KEY ("Code")
);
