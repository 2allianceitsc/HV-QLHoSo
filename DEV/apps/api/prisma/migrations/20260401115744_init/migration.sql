-- CreateTable
CREATE TABLE "UserLogin" (
    "id" TEXT NOT NULL,
    "Username" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "PasswordHash" TEXT NOT NULL,
    "IsFirstLogin" BOOLEAN NOT NULL DEFAULT true,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "LastLogin" TIMESTAMPTZ,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "UserLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Code" TEXT,
    "Address" TEXT,
    "Phone" TEXT,
    "LogoUrl" TEXT,
    "TaxCode" TEXT,
    "Website" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyContacts" (
    "id" TEXT NOT NULL,
    "CompanyId" TEXT NOT NULL,
    "ContactName" TEXT NOT NULL,
    "Phone" TEXT,
    "Email" TEXT,
    "Role" TEXT,
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "CompanyContacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "CompanyId" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Code" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "CompanyId" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Code" TEXT,
    "Address" TEXT,
    "Timezone" TEXT,
    "Country" TEXT,
    "City" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "CompanyId" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Code" TEXT,
    "Level" INTEGER,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "CompanyId" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Code" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "UserLoginId" TEXT,
    "EmployeeId" TEXT NOT NULL,
    "CompanyId" TEXT NOT NULL,
    "CompanyIdForReporting" TEXT,
    "DepartmentId" TEXT,
    "OfficeId" TEXT,
    "PositionId" TEXT,
    "TeamId" TEXT,
    "ManagerId" TEXT,
    "ClientId" TEXT,
    "FirstName" TEXT NOT NULL,
    "MiddleName" TEXT,
    "Surname" TEXT NOT NULL,
    "Email" TEXT,
    "CompanyEmailAddress" TEXT,
    "MobileNumber" TEXT,
    "DateOfBirth" DATE,
    "Gender" INTEGER,
    "TaxIdNumber" TEXT,
    "PhotoBusiness" TEXT,
    "IsManager" BOOLEAN NOT NULL DEFAULT false,
    "IsPm" BOOLEAN NOT NULL DEFAULT false,
    "ShiftStartTime" TEXT,
    "ShiftEndTime" TEXT,
    "LatestStartTime" TEXT,
    "LatestEndShiftTime" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "DisplayName" TEXT,
    "Description" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRole" (
    "id" TEXT NOT NULL,
    "StaffId" TEXT NOT NULL,
    "RoleId" TEXT NOT NULL,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessClient" (
    "id" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Code" TEXT,
    "Address" TEXT,
    "Phone" TEXT,
    "Email" TEXT,
    "Website" TEXT,
    "LogoUrl" TEXT,
    "Industry" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "BusinessClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContacts" (
    "id" TEXT NOT NULL,
    "ClientId" TEXT NOT NULL,
    "ContactName" TEXT NOT NULL,
    "Phone" TEXT,
    "Email" TEXT,
    "Role" TEXT,
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "ClientContacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientDepartment" (
    "id" TEXT NOT NULL,
    "ClientId" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Code" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "ClientDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProject" (
    "id" TEXT NOT NULL,
    "ClientId" TEXT NOT NULL,
    "DepartmentId" TEXT,
    "Name" TEXT NOT NULL,
    "Code" TEXT,
    "Description" TEXT,
    "StartDate" DATE,
    "EndDate" DATE,
    "Status" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "ClientProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientStaff" (
    "id" TEXT NOT NULL,
    "StaffId" TEXT NOT NULL,
    "ClientId" TEXT NOT NULL,
    "StartDate" DATE,
    "EndDate" DATE,
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "ClientStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusDefinition" (
    "id" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "DisplayName" TEXT,
    "ColorHex" TEXT,
    "IconId" TEXT,
    "CompanyId" TEXT,
    "OfficeId" TEXT,
    "ClientId" TEXT,
    "TeamId" TEXT,
    "IsLoginStatus" BOOLEAN NOT NULL DEFAULT false,
    "IsLogoutStatus" BOOLEAN NOT NULL DEFAULT false,
    "IsWorkingInStatus" BOOLEAN NOT NULL DEFAULT false,
    "IsWorkingOutStatus" BOOLEAN NOT NULL DEFAULT false,
    "IsBreak" BOOLEAN NOT NULL DEFAULT false,
    "IsAbsent" BOOLEAN NOT NULL DEFAULT false,
    "IsIdleStatus" BOOLEAN NOT NULL DEFAULT false,
    "IsNormalDayOff" BOOLEAN NOT NULL DEFAULT false,
    "IsHalfDayOff" BOOLEAN NOT NULL DEFAULT false,
    "IsPaid" BOOLEAN NOT NULL DEFAULT false,
    "MaxDurationSeconds" INTEGER,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "StatusDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeTracking" (
    "id" TEXT NOT NULL,
    "StaffId" TEXT NOT NULL,
    "StatusId" TEXT NOT NULL,
    "StartTime" TIMESTAMPTZ NOT NULL,
    "EndTime" TIMESTAMPTZ,
    "DurationSeconds" INTEGER,
    "ShiftStartTime" TEXT,
    "ShiftEndTime" TEXT,
    "MaxBreakSeconds" INTEGER,
    "Timezone" TEXT,
    "IpAddress" TEXT,
    "UserAgent" TEXT,
    "Notes" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "TimeTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VIBEIcons" (
    "id" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Category" TEXT,
    "IconUrl" TEXT,
    "EmojiCode" TEXT,
    "Description" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "VIBEIcons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodLog" (
    "id" TEXT NOT NULL,
    "StaffId" TEXT NOT NULL,
    "VibeIconId" TEXT NOT NULL,
    "LoggedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "MoodScore" INTEGER,
    "Comment" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "MoodLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaritalStatusConfig" (
    "id" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "DisplayName" TEXT,
    "Code" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "MaritalStatusConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLogin_Username_key" ON "UserLogin"("Username");

-- CreateIndex
CREATE UNIQUE INDEX "UserLogin_Email_key" ON "UserLogin"("Email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_Code_key" ON "Company"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_UserLoginId_key" ON "Staff"("UserLoginId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_EmployeeId_key" ON "Staff"("EmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_CompanyEmailAddress_key" ON "Staff"("CompanyEmailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Role_Name_key" ON "Role"("Name");

-- CreateIndex
CREATE UNIQUE INDEX "StaffRole_StaffId_RoleId_key" ON "StaffRole"("StaffId", "RoleId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessClient_Code_key" ON "BusinessClient"("Code");

-- CreateIndex
CREATE UNIQUE INDEX "ClientStaff_StaffId_ClientId_key" ON "ClientStaff"("StaffId", "ClientId");

-- CreateIndex
CREATE UNIQUE INDEX "MaritalStatusConfig_Code_key" ON "MaritalStatusConfig"("Code");

-- AddForeignKey
ALTER TABLE "CompanyContacts" ADD CONSTRAINT "CompanyContacts_CompanyId_fkey" FOREIGN KEY ("CompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_CompanyId_fkey" FOREIGN KEY ("CompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_CompanyId_fkey" FOREIGN KEY ("CompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_CompanyId_fkey" FOREIGN KEY ("CompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_CompanyId_fkey" FOREIGN KEY ("CompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_UserLoginId_fkey" FOREIGN KEY ("UserLoginId") REFERENCES "UserLogin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_CompanyId_fkey" FOREIGN KEY ("CompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_DepartmentId_fkey" FOREIGN KEY ("DepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_OfficeId_fkey" FOREIGN KEY ("OfficeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_PositionId_fkey" FOREIGN KEY ("PositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_TeamId_fkey" FOREIGN KEY ("TeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_ManagerId_fkey" FOREIGN KEY ("ManagerId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_ClientId_fkey" FOREIGN KEY ("ClientId") REFERENCES "BusinessClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRole" ADD CONSTRAINT "StaffRole_StaffId_fkey" FOREIGN KEY ("StaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRole" ADD CONSTRAINT "StaffRole_RoleId_fkey" FOREIGN KEY ("RoleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContacts" ADD CONSTRAINT "ClientContacts_ClientId_fkey" FOREIGN KEY ("ClientId") REFERENCES "BusinessClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDepartment" ADD CONSTRAINT "ClientDepartment_ClientId_fkey" FOREIGN KEY ("ClientId") REFERENCES "BusinessClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_ClientId_fkey" FOREIGN KEY ("ClientId") REFERENCES "BusinessClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_DepartmentId_fkey" FOREIGN KEY ("DepartmentId") REFERENCES "ClientDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientStaff" ADD CONSTRAINT "ClientStaff_StaffId_fkey" FOREIGN KEY ("StaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientStaff" ADD CONSTRAINT "ClientStaff_ClientId_fkey" FOREIGN KEY ("ClientId") REFERENCES "BusinessClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusDefinition" ADD CONSTRAINT "StatusDefinition_CompanyId_fkey" FOREIGN KEY ("CompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusDefinition" ADD CONSTRAINT "StatusDefinition_OfficeId_fkey" FOREIGN KEY ("OfficeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusDefinition" ADD CONSTRAINT "StatusDefinition_ClientId_fkey" FOREIGN KEY ("ClientId") REFERENCES "BusinessClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusDefinition" ADD CONSTRAINT "StatusDefinition_TeamId_fkey" FOREIGN KEY ("TeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeTracking" ADD CONSTRAINT "TimeTracking_StaffId_fkey" FOREIGN KEY ("StaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeTracking" ADD CONSTRAINT "TimeTracking_StatusId_fkey" FOREIGN KEY ("StatusId") REFERENCES "StatusDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodLog" ADD CONSTRAINT "MoodLog_StaffId_fkey" FOREIGN KEY ("StaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodLog" ADD CONSTRAINT "MoodLog_VibeIconId_fkey" FOREIGN KEY ("VibeIconId") REFERENCES "VIBEIcons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
