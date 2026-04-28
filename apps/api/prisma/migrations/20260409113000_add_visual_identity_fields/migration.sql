-- AlterTable
ALTER TABLE "Company"
ADD COLUMN "ColorHex" TEXT,
ADD COLUMN "IconId" TEXT;

-- AlterTable
ALTER TABLE "Department"
ADD COLUMN "ColorHex" TEXT,
ADD COLUMN "IconId" TEXT;

-- AlterTable
ALTER TABLE "Office"
ADD COLUMN "ColorHex" TEXT,
ADD COLUMN "IconId" TEXT;

-- AlterTable
ALTER TABLE "Position"
ADD COLUMN "ColorHex" TEXT,
ADD COLUMN "IconId" TEXT;

-- AlterTable
ALTER TABLE "Team"
ADD COLUMN "ColorHex" TEXT,
ADD COLUMN "IconId" TEXT;

-- AlterTable
ALTER TABLE "Role"
ADD COLUMN "ColorHex" TEXT,
ADD COLUMN "IconId" TEXT;

-- AlterTable
ALTER TABLE "BusinessClient"
ADD COLUMN "IconId" TEXT;