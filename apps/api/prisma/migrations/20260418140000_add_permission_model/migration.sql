-- ============================================================================
-- Phase 1 — Screen & Tab-Level Permission Model (CR-008)
-- ============================================================================
-- Creates the four tables that power DB-driven RBAC: Screen, ScreenTab,
-- Permission, RolePermission.
--
-- Phase 1 goal: infrastructure + seed only. Nothing enforces these rows yet;
-- the existing @Roles(...) guard continues to govern access. Dual-check and
-- cutover happen in Phase 2/3.
--
-- See:
--   docs/architecture/permission-model.md
--   docs/architecture/permission-migration-plan.md § Phase 1
--   docs/architecture/permission-seed-catalog.md
-- ============================================================================

-- CreateTable: Screen -----------------------------------------------------------------
CREATE TABLE "Screen" (
    "id"             TEXT NOT NULL,
    "Code"           TEXT NOT NULL,
    "Name"           TEXT NOT NULL,
    "Route"          TEXT NOT NULL,
    "Area"           TEXT NOT NULL,
    "ParentScreenId" TEXT,
    "Description"    TEXT,

    "Note"          TEXT,
    "IsDeleted"     BOOLEAN     NOT NULL DEFAULT false,
    "IsDisabled"    BOOLEAN     NOT NULL DEFAULT false,
    "OrderNo"       INTEGER     NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "Screen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Screen_Code_key"        ON "Screen"("Code");
CREATE INDEX "Screen_Area_OrderNo_idx"       ON "Screen"("Area", "OrderNo");
CREATE INDEX "Screen_ParentScreenId_idx"     ON "Screen"("ParentScreenId");
CREATE INDEX "Screen_IsDeleted_IsDisabled_idx" ON "Screen"("IsDeleted", "IsDisabled");

ALTER TABLE "Screen"
    ADD CONSTRAINT "Screen_ParentScreenId_fkey"
    FOREIGN KEY ("ParentScreenId") REFERENCES "Screen"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateTable: ScreenTab --------------------------------------------------------------
CREATE TABLE "ScreenTab" (
    "id"          TEXT NOT NULL,
    "ScreenId"    TEXT NOT NULL,
    "Code"        TEXT NOT NULL,
    "Name"        TEXT NOT NULL,
    "Description" TEXT,

    "Note"          TEXT,
    "IsDeleted"     BOOLEAN     NOT NULL DEFAULT false,
    "IsDisabled"    BOOLEAN     NOT NULL DEFAULT false,
    "OrderNo"       INTEGER     NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "ScreenTab_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScreenTab_ScreenId_Code_key"     ON "ScreenTab"("ScreenId", "Code");
CREATE INDEX "ScreenTab_ScreenId_OrderNo_idx"         ON "ScreenTab"("ScreenId", "OrderNo");
CREATE INDEX "ScreenTab_IsDeleted_IsDisabled_idx"     ON "ScreenTab"("IsDeleted", "IsDisabled");

ALTER TABLE "ScreenTab"
    ADD CONSTRAINT "ScreenTab_ScreenId_fkey"
    FOREIGN KEY ("ScreenId") REFERENCES "Screen"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateTable: Permission -------------------------------------------------------------
CREATE TABLE "Permission" (
    "Code"        TEXT NOT NULL,
    "Name"        TEXT NOT NULL,
    "Description" TEXT,

    "OrderNo"       INTEGER     NOT NULL DEFAULT 0,
    "IsDisabled"    BOOLEAN     NOT NULL DEFAULT false,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("Code")
);


-- CreateTable: RolePermission ---------------------------------------------------------
CREATE TABLE "RolePermission" (
    "id"             TEXT    NOT NULL,
    "RoleId"         TEXT    NOT NULL,
    "ScreenId"       TEXT    NOT NULL,
    "TabId"          TEXT,
    "PermissionCode" TEXT    NOT NULL,
    "IsAllowed"      BOOLEAN NOT NULL,

    "Note"          TEXT,
    "IsDeleted"     BOOLEAN     NOT NULL DEFAULT false,
    "IsDisabled"    BOOLEAN     NOT NULL DEFAULT false,
    "OrderNo"       INTEGER     NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- Prisma-level compound unique. Does NOT fully enforce NULL TabId uniqueness
-- because Postgres UNIQUE treats each NULL as distinct. The partial unique
-- index below (RolePermission_role_screen_tab_perm_key_active) handles that.
CREATE UNIQUE INDEX "RolePermission_RoleId_ScreenId_TabId_PermissionCode_key"
    ON "RolePermission"("RoleId", "ScreenId", "TabId", "PermissionCode");

CREATE INDEX "RolePermission_RoleId_IsDeleted_idx" ON "RolePermission"("RoleId", "IsDeleted");
CREATE INDEX "RolePermission_ScreenId_TabId_idx"   ON "RolePermission"("ScreenId", "TabId");
CREATE INDEX "RolePermission_PermissionCode_idx"   ON "RolePermission"("PermissionCode");

-- Partial unique index that treats NULL TabId as a concrete value so that
-- at most one active (roleId, screenId, tabId=NULL, permissionCode) tuple exists.
-- Uses the nil UUID sentinel when TabId IS NULL.
CREATE UNIQUE INDEX "RolePermission_role_screen_tab_perm_key_active"
    ON "RolePermission" (
        "RoleId",
        "ScreenId",
        COALESCE("TabId", '00000000-0000-0000-0000-000000000000'),
        "PermissionCode"
    )
    WHERE "IsDeleted" = false;

-- Foreign keys -----------------------------------------------------------------------
ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_RoleId_fkey"
    FOREIGN KEY ("RoleId") REFERENCES "Role"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_ScreenId_fkey"
    FOREIGN KEY ("ScreenId") REFERENCES "Screen"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_TabId_fkey"
    FOREIGN KEY ("TabId") REFERENCES "ScreenTab"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_PermissionCode_fkey"
    FOREIGN KEY ("PermissionCode") REFERENCES "Permission"("Code")
    ON DELETE RESTRICT ON UPDATE CASCADE;
