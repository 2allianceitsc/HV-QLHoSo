-- CreateTable: VIBEIconSet
CREATE TABLE "VIBEIconSet" (
    "VIBEIconSetID"  TEXT NOT NULL,
    "SetName"        TEXT NOT NULL,
    "Description"    TEXT,
    "IsActive"       BOOLEAN NOT NULL DEFAULT false,
    "Note"           TEXT,
    "IsDeleted"      BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled"     BOOLEAN NOT NULL DEFAULT false,
    "OrderNo"        INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy"  TEXT,
    "Log_UpdatedAt"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_UpdatedBy"  TEXT,

    CONSTRAINT "VIBEIconSet_pkey" PRIMARY KEY ("VIBEIconSetID")
);

-- AlterTable: VIBEIcons — add set FK and new display fields
ALTER TABLE "VIBEIcons"
    ADD COLUMN "VIBEIconSetID" TEXT,
    ADD COLUMN "HoverText"     TEXT,
    ADD COLUMN "IconText"      TEXT;

-- AddForeignKey
ALTER TABLE "VIBEIcons" ADD CONSTRAINT "VIBEIcons_VIBEIconSetID_fkey"
    FOREIGN KEY ("VIBEIconSetID") REFERENCES "VIBEIconSet"("VIBEIconSetID")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "VIBEIcons_VIBEIconSetID_IsDeleted_IsDisabled_idx"
    ON "VIBEIcons"("VIBEIconSetID", "IsDeleted", "IsDisabled");
