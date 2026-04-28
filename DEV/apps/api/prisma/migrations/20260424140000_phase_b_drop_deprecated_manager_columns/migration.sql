-- Phase B: Drop deprecated manager columns from Staff and Team
-- Safe to run: TeamManager junction table was backfilled from Team.ManagerId in CR-015 (Phase A).
-- Staff.ManagerId (self-ref FK) and Staff.IsManager were replaced by *Manager junction tables.

-- Drop the self-referential FK from Staff (managerId → Staff.id)
ALTER TABLE "Staff" DROP CONSTRAINT IF EXISTS "Staff_ManagerId_fkey";

-- Drop the FK from Team.managerId → Staff.id
ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_ManagerId_fkey";

-- Drop the old index on Staff.ManagerId
DROP INDEX IF EXISTS "Staff_ManagerId_IsDeleted_idx";

-- Drop deprecated columns
ALTER TABLE "Staff" DROP COLUMN IF EXISTS "ManagerId";
ALTER TABLE "Staff" DROP COLUMN IF EXISTS "IsManager";
ALTER TABLE "Team" DROP COLUMN IF EXISTS "ManagerId";
