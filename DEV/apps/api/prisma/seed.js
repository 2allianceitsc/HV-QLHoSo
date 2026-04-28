"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const uuidv7_1 = require("uuidv7");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    const company = await prisma.company.upsert({
        where: { code: 'NTHV' },
        update: {},
        create: {
            id: (0, uuidv7_1.uuidv7)(),
            name: 'Nhà Thuốc Hồng Vân',
            code: 'NTHV',
            logCreatedBy: 'seed',
        },
    });
    console.log(`Company: ${company.name}`);
    const roleNames = [
        { name: 'EMPLOYEE', displayName: 'Employee', order: 1 },
        { name: 'MANAGER', displayName: 'Manager', order: 2 },
        { name: 'HR_ADMIN', displayName: 'HR Admin', order: 3 },
        { name: 'SUPER_ADMIN', displayName: 'Super Admin', order: 4 },
        { name: 'CLIENT', displayName: 'Client', order: 5 },
    ];
    const roles = [];
    for (const roleData of roleNames) {
        const role = await prisma.role.upsert({
            where: { name: roleData.name },
            update: {},
            create: {
                id: (0, uuidv7_1.uuidv7)(),
                name: roleData.name,
                displayName: roleData.displayName,
                orderNo: roleData.order,
                logCreatedBy: 'seed',
            },
        });
        roles.push(role);
        console.log(`Role: ${role.name}`);
    }
    const maritalStatuses = [
        { name: 'Single', code: 'SINGLE', order: 1 },
        { name: 'Married', code: 'MARRIED', order: 2 },
        { name: 'Divorced', code: 'DIVORCED', order: 3 },
        { name: 'Widowed', code: 'WIDOWED', order: 4 },
    ];
    for (const ms of maritalStatuses) {
        await prisma.maritalStatusConfig.upsert({
            where: { code: ms.code },
            update: {},
            create: {
                id: (0, uuidv7_1.uuidv7)(),
                name: ms.name,
                displayName: ms.name,
                code: ms.code,
                orderNo: ms.order,
                logCreatedBy: 'seed',
            },
        });
        console.log(`Marital Status: ${ms.name}`);
    }
    const statusDefs = [
        {
            name: 'Login',
            displayName: 'Login',
            colorHex: '#22C55E',
            isLoginStatus: true,
            isWorkingInStatus: true,
            order: 1,
        },
        {
            name: 'Working',
            displayName: 'Working',
            colorHex: '#3B82F6',
            isWorkingInStatus: true,
            order: 2,
        },
        {
            name: 'Coffee Break',
            displayName: 'Coffee Break',
            colorHex: '#F59E0B',
            isBreak: true,
            maxDurationSeconds: 15 * 60,
            order: 3,
        },
        {
            name: 'Lunch Break',
            displayName: 'Lunch Break',
            colorHex: '#8B5CF6',
            isBreak: true,
            maxDurationSeconds: 60 * 60,
            order: 4,
        },
        {
            name: 'Meeting',
            displayName: 'Meeting',
            colorHex: '#06B6D4',
            isWorkingInStatus: true,
            order: 5,
        },
        {
            name: 'Out of Office',
            displayName: 'Out of Office',
            colorHex: '#F97316',
            isWorkingOutStatus: true,
            order: 6,
        },
        {
            name: 'Logout',
            displayName: 'Logout',
            colorHex: '#6B7280',
            isLogoutStatus: true,
            isWorkingOutStatus: true,
            order: 7,
        },
    ];
    for (const sd of statusDefs) {
        const existing = await prisma.statusDefinition.findFirst({
            where: {
                name: sd.name,
                companyId: company.id,
                isDeleted: false,
            },
        });
        if (!existing) {
            await prisma.statusDefinition.create({
                data: {
                    id: (0, uuidv7_1.uuidv7)(),
                    name: sd.name,
                    displayName: sd.displayName,
                    colorHex: sd.colorHex,
                    companyId: company.id,
                    isLoginStatus: sd.isLoginStatus ?? false,
                    isLogoutStatus: sd.isLogoutStatus ?? false,
                    isWorkingInStatus: sd.isWorkingInStatus ?? false,
                    isWorkingOutStatus: sd.isWorkingOutStatus ?? false,
                    isBreak: sd.isBreak ?? false,
                    maxDurationSeconds: sd.maxDurationSeconds ?? null,
                    orderNo: sd.order,
                    logCreatedBy: 'seed',
                },
            });
            console.log(`Status: ${sd.name}`);
        }
    }
    const passwordHash = await bcrypt.hash('Admin@123!', 12);
    const superAdminLogin = await prisma.userLogin.upsert({
        where: { username: 'superadmin' },
        update: {},
        create: {
            id: (0, uuidv7_1.uuidv7)(),
            username: 'superadmin',
            email: 'admin@hvflow.com',
            passwordHash,
            isFirstLogin: false,
            isActive: true,
            logCreatedBy: 'seed',
        },
    });
    console.log(`UserLogin: ${superAdminLogin.username}`);
    const existingStaff = await prisma.staff.findFirst({
        where: { userLoginId: superAdminLogin.id, isDeleted: false },
    });
    let superAdminStaff = existingStaff;
    if (!superAdminStaff) {
        superAdminStaff = await prisma.staff.create({
            data: {
                id: (0, uuidv7_1.uuidv7)(),
                userLoginId: superAdminLogin.id,
                employeeId: 'SA001',
                companyId: company.id,
                firstName: 'Super',
                surname: 'Admin',
                companyEmailAddress: 'admin@hvflow.com',
                logCreatedBy: 'seed',
            },
        });
        console.log(`Staff: ${superAdminStaff.firstName} ${superAdminStaff.surname}`);
    }
    const superAdminRole = roles.find((r) => r.name === 'SUPER_ADMIN');
    if (superAdminRole) {
        const existingStaffRole = await prisma.staffRole.findFirst({
            where: {
                staffId: superAdminStaff.id,
                roleId: superAdminRole.id,
                isDeleted: false,
            },
        });
        if (!existingStaffRole) {
            await prisma.staffRole.create({
                data: {
                    id: (0, uuidv7_1.uuidv7)(),
                    staffId: superAdminStaff.id,
                    roleId: superAdminRole.id,
                    logCreatedBy: 'seed',
                },
            });
            console.log(`Assigned SUPER_ADMIN role to superadmin`);
        }
    }
    console.log('\nSeeding completed successfully!');
    console.log('Super Admin credentials:');
    console.log('  Username: superadmin');
    console.log('  Password: Admin@123!');
}
main()
    .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
})
    .finally(() => {
    void prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map