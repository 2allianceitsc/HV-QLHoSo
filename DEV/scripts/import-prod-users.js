/**
 * Script: import-prod-users.js
 * 1. Xóa tất cả staff/userlogin trừ: tranthihongnhunga, truonglekhanh, superadmin
 * 2. Import danh sách nhân viên mới
 */

const { Client } = require('../node_modules/pg');
const bcrypt = require('../apps/api/node_modules/bcryptjs');
const { uuidv7 } = require('../apps/api/node_modules/uuidv7');

const PROD_URL = 'postgresql://postgres:umIxlhaFGSKkleIGqSGGbicfGsmdsGXC@switchback.proxy.rlwy.net:43733/railway';
const KEEP_USERNAMES = ['tranthihongnhunga', 'truonglekhanh', 'superadmin'];
const COMPANY_ID = '019e07b0-1a5a-7ae7-aa45-2ad68dd2bb39';
const EMPLOYEE_ROLE_ID = '019e07b0-1c52-78fa-88a0-f1bf42e7512a';
const DEFAULT_PASSWORD = 'HV@123!';
const CREATED_BY = 'import-script';

const NEW_EMPLOYEES = [
  { Staff: { EmployeeId: "A007", Surname: "Nguyễn", MiddleName: "Thế", FirstName: "Vinh", CompanyEmailAddress: "IThongvan60@gmail.com" }, UserLogin: { Username: "nguyenthevinh", Email: "IThongvan60@gmail.com" } },
  { Staff: { EmployeeId: "A284", Surname: "Dương", MiddleName: "Gia", FirstName: "Thụy", CompanyEmailAddress: "duongthuy2004.hongvan@gmail.com" }, UserLogin: { Username: "duonggiathuy", Email: "duongthuy2004.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A304", Surname: "Đặng", MiddleName: "Hoàng", FirstName: "Hà", CompanyEmailAddress: "dangha98.hongvan@gmail.com" }, UserLogin: { Username: "danghoangha", Email: "dangha98.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A274", Surname: "Trần", MiddleName: "Thị Diệu", FirstName: "Linh C", CompanyEmailAddress: "cskh.hongvan@gmail.com" }, UserLogin: { Username: "tranthidieulinhc", Email: "cskh.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A165", Surname: "Hoàng", MiddleName: "Thị", FirstName: "Nga B", CompanyEmailAddress: "" }, UserLogin: { Username: "hoangthingab", Email: "" } },
  { Staff: { EmployeeId: "A327", Surname: "Hoàng", MiddleName: "Thị", FirstName: "Thúy B", CompanyEmailAddress: "hanhchinhhongvan60@gmail.com" }, UserLogin: { Username: "hoangthithuyb", Email: "hanhchinhhongvan60@gmail.com" } },
  { Staff: { EmployeeId: "A197", Surname: "Dương", MiddleName: "Thị", FirstName: "Gấm", CompanyEmailAddress: "" }, UserLogin: { Username: "duongthigam", Email: "" } },
  { Staff: { EmployeeId: "A146", Surname: "Vương", MiddleName: "Văn", FirstName: "Hưng", CompanyEmailAddress: "kthanghoa.hongvan@gmail.com" }, UserLogin: { Username: "vuongvanhung", Email: "kthanghoa.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A333", Surname: "Vương", MiddleName: "Thị Quỳnh", FirstName: "Anh", CompanyEmailAddress: "ketoancongno01.hongvan@gmail.com" }, UserLogin: { Username: "vuongthiquynhanh", Email: "ketoancongno01.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A231", Surname: "Đỗ", MiddleName: "Thị", FirstName: "Mai", CompanyEmailAddress: "hoadon1.hongvan@gmail.com" }, UserLogin: { Username: "dothimai", Email: "hoadon1.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A255", Surname: "Nguyễn", MiddleName: "Thị", FirstName: "Mai", CompanyEmailAddress: "" }, UserLogin: { Username: "nguyenthimai", Email: "" } },
  { Staff: { EmployeeId: "A326", Surname: "Phạm", MiddleName: "Thị", FirstName: "Ngân", CompanyEmailAddress: "ketoantc.hongvan@gmail.com" }, UserLogin: { Username: "phamthingan", Email: "ketoantc.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A160", Surname: "Dương", MiddleName: "Hà", FirstName: "My", CompanyEmailAddress: "muahang.hongvan@gmail.com" }, UserLogin: { Username: "duonghamy", Email: "muahang.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A325", Surname: "Vũ", MiddleName: "Thị Ánh", FirstName: "Tuyết C", CompanyEmailAddress: "ketoanhongvan02@gmail.com" }, UserLogin: { Username: "vuthianhtuyetc", Email: "ketoanhongvan02@gmail.com" } },
  { Staff: { EmployeeId: "A137", Surname: "Đặng", MiddleName: "Thị Thanh", FirstName: "Nhàn A", CompanyEmailAddress: "thuquynthongvan@gmail.com" }, UserLogin: { Username: "dangthithanhnhana", Email: "thuquynthongvan@gmail.com" } },
  { Staff: { EmployeeId: "A288", Surname: "Trần", MiddleName: "Thị", FirstName: "Thảo E", CompanyEmailAddress: "marketing.hongvan93@gmail.com" }, UserLogin: { Username: "tranthithaoe", Email: "marketing.hongvan93@gmail.com" } },
  { Staff: { EmployeeId: "A164", Surname: "Nguyễn", MiddleName: "Hải", FirstName: "Yến", CompanyEmailAddress: "" }, UserLogin: { Username: "nguyenhaiyen", Email: "" } },
  { Staff: { EmployeeId: "A307", Surname: "Đỗ", MiddleName: "Thị", FirstName: "Phương F", CompanyEmailAddress: "dophuong99.hongvan@gmail.com" }, UserLogin: { Username: "dothiphuongf", Email: "dophuong99.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A317", Surname: "Nguyễn", MiddleName: "Thị", FirstName: "Nguyệt", CompanyEmailAddress: "hanhchinhhongvan02@gmail.com" }, UserLogin: { Username: "nguyenthinguyet", Email: "hanhchinhhongvan02@gmail.com" } },
  { Staff: { EmployeeId: "A008", Surname: "Nguyễn", MiddleName: "Thị", FirstName: "Thoa A", CompanyEmailAddress: "muahanghv@gmail.com" }, UserLogin: { Username: "nguyenthithoaa", Email: "muahanghv@gmail.com" } },
  { Staff: { EmployeeId: "A267", Surname: "Dương", MiddleName: "Thúy", FirstName: "Quỳnh", CompanyEmailAddress: "bpmuahang.hongvan@gmail.com" }, UserLogin: { Username: "duongthuyquynh", Email: "bpmuahang.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A013", Surname: "Mai", MiddleName: "Thị", FirstName: "Linh B", CompanyEmailAddress: "nhaplieunt@gmail.com" }, UserLogin: { Username: "maithilinhb", Email: "nhaplieunt@gmail.com" } },
  { Staff: { EmployeeId: "A006", Surname: "Nguyễn", MiddleName: "Thị", FirstName: "Thu", CompanyEmailAddress: "thunguyennthongvan60@gmail.com" }, UserLogin: { Username: "nguyenthithu", Email: "thunguyennthongvan60@gmail.com" } },
  { Staff: { EmployeeId: "A011", Surname: "Nguyễn", MiddleName: "Minh", FirstName: "Thư", CompanyEmailAddress: "ptkhotong.hongvan@gmail.com" }, UserLogin: { Username: "nguyenminhthu", Email: "ptkhotong.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A078", Surname: "Trương", MiddleName: "Văn", FirstName: "Tân", CompanyEmailAddress: "qlchuoi01.hongvan@gmail.com" }, UserLogin: { Username: "truongvantan", Email: "qlchuoi01.hongvan@gmail.com" } },
  { Staff: { EmployeeId: "A001", Surname: "Dương", MiddleName: "Văn", FirstName: "Hồng", CompanyEmailAddress: "hongvd.nhathuochongvan@gmail.com" }, UserLogin: { Username: "duongvanhong", Email: "hongvd.nhathuochongvan@gmail.com" } },
  { Staff: { EmployeeId: "A002", Surname: "Lê", MiddleName: "Thị Hồng", FirstName: "Vân", CompanyEmailAddress: "nhathuochongvan@gmail.com" }, UserLogin: { Username: "lethihongvan", Email: "nhathuochongvan@gmail.com" } },
  { Staff: { EmployeeId: "A003", Surname: "Trần", MiddleName: "Thị Hồng", FirstName: "Nhung", CompanyEmailAddress: "mvhn2200@gmail.com" }, UserLogin: { Username: "tranthihongnhung", Email: "mvhn2200@gmail.com" } },
];

async function run() {
  const client = new Client({ connectionString: PROD_URL });
  await client.connect();
  console.log('Connected to production DB');

  try {
    await client.query('BEGIN');

    // ---- STEP 1: Xác định UserLogin IDs cần xóa ----
    const keepResult = await client.query(
      `SELECT id FROM "UserLogin" WHERE "Username" = ANY($1)`,
      [KEEP_USERNAMES]
    );
    const keepIds = keepResult.rows.map(r => r.id);
    console.log(`\nKeep ${keepIds.length} UserLogin IDs`);

    const deleteResult = await client.query(
      `SELECT id FROM "UserLogin" WHERE id != ALL($1)`,
      [keepIds]
    );
    const deleteUserLoginIds = deleteResult.rows.map(r => r.id);
    console.log(`Delete ${deleteUserLoginIds.length} UserLogin records`);

    const deleteStaffResult = await client.query(
      `SELECT id FROM "Staff" WHERE "UserLoginId" != ALL($1)`,
      [keepIds]
    );
    const deleteStaffIds = deleteStaffResult.rows.map(r => r.id);
    console.log(`Delete ${deleteStaffIds.length} Staff records`);

    // ---- STEP 2: Xóa dữ liệu phụ thuộc ----

    // SubmissionLog
    const sl = await client.query('DELETE FROM "SubmissionLog"');
    console.log(`Deleted ${sl.rowCount} SubmissionLog`);

    // Submission
    const sub = await client.query('DELETE FROM "Submission"');
    console.log(`Deleted ${sub.rowCount} Submission`);

    // ApprovalConfig referencing deleted staff
    if (deleteStaffIds.length > 0) {
      const ac = await client.query(
        `DELETE FROM "ApprovalConfig" WHERE "ApproverId" = ANY($1) OR "ReviewerId" = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${ac.rowCount} ApprovalConfig`);

      const att = await client.query(
        `DELETE FROM "Attachment" WHERE "UploadedBy" = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${att.rowCount} Attachment`);

      const ml = await client.query(
        `DELETE FROM "MoodLog" WHERE "StaffId" = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${ml.rowCount} MoodLog`);

      const tt = await client.query(
        `DELETE FROM "TimeTracking" WHERE "StaffId" = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${tt.rowCount} TimeTracking`);

      const notif = await client.query(
        `DELETE FROM "Notification" WHERE "StaffId" = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${notif.rowCount} Notification`);

      const sa = await client.query(
        `DELETE FROM "StaffAuthenticator" WHERE "StaffId" = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${sa.rowCount} StaffAuthenticator`);

      const sr = await client.query(
        `DELETE FROM "StaffRole" WHERE "StaffId" = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${sr.rowCount} StaffRole`);

      const cm = await client.query(
        `DELETE FROM "CompanyManager" WHERE "StaffId" = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${cm.rowCount} CompanyManager`);

      const dm = await client.query(
        `DELETE FROM "DepartmentManager" WHERE "StaffId" = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${dm.rowCount} DepartmentManager`);

      const om = await client.query(
        `DELETE FROM "OfficeManager" WHERE "StaffId" = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${om.rowCount} OfficeManager`);

      const tm = await client.query(
        `DELETE FROM "TeamManager" WHERE "StaffId" = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${tm.rowCount} TeamManager`);

      // Delete Staff
      const stDel = await client.query(
        `DELETE FROM "Staff" WHERE id = ANY($1)`,
        [deleteStaffIds]
      );
      console.log(`Deleted ${stDel.rowCount} Staff`);
    }

    if (deleteUserLoginIds.length > 0) {
      const tfa = await client.query(
        `DELETE FROM "Auth2FASecret" WHERE "UserId" = ANY($1)`,
        [deleteUserLoginIds]
      );
      console.log(`Deleted ${tfa.rowCount} Auth2FASecret`);

      const otp = await client.query(
        `DELETE FROM "LoginOtp" WHERE "UserId" = ANY($1)`,
        [deleteUserLoginIds]
      );
      console.log(`Deleted ${otp.rowCount} LoginOtp`);

      const ulDel = await client.query(
        `DELETE FROM "UserLogin" WHERE id = ANY($1)`,
        [deleteUserLoginIds]
      );
      console.log(`Deleted ${ulDel.rowCount} UserLogin`);
    }

    // ---- STEP 3: Import nhân viên mới ----
    console.log('\nImporting new employees...');
    const now = new Date();
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    let imported = 0;
    for (const emp of NEW_EMPLOYEES) {
      const ulId = uuidv7();
      const staffId = uuidv7();
      const email = emp.UserLogin.Email || `${emp.UserLogin.Username}@noemail.placeholder`;
      const companyEmail = emp.Staff.CompanyEmailAddress || null;

      await client.query(
        `INSERT INTO "UserLogin" (id, "Username", "Email", "PasswordHash", "IsFirstLogin", "IsActive", "IsDeleted", "IsDisabled", "OrderNo", "Auth2FAEnabled", "Auth2FARequired", "Log_CreatedAt", "Log_CreatedBy", "Log_UpdatedAt", "Log_UpdatedBy")
         VALUES ($1, $2, $3, $4, true, true, false, false, 0, false, false, $5, $6, $5, $6)`,
        [ulId, emp.UserLogin.Username, email, passwordHash, now, CREATED_BY]
      );

      await client.query(
        `INSERT INTO "Staff" (id, "UserLoginId", "EmployeeId", "CompanyId", "FirstName", "MiddleName", "Surname", "CompanyEmailAddress", "IsDeleted", "IsDisabled", "OrderNo", "IsPm", "Log_CreatedAt", "Log_CreatedBy", "Log_UpdatedAt", "Log_UpdatedBy")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, false, 0, false, $9, $10, $9, $10)`,
        [staffId, ulId, emp.Staff.EmployeeId, COMPANY_ID, emp.Staff.FirstName, emp.Staff.MiddleName, emp.Staff.Surname, companyEmail, now, CREATED_BY]
      );

      await client.query(
        `INSERT INTO "StaffRole" (id, "StaffId", "RoleId", "Log_CreatedAt", "Log_CreatedBy", "Log_UpdatedAt", "Log_UpdatedBy")
         VALUES ($1, $2, $3, $4, $5, $4, $5)`,
        [uuidv7(), staffId, EMPLOYEE_ROLE_ID, now, CREATED_BY]
      );

      imported++;
      console.log(`  [${imported}/${NEW_EMPLOYEES.length}] ${emp.Staff.Surname} ${emp.Staff.FirstName} (${emp.UserLogin.Username})`);
    }

    await client.query('COMMIT');
    console.log(`\n✓ Done! Imported ${imported} employees. Default password: ${DEFAULT_PASSWORD} (IsFirstLogin=true)`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR — rolled back:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
