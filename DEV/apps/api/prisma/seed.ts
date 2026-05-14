import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { uuidv7 } from 'uuidv7';
import { seedPermissions } from './seed/permissions';

// Generate a 20-byte random Base32 secret (for TOTP system key)
function generateBase32Secret(): string {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const raw = randomBytes(20);
  let result = '';
  let bits = 0, value = 0;
  for (const byte of raw) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { result += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) result += ALPHABET[(value << (5 - bits)) & 31];
  return result;
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Default Company
  const company = await prisma.company.upsert({
    where: { code: 'NTHV' },
    update: { name: 'Nhà Thuốc Hồng Vân' },
    create: {
      id: uuidv7(),
      name: 'Nhà Thuốc Hồng Vân',
      code: 'NTHV',
      logCreatedBy: 'seed',
    },
  });
  console.log(`Company: ${company.name}`);

  // 2. Default Roles
  const roleNames = [
    { name: 'EMPLOYEE', displayName: 'Employee', order: 1 },
    { name: 'MANAGER', displayName: 'Manager', order: 2 },
    { name: 'HR_ADMIN', displayName: 'HR Admin', order: 3 },
    { name: 'SUPER_ADMIN', displayName: 'Super Admin', order: 4 },
  ];

  const roles: Array<{ id: string; name: string }> = [];
  for (const roleData of roleNames) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: {
        id: uuidv7(),
        name: roleData.name,
        displayName: roleData.displayName,
        orderNo: roleData.order,
        logCreatedBy: 'seed',
      },
    });
    roles.push(role);
    console.log(`Role: ${role.name}`);
  }

  // 3. Marital Status Config
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
        id: uuidv7(),
        name: ms.name,
        displayName: ms.name,
        code: ms.code,
        orderNo: ms.order,
        logCreatedBy: 'seed',
      },
    });
    console.log(`Marital Status: ${ms.name}`);
  }

  // 5. Super Admin User
  const passwordHash = await bcrypt.hash('Admin@123!', 12);

  let superAdminLogin = await prisma.userLogin.findFirst({
    where: { username: 'superadmin', isDeleted: false },
  });
  if (!superAdminLogin) {
    superAdminLogin = await prisma.userLogin.create({
      data: {
        id: uuidv7(),
        username: 'superadmin',
        email: 'admin@hvflow.com',
        passwordHash,
        isFirstLogin: false,
        isActive: true,
        auth2FAEnabled: true,
        auth2FAMethod: 'TOTP',
        logCreatedBy: 'seed',
      },
    });
  } else {
    // Update existing superadmin to enable 2FA
    superAdminLogin = await prisma.userLogin.update({
      where: { id: superAdminLogin.id },
      data: { auth2FAEnabled: true, auth2FAMethod: 'TOTP' },
    });
  }
  console.log(`UserLogin: ${superAdminLogin.username}`);

  // Create Staff record for super admin
  const existingStaff = await prisma.staff.findFirst({
    where: { userLoginId: superAdminLogin.id, isDeleted: false },
  });

  let superAdminStaff = existingStaff;
  if (!superAdminStaff) {
    superAdminStaff = await prisma.staff.create({
      data: {
        id: uuidv7(),
        userLoginId: superAdminLogin.id,
        employeeId: 'SA001',
        companyId: company.id,
        firstName: 'Super',
        surname: 'Admin',
        companyEmailAddress: 'admin@hvflow.com',
        is2FAEnabled: true,
        logCreatedBy: 'seed',
      },
    });
    console.log(`Staff: ${superAdminStaff.firstName} ${superAdminStaff.surname}`);
  } else {
    // Update existing superadmin staff to enable 2FA
    superAdminStaff = await prisma.staff.update({
      where: { id: superAdminStaff.id },
      data: { is2FAEnabled: true, logUpdatedBy: 'seed' },
    });
  }

  // Assign SUPER_ADMIN role
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
          id: uuidv7(),
          staffId: superAdminStaff.id,
          roleId: superAdminRole.id,
          logCreatedBy: 'seed',
        },
      });
      console.log(`Assigned SUPER_ADMIN role to superadmin`);
    }
  }

  // Setup 2FA authenticators for superadmin
  const superadminAuthenticators = [
    { code: 'Google', name: 'Google OTP', isEnable: true },
    { code: 'Email', name: 'Email OTP', isEnable: false },
  ];

  for (const auth of superadminAuthenticators) {
    const existing = await prisma.staffAuthenticator.findFirst({
      where: { staffId: superAdminStaff.id, code: auth.code, isDeleted: false },
    });
    if (!existing) {
      await prisma.staffAuthenticator.create({
        data: {
          id: uuidv7(),
          staffId: superAdminStaff.id,
          code: auth.code,
          name: auth.name,
          isEnable: auth.isEnable,
          recipient: 'admin@hvflow.com',
          logCreatedBy: 'seed',
        },
      });
    } else {
      await prisma.staffAuthenticator.update({
        where: { id: existing.id },
        data: { isEnable: auth.isEnable, recipient: 'admin@hvflow.com', logUpdatedBy: 'seed' },
      });
    }
  }
  console.log(`2FA enabled for superadmin (Google TOTP method)`);

  // 6. ESC Team Staff
  const defaultPassword = await bcrypt.hash('Vibe@123!', 12);

  const staffList = [
    {
      username: 'autruonggiang',
      email: 'giang.autruong@allianceitsc.com',
      surname: 'Âu',
      middleName: 'Trường',
      firstName: 'Giang',
      employeeId: 'ESC002',
      portrait: '/uploads/portraits/au-truong-giang_m1774143772111_portrait.jfif',
      role: 'EMPLOYEE',
    },
    {
      username: 'buiminhdung',
      email: 'dung.buiminh@allianceitsc.com',
      surname: 'Bùi',
      middleName: 'Minh',
      firstName: 'Dũng',
      employeeId: 'ESC003',
      portrait: '/uploads/portraits/bui-minh-dung_m1773988449470_portrait.png',
      role: 'EMPLOYEE',
    },
    {
      username: 'caokhacbao',
      email: 'bao.caokhac@allianceitsc.com',
      surname: 'Cao',
      middleName: 'Khắc',
      firstName: 'Bảo',
      employeeId: 'ESC004',
      portrait: '/uploads/portraits/cao-khac-bao_m1774143791139_portrait.jpeg',
      role: 'EMPLOYEE',
    },
    {
      username: 'daocamthanh',
      email: 'thanh.daocam@allianceitsc.com',
      surname: 'Đào',
      middleName: 'Cẩm',
      firstName: 'Thanh',
      employeeId: 'ESC005',
      portrait: '/uploads/portraits/ao-cam-thanh_m1773990534888_portrait.png',
      role: 'EMPLOYEE',
    },
    {
      username: 'lenamthaison',
      email: 'son.lenamthai@allianceitsc.com',
      surname: 'Lê',
      middleName: 'Nam Thái',
      firstName: 'Sơn',
      employeeId: 'ESC006',
      portrait: '/uploads/portraits/le-nam-thai-son_m1773992682040_portrait.jpg',
      role: 'EMPLOYEE',
    },
    {
      username: 'lengocminh',
      email: 'minh.lengoc@allianceitsc.com',
      surname: 'Lê',
      middleName: 'Ngọc',
      firstName: 'Minh',
      employeeId: 'ESC007',
      portrait: '/uploads/portraits/le-ngoc-minh_m1773988796627_portrait.png',
      role: 'EMPLOYEE',
    },
    {
      username: 'lexuankhanh',
      email: 'khanh.lexuan@allianceitsc.com',
      surname: 'Lê',
      middleName: 'Xuân',
      firstName: 'Khanh',
      employeeId: 'ESC008',
      portrait: '/uploads/portraits/le-xuan-khanh_m1773988805491_portrait.jpg',
      role: 'EMPLOYEE',
    },
    {
      username: 'ngominhhung',
      email: 'hung.ngominh@allianceitsc.com',
      surname: 'Ngô',
      middleName: 'Minh',
      firstName: 'Hưng',
      employeeId: 'ESC009',
      portrait: '/uploads/portraits/ngo-minh-hung_m1773988237022_portrait.jpg',
      role: 'EMPLOYEE',
    },
    {
      username: 'nguyenthibichvan',
      email: 'van.nguyenthibich@allianceitsc.com',
      surname: 'Nguyễn',
      middleName: 'Thị Bích',
      firstName: 'Vân',
      employeeId: 'ESC010',
      portrait: '/uploads/portraits/nguyen-thi-bich-van_m1773990331486_portrait.jpg',
      role: 'EMPLOYEE',
    },
    {
      username: 'nguyenthingoctram',
      email: 'tram.nguyenngoc@allianceitsc.com',
      surname: 'Nguyễn',
      middleName: 'Thị Ngọc',
      firstName: 'Trâm',
      employeeId: 'ESC011',
      portrait: '/uploads/portraits/nguyen-thi-ngoc-tram_m1774100439830_portrait.jpeg',
      role: 'MANAGER',
    },
    {
      username: 'nguyentrongphuc',
      email: 'phuc.nguyentrong@allianceitsc.com',
      surname: 'Nguyễn',
      middleName: 'Trọng',
      firstName: 'Phúc',
      employeeId: 'ESC012',
      portrait: '/uploads/portraits/nguyen-trong-phuc_m1773988530197_portrait.jpg',
      role: 'EMPLOYEE',
    },
    {
      username: 'phanhoangdung',
      email: 'dung.phanhoang@allianceitsc.com',
      surname: 'Phan',
      middleName: 'Hoàng',
      firstName: 'Dung',
      employeeId: 'ESC013',
      portrait: '/uploads/portraits/phan-hoang-dung_m1773996602030_portrait.jpg',
      role: 'EMPLOYEE',
    },
    {
      username: 'tongnguyenhoangtrung',
      email: 'trung.tongnguyenhoang@allianceitsc.com',
      surname: 'Tống Nguyễn',
      middleName: 'Hoàng',
      firstName: 'Trung',
      employeeId: 'ESC014',
      portrait: '/uploads/portraits/tong-nguyen-hoang-trung_m1773988594637_portrait.jpg',
      role: 'EMPLOYEE',
    },
    {
      username: 'tranthihongnhung',
      email: 'nhung.tranthihong@allianceitsc.com',
      surname: 'Trần',
      middleName: 'Thị Hồng',
      firstName: 'Nhung',
      employeeId: 'ESC015',
      portrait: '/uploads/portraits/tran-thi-hong-nhung_m1773988504870_portrait.jfif',
      role: 'EMPLOYEE',
    },
    {
      username: 'tranvanthanh',
      email: 'thanh.tranvan@allianceitsc.com',
      surname: 'Trần',
      middleName: 'Văn',
      firstName: 'Thanh',
      employeeId: 'ESC016',
      portrait: '/uploads/portraits/tran-van-thanh_m1773991903001_portrait.jpeg',
      role: 'EMPLOYEE',
    },
    {
      username: 'truonglehung',
      email: 'htruong@allianceitsc.com',
      surname: 'Trương',
      middleName: 'Lê',
      firstName: 'Hưng',
      employeeId: 'ESC017',
      portrait: '/uploads/portraits/truong-le-hung_m1774143655055_portrait.png',
      role: 'MANAGER',
      isManager: true,
    },
    {
      username: 'truonglekhanh',
      email: 'khanhtl@allianceitsc.com',
      surname: 'Trương',
      middleName: 'Lê',
      firstName: 'Khánh',
      employeeId: 'ESC018',
      portrait: '/uploads/portraits/truong-le-khanh_m1773994187701_portrait.png',
      role: 'HR_ADMIN',
    },
    {
      username: 'vothanhphong',
      email: 'phong.vothanh@allianceitsc.com',
      surname: 'Võ',
      middleName: 'Thanh',
      firstName: 'Phong',
      employeeId: 'ESC019',
      portrait: '/uploads/portraits/vo-thanh-phong_m1774442623142_portrait.png',
      role: 'EMPLOYEE',
    },
  ];

  for (const s of staffList) {
    let userLogin = await prisma.userLogin.findFirst({
      where: { username: s.username, isDeleted: false },
    });
    if (!userLogin) {
      userLogin = await prisma.userLogin.create({
        data: {
          id: uuidv7(),
          username: s.username,
          email: s.email,
          passwordHash: defaultPassword,
          isFirstLogin: true,
          isActive: true,
          logCreatedBy: 'seed',
        },
      });
    } else {
      userLogin = await prisma.userLogin.update({ where: { id: userLogin.id }, data: { email: s.email } });
    }

    const existingMember = await prisma.staff.findFirst({
      where: { employeeId: s.employeeId, isDeleted: false },
    });

    let staffMember = existingMember;
    if (!staffMember) {
      staffMember = await prisma.staff.create({
        data: {
          id: uuidv7(),
          userLoginId: userLogin.id,
          employeeId: s.employeeId,
          companyId: company.id,
          firstName: s.firstName,
          middleName: s.middleName,
          surname: s.surname,
          companyEmailAddress: s.email,
          photoBusiness: s.portrait,
          logCreatedBy: 'seed',
        },
      });
    } else {
      await prisma.staff.update({
        where: { id: staffMember.id },
        data: { companyEmailAddress: s.email },
      });
    }

    const targetRole = roles.find((r) => r.name === s.role);
    if (targetRole) {
      const existingRole = await prisma.staffRole.findFirst({
        where: { staffId: staffMember.id, roleId: targetRole.id, isDeleted: false },
      });
      if (!existingRole) {
        await prisma.staffRole.create({
          data: {
            id: uuidv7(),
            staffId: staffMember.id,
            roleId: targetRole.id,
            logCreatedBy: 'seed',
          },
        });
      }
    }

    console.log(`Staff: ${s.firstName} ${s.surname} (${s.username})`);
  }

  // 7. 2FA Test Users
  console.log('\nSeeding 2FA test users...');

  const twoFaPassword = await bcrypt.hash('Vibe@123!', 12);

  // Known TOTP secret — tests derive codes via otplib generateSync({ secret })
  const KNOWN_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

  const twoFaUsers: Array<{
    username: string;
    email: string;
    firstName: string;
    surname: string;
    employeeId: string;
    auth2FAEnabled: boolean;
    auth2FAMethod: string | null;
    totpSecret?: string;
  }> = [
    {
      username: 'bruno-totp',
      email: 'bruno-totp@test.hvflow.dev',
      firstName: 'Bruno',
      surname: 'TOTP',
      employeeId: 'TEST001',
      auth2FAEnabled: true,
      auth2FAMethod: 'TOTP',
      totpSecret: KNOWN_TOTP_SECRET,
    },
    {
      username: 'bruno-email-2fa',
      email: 'bruno-email-2fa@test.hvflow.dev',
      firstName: 'Bruno',
      surname: 'Email2FA',
      employeeId: 'TEST002',
      auth2FAEnabled: true,
      auth2FAMethod: 'EMAIL_OTP',
    },
    {
      username: 'pw-totp',
      email: 'pw-totp@test.hvflow.dev',
      firstName: 'Playwright',
      surname: 'TOTP',
      employeeId: 'TEST003',
      auth2FAEnabled: true,
      auth2FAMethod: 'TOTP',
      totpSecret: KNOWN_TOTP_SECRET,
    },
    {
      username: 'pw-email-2fa',
      email: 'pw-email-2fa@test.hvflow.dev',
      firstName: 'Playwright',
      surname: 'Email2FA',
      employeeId: 'TEST004',
      auth2FAEnabled: true,
      auth2FAMethod: 'EMAIL_OTP',
    },
    {
      username: 'emp-no-2fa',
      email: 'emp-no-2fa@test.hvflow.dev',
      firstName: 'Employee',
      surname: 'NoAuth2FA',
      employeeId: 'TEST005',
      auth2FAEnabled: false,
      auth2FAMethod: null,
    },
    {
      username: 'manager-no-2fa',
      email: 'manager-no-2fa@test.hvflow.dev',
      firstName: 'Manager',
      surname: 'NoAuth2FA',
      employeeId: 'TEST006',
      auth2FAEnabled: false,
      auth2FAMethod: null,
    },
  ];

  const employeeRole = roles.find((r) => r.name === 'EMPLOYEE');

  for (const u of twoFaUsers) {
    // findFirst + conditional create (username is not @unique in Prisma schema)
    let userLogin = await prisma.userLogin.findFirst({
      where: { username: u.username, isDeleted: false },
    });
    if (!userLogin) {
      userLogin = await prisma.userLogin.create({
        data: {
          id: uuidv7(),
          username: u.username,
          email: u.email,
          passwordHash: twoFaPassword,
          isFirstLogin: false,
          isActive: true,
          auth2FAEnabled: u.auth2FAEnabled,
          auth2FAMethod: u.auth2FAMethod,
          logCreatedBy: 'seed',
        },
      });
    } else {
      userLogin = await prisma.userLogin.update({
        where: { id: userLogin.id },
        data: { auth2FAEnabled: u.auth2FAEnabled, auth2FAMethod: u.auth2FAMethod },
      });
    }

    // Create Staff record if not exists
    const existingStaff = await prisma.staff.findFirst({
      where: { userLoginId: userLogin.id, isDeleted: false },
    });

    let staffRecord = existingStaff;
    if (!staffRecord) {
      try {
        staffRecord = await prisma.staff.create({
          data: {
            id: uuidv7(),
            userLoginId: userLogin.id,
            employeeId: u.employeeId,
            companyId: company.id,
            firstName: u.firstName,
            surname: u.surname,
            companyEmailAddress: u.email,
            is2FAEnabled: u.auth2FAEnabled,
            logCreatedBy: 'seed',
          },
        });
      } catch (createError: any) {
        // If duplicate employeeId, try to find and update existing
        if (createError.code === 'P2002' && createError.meta?.target?.includes('EmployeeId')) {
          const existingByEmployeeId = await prisma.staff.findFirst({
            where: { employeeId: u.employeeId, isDeleted: false },
          });
          if (existingByEmployeeId) {
            staffRecord = await prisma.staff.update({
              where: { id: existingByEmployeeId.id },
              data: { 
                userLoginId: userLogin.id,
                is2FAEnabled: u.auth2FAEnabled, 
                logUpdatedBy: 'seed' 
              },
            });
          }
        } else {
          throw createError;
        }
      }
    } else {
      // Update is2FAEnabled to match auth2FAEnabled
      staffRecord = await prisma.staff.update({
        where: { id: staffRecord.id },
        data: { is2FAEnabled: u.auth2FAEnabled, logUpdatedBy: 'seed' },
      });
    }

    if (!staffRecord) {
      console.log(`⚠️  Could not create or find staff record for ${u.username}`);
      continue;
    }

    // Seed StaffAuthenticator records (new model) for enabled 2FA users
    if (u.auth2FAEnabled) {
      // Determine which method is the default (enabled) one
      const googleEnabled = u.auth2FAMethod === 'TOTP';
      const emailEnabled  = u.auth2FAMethod === 'EMAIL_OTP';

      const authenticators = [
        { code: 'Google', name: 'Google OTP', isEnable: googleEnabled },
        { code: 'Email',  name: 'Email OTP',  isEnable: emailEnabled  },
      ];

      for (const auth of authenticators) {
        const existing = await prisma.staffAuthenticator.findFirst({
          where: { staffId: staffRecord.id, code: auth.code, isDeleted: false },
        });
        if (!existing) {
          await prisma.staffAuthenticator.create({
            data: {
              id: uuidv7(),
              staffId: staffRecord.id,
              code: auth.code,
              name: auth.name,
              isEnable: auth.isEnable,
              recipient: u.email,
              logCreatedBy: 'seed',
            },
          });
        } else {
          await prisma.staffAuthenticator.update({
            where: { id: existing.id },
            data: { isEnable: auth.isEnable, recipient: u.email, logUpdatedBy: 'seed' },
          });
        }
      }
    }

    // Assign role based on user type
    let roleToAssign = employeeRole;
    if (u.username.includes('manager')) {
      const managerRole = roles.find((r) => r.name === 'MANAGER');
      if (managerRole) roleToAssign = managerRole;
    }

    if (roleToAssign) {
      const existingStaffRole = await prisma.staffRole.findFirst({
        where: { staffId: staffRecord.id, roleId: roleToAssign.id, isDeleted: false },
      });
      if (!existingStaffRole) {
        await prisma.staffRole.create({
          data: {
            id: uuidv7(),
            staffId: staffRecord.id,
            roleId: roleToAssign.id,
            logCreatedBy: 'seed',
          },
        });
      }
    }

    const method = u.auth2FAEnabled
      ? u.auth2FAMethod === 'TOTP' ? 'Google (TOTP)' : 'Email OTP'
      : 'disabled';
    const roleStr = u.username.includes('manager') ? 'MANAGER' : 'EMPLOYEE';
    console.log(`2FA Test User: ${u.username} (${roleStr} · 2FA: ${method})`);
  }

  // 8. 2FA System Config (SystemSetting keys)
  console.log('\nSeeding 2FA system config...');

  // Generate a random Base32 secret for GGSecretKey (only if not set)
  const existing2FASecret = await prisma.systemSetting.findUnique({ where: { key: 'twofa.gg_secret_key' } });
  const ggSecretKey = existing2FASecret?.value || generateBase32Secret();

  const twoFaSettings = [
    { key: 'twofa.using_2fa',         value: 'false',    description: 'Enable 2FA system-wide. false = 2FA completely off.' },
    { key: 'twofa.force_to_enable',   value: 'false',    description: 'Force ALL users to setup 2FA (except WhiteList).' },
    { key: 'twofa.gg_secret_key',     value: ggSecretKey, description: 'System-level Base32 key. Per-user TOTP: HMAC-SHA1(key, Staff.Id).' },
    { key: 'twofa.gg_app_id',         value: 'HVFlow',  description: 'Issuer name shown in Authenticator app.' },
    { key: 'twofa.digits',            value: '6',        description: 'OTP digits (always 6 per TOTP standard).' },
    { key: 'twofa.pin_expiry_minutes',value: '5',        description: 'Email OTP expiry in minutes.' },
    { key: 'twofa.authenticators',    value: 'Google',   description: 'Default method for new 2FA setup: Google | Email.' },
    { key: 'twofa.whitelist',         value: JSON.stringify([{ AppName: 'HVFlow', Usernames: 'superadmin' }]), description: 'JSON array: [{"AppName":"HVFlow","Usernames":"user1;user2"}] — superadmin always whitelisted.' },
  ];

  for (const s of twoFaSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { description: s.description, category: 'security' },
      create: { key: s.key, value: s.value, description: s.description, category: 'security' },
    });
    console.log(`SystemSetting: ${s.key}`);
  }

  // 9. OTP_2FA Email Template (stored as SystemSetting key: email.template.otp_2fa)
  console.log('\nSeeding OTP_2FA email template...');

  const otp2faTemplateHtml = `<p>Hello,</p>
<p>Your one-time verification code is:</p>
<h2 style="letter-spacing:6px;font-family:monospace;font-size:32px;">{{OTP}}</h2>
<p>This code expires in <strong>{{PinExpiryInMin}} minutes</strong>.</p>
<p>If you did not request this, please ignore this email or contact your administrator.</p>`;

  await prisma.systemSetting.upsert({
    where: { key: 'email.template.otp_2fa' },
    update: { description: 'OTP_2FA template — {{OTP}}, {{PinExpiryInMin}}. Sent during 2FA Email verification.', category: 'email' },
    create: {
      key: 'email.template.otp_2fa',
      value: otp2faTemplateHtml,
      description: 'OTP_2FA template — {{OTP}}, {{PinExpiryInMin}}. Sent during 2FA Email verification.',
      category: 'email',
    },
  });
  console.log('SystemSetting: email.template.otp_2fa');

  // 10. Email Provider Config — placeholder row (no credentials)
  // The API key is entered by SUPER_ADMIN via System → Email Configs UI (SY14).
  // Credentials are stored only in the DB, never in env vars or source code.
  console.log('\nSeeding email provider config...');

  const sendgridConfigName = 'SendGrid (Production)';
  const existingEmailConfig = await prisma.emailProviderConfig.findFirst({
    where: { name: sendgridConfigName, isDeleted: false },
  });

  if (!existingEmailConfig) {
    await prisma.emailProviderConfig.create({
      data: {
        id: uuidv7(),
        name: sendgridConfigName,
        provider: 'sendgrid',
        config: JSON.stringify({ apiKey: '' }),   // enter real key via UI: System → Email Configs
        fromName: 'HVFlow',
        fromEmail: 'noreply@ezysc.com',
        isActive: false,                          // stays inactive until key is entered and verified
        logCreatedBy: 'seed',
      },
    });
    console.log(`EmailProviderConfig: ${sendgridConfigName} (placeholder — configure key via UI)`);
  } else {
    console.log(`EmailProviderConfig: ${sendgridConfigName} (already exists — skipped)`);
  }

  // Permission model catalog + default matrix (idempotent; preserves admin edits)
  await seedPermissions(prisma);

  // ─── HV Seed ───────────────────────────────────────────────────────────────
  await seedHvData(prisma, company.id, roles);

  console.log('\nSeeding completed successfully!');
  console.log('Super Admin credentials:');
  console.log('  Username: superadmin');
  console.log('  Password: Admin@123!');
  console.log('\nESC Team default password: Vibe@123! (isFirstLogin = true)');
  console.log('\nHV default password: HV@123! (isFirstLogin = true)');
}

async function seedHvData(
  prisma: PrismaClient,
  companyId: string,
  roles: Array<{ id: string; name: string }>,
) {
  console.log('\n─── Seeding HV data ───');

  // 1. Departments
  const deptNames = ['IT', 'Kế toán', 'Marketing', 'Mua hàng', 'Hành chính', 'Ban lãnh đạo'];
  const deptMap: Record<string, string> = {};

  for (const name of deptNames) {
    const existing = await prisma.department.findFirst({ where: { name, companyId, isDeleted: false } });
    if (existing) {
      deptMap[name] = existing.id;
    } else {
      const dept = await prisma.department.create({
        data: { id: uuidv7(), companyId, name, logCreatedBy: 'seed' },
      });
      deptMap[name] = dept.id;
    }
    console.log(`  Department: ${name}`);
  }

  // 2. HV Users (Appendix A)
  const hvPassword = await bcrypt.hash('HV@123!', 12);
  const hvRoleMapping: Record<string, string> = {
    reviewer: 'MANAGER',
    approver: 'HR_ADMIN',
    staff: 'EMPLOYEE',
  };

  const hvUsers = [
    { username: 'quynhdt267', fullName: 'Dương Thuý Quỳnh',  dept: 'Mua hàng',     position: 'Trưởng phòng',    hvRole: 'reviewer', employeeId: 'HV001' },
    { username: 'tanvt',      fullName: 'Trương Văn Tân',    dept: 'IT',            position: 'Trưởng phòng IT', hvRole: 'reviewer', employeeId: 'HV002' },
    { username: 'myadh',      fullName: 'Dương Hà My',       dept: 'Kế toán',       position: 'Kế toán trưởng',  hvRole: 'reviewer', employeeId: 'HV003' },
    { username: 'nhunght',    fullName: 'Trần Hồng Nhung',   dept: 'Marketing',     position: 'Quản lý MKT',     hvRole: 'approver', employeeId: 'HV004' },
    { username: 'hongdv',     fullName: 'Dương Văn Hồng',    dept: 'Ban lãnh đạo', position: 'Giám đốc',        hvRole: 'approver', employeeId: 'HV005' },
    { username: 'vanlth',     fullName: 'Lê Thị Hồng Vân',  dept: 'Ban lãnh đạo', position: 'Phó giám đốc',    hvRole: 'approver', employeeId: 'HV006' },
    { username: 'hungnt',     fullName: 'Nguyễn Thế Hùng',  dept: 'IT',            position: 'Nhân viên IT',    hvRole: 'staff',    employeeId: 'HV007' },
    { username: 'lienhm',     fullName: 'Hoàng Minh Liên',  dept: 'Kế toán',       position: 'Kế toán viên',    hvRole: 'staff',    employeeId: 'HV008' },
    { username: 'thanhpv',    fullName: 'Phạm Văn Thành',   dept: 'Marketing',     position: 'Nhân viên MKT',   hvRole: 'staff',    employeeId: 'HV009' },
  ];

  const hvStaffMap: Record<string, string> = {};

  for (const u of hvUsers) {
    const nameParts = u.fullName.split(' ');
    const firstName = nameParts[nameParts.length - 1];
    const surname = nameParts[0];
    const middleName = nameParts.slice(1, -1).join(' ') || undefined;

    let userLogin = await prisma.userLogin.findFirst({ where: { username: u.username, isDeleted: false } });
    if (!userLogin) {
      userLogin = await prisma.userLogin.create({
        data: {
          id: uuidv7(),
          username: u.username,
          email: `${u.username}@hv.com`,
          passwordHash: hvPassword,
          isFirstLogin: true,
          isActive: true,
          logCreatedBy: 'seed',
        },
      });
    }

    let staff = await prisma.staff.findFirst({ where: { employeeId: u.employeeId, isDeleted: false } });
    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          id: uuidv7(),
          userLoginId: userLogin.id,
          employeeId: u.employeeId,
          companyId,
          firstName,
          middleName,
          surname,
          companyEmailAddress: `${u.username}@hv.com`,
          departmentId: deptMap[u.dept],
          hvRoles: [u.hvRole],
          logCreatedBy: 'seed',
        },
      });
    } else {
      staff = await prisma.staff.update({
        where: { id: staff.id },
        data: { departmentId: deptMap[u.dept], hvRoles: [u.hvRole], logUpdatedBy: 'seed' },
      });
    }

    hvStaffMap[u.username] = staff.id;

    const legacyRoleName = hvRoleMapping[u.hvRole];
    const legacyRole = roles.find((r) => r.name === legacyRoleName);
    if (legacyRole) {
      const existingRole = await prisma.staffRole.findFirst({
        where: { staffId: staff.id, roleId: legacyRole.id, isDeleted: false },
      });
      if (!existingRole) {
        await prisma.staffRole.create({
          data: { id: uuidv7(), staffId: staff.id, roleId: legacyRole.id, logCreatedBy: 'seed' },
        });
      }
    }

    console.log(`  Staff: ${u.fullName} (${u.username} · ${u.hvRole})`);
  }

  // 3. CostCodes (Appendix B)
  const costCodes = [
    { code: 'IT0001', name: 'Tài sản cố định',      dept: 'IT' },
    { code: 'IT0002', name: 'CP Phần mềm',           dept: 'IT' },
    { code: 'IT0003', name: 'CP Sửa chữa thiết bị',  dept: 'IT' },
    { code: 'KT0001', name: 'Tài sản cố định',       dept: 'Kế toán' },
    { code: 'KT0002', name: 'CP Văn phòng phẩm',     dept: 'Kế toán' },
    { code: 'CB0005', name: 'CP Marketing',           dept: 'Marketing' },
    { code: 'DV0005', name: 'CP Dịch vụ MKT',        dept: 'Marketing' },
    { code: 'MH0001', name: 'CP Hàng hoá',           dept: 'Mua hàng' },
    { code: 'CL0001', name: 'CP Vận chuyển',         dept: 'IT' },
    { code: 'HC0001', name: 'CP Hành chính',          dept: 'Hành chính' },
  ];

  for (const cc of costCodes) {
    const existing = await prisma.costCode.findFirst({ where: { code: cc.code, isDeleted: false } });
    if (!existing) {
      await prisma.costCode.create({
        data: {
          id: uuidv7(),
          code: cc.code,
          name: cc.name,
          departmentId: deptMap[cc.dept],
          logCreatedBy: 'seed',
        },
      });
    }
    console.log(`  CostCode: ${cc.code} — ${cc.name}`);
  }

  // 4. ApprovalConfig (§3.4 defaults)
  // IT: reviewer=tanvt, approver=hongdv
  // Kế toán: reviewer=myadh, approver=hongdv
  // Marketing: reviewer=myadh, approver=nhunght
  // Mua hàng: reviewer=quynhdt267, approver=vanlth
  // Hành chính: reviewer=myadh, approver=hongdv
  const approvalConfigs = [
    { dept: 'IT',         reviewerUsername: 'tanvt',      approverUsername: 'hongdv' },
    { dept: 'Kế toán',    reviewerUsername: 'myadh',      approverUsername: 'hongdv' },
    { dept: 'Marketing',  reviewerUsername: 'myadh',      approverUsername: 'nhunght' },
    { dept: 'Mua hàng',   reviewerUsername: 'quynhdt267', approverUsername: 'vanlth' },
    { dept: 'Hành chính', reviewerUsername: 'myadh',      approverUsername: 'hongdv' },
  ];

  for (const ac of approvalConfigs) {
    const existing = await prisma.approvalConfig.findUnique({ where: { departmentId: deptMap[ac.dept] } });
    if (!existing) {
      await prisma.approvalConfig.create({
        data: {
          id: uuidv7(),
          departmentId: deptMap[ac.dept],
          reviewerId: hvStaffMap[ac.reviewerUsername],
          approverId: hvStaffMap[ac.approverUsername],
          logUpdatedBy: 'seed',
        },
      });
    } else {
      await prisma.approvalConfig.update({
        where: { departmentId: deptMap[ac.dept] },
        data: {
          reviewerId: hvStaffMap[ac.reviewerUsername],
          approverId: hvStaffMap[ac.approverUsername],
          logUpdatedBy: 'seed',
        },
      });
    }
    console.log(`  ApprovalConfig: ${ac.dept} → reviewer=${ac.reviewerUsername}, approver=${ac.approverUsername}`);
  }

  // 5. SubmissionStatus catalog (fixed 5 records)
  const submissionStatuses = [
    { code: 'draft',          label: 'Bản nháp',        colorHex: '#94a3b8', orderNo: 1 },
    { code: 'pending_review', label: 'Chờ xét duyệt',   colorHex: '#f59e0b', orderNo: 2 },
    { code: 'in_review',      label: 'Đang xét duyệt',  colorHex: '#3b82f6', orderNo: 3 },
    { code: 'approved',       label: 'Đã phê duyệt',    colorHex: '#22c55e', orderNo: 4 },
    { code: 'rejected',       label: 'Từ chối',          colorHex: '#ef4444', orderNo: 5 },
  ];

  for (const s of submissionStatuses) {
    await prisma.submissionStatus.upsert({
      where: { code: s.code },
      update: { orderNo: s.orderNo },
      create: { code: s.code, label: s.label, colorHex: s.colorHex, orderNo: s.orderNo },
    });
    console.log(`  SubmissionStatus: ${s.code} — ${s.label}`);
  }

  console.log('─── HV seed complete ───');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
