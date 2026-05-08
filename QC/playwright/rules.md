# Playwright — Rules & Conventions

> **Áp dụng cho:** Toàn bộ automation test trong dự án HV-QLHoSo  
> **Cập nhật:** 2026-05-01

---

## 1. CẤU TRÚC THƯ MỤC

```
QC/
├── playwright/
│   ├── rules.md              ← file này — quy tắc bắt buộc
│   └── scripts/              ← toàn bộ spec và helper
│       ├── auth/
│       │   ├── login.spec.ts
│       │   ├── first-login.spec.ts
│       │   ├── forgot-password.spec.ts
│       │   └── change-password.spec.ts
│       ├── submission/
│       │   ├── list.spec.ts
│       │   ├── create-ms.spec.ts
│       │   ├── create-nt.spec.ts
│       │   ├── edit.spec.ts
│       │   └── detail.spec.ts
│       ├── workflow/
│       │   ├── submit.spec.ts
│       │   ├── review.spec.ts
│       │   ├── approve.spec.ts
│       │   └── reject.spec.ts
│       ├── reports/
│       │   ├── summary.spec.ts
│       │   └── expenses.spec.ts
│       ├── admin/
│       │   ├── users.spec.ts
│       │   ├── departments.spec.ts
│       │   ├── cost-codes.spec.ts
│       │   └── approval-config.spec.ts
│       ├── permission/
│       │   └── access-control.spec.ts
│       ├── upload/
│       │   └── file-upload.spec.ts
│       └── _helpers/
│           ├── auth.helper.ts    ← login per role, lưu storageState
│           ├── data.helper.ts    ← seed/reset dữ liệu test
│           └── report.helper.ts  ← ghi kết quả ra QC/reports/
└── reports/
    └── playwright-result-[DDMMYYYYHHmm].md
```

**Quy tắc vị trí:**
- Tất cả file `*.spec.ts` phải nằm trong `QC/playwright/scripts/` hoặc subfolder của nó.
- Không đặt spec ngoài thư mục này.
- Helper không chứa test case — chỉ chứa utility function.

---

## 2. ĐẶT TÊN FILE VÀ TEST

### 2.1 Tên file spec

Format: `{feature}.spec.ts` — viết thường, dấu gạch ngang, không dấu.

```
login.spec.ts        ✅
Login.spec.ts        ❌
loginTest.spec.ts    ❌
```

### 2.2 Tên `test.describe`

Format: `[{NHÓM}] {Tên màn hình / chức năng}`

```ts
test.describe('[AUTH] Đăng nhập', () => { ... });
test.describe('[SUB] Tạo tờ trình MS', () => { ... });
test.describe('[WF] Luồng thẩm định', () => { ... });
test.describe('[RPT] Báo cáo tổng hợp', () => { ... });
test.describe('[ADM] Quản lý người dùng', () => { ... });
test.describe('[PERM] Kiểm tra phân quyền', () => { ... });
test.describe('[UP] Upload file', () => { ... });
```

### 2.3 Tên `test`

Format: `TC-{NHÓM}-{NNN}: {Mô tả ngắn tiếng Việt}`

```ts
test('TC-AUTH-001: Đăng nhập thành công với staff', async ({ page }) => { ... });
test('TC-WF-010: Reviewer thẩm định thành công', async ({ page }) => { ... });
```

Mã TC phải khớp với `QC/test-plan.md`.

---

## 3. CẤU HÌNH PLAYWRIGHT

### 3.1 `playwright.config.ts` đặt tại `DEV/playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: path.join(__dirname, '../QC/playwright/scripts'),
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['list'],
    ['json', { outputFile: '../QC/reports/_raw/last-run.json' }],
  ],
  globalSetup: path.join(__dirname, '../QC/playwright/scripts/_helpers/global-setup.ts'),
  use: {
    baseURL: process.env.TEST_BASE_URL ?? 'http://localhost:5418',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
      dependencies: ['setup'],
    },
  ],
});
```

### 3.2 Biến môi trường

Khai báo trong `DEV/.env.test` (không commit):

```env
TEST_BASE_URL=http://localhost:5418
TEST_ADMIN_PASSWORD=Test@1234
TEST_STAFF_PASSWORD=Test@1234
TEST_REVIEWER_PASSWORD=Test@1234
TEST_APPROVER_PASSWORD=Test@1234
```

Không hardcode password hoặc token trong spec file.

---

## 4. AUTH STATE — LƯU SESSION PER ROLE

### 4.1 Global Setup

File `_helpers/global-setup.ts` phải login với từng role và lưu `storageState`:

```ts
// _helpers/global-setup.ts
import { chromium } from '@playwright/test';

const ROLES = [
  { username: 'hungnt',  password: process.env.TEST_STAFF_PASSWORD!,    file: 'QC/.auth/staff.json' },
  { username: 'tanvt',   password: process.env.TEST_REVIEWER_PASSWORD!,  file: 'QC/.auth/reviewer.json' },
  { username: 'hongdv',  password: process.env.TEST_APPROVER_PASSWORD!,  file: 'QC/.auth/approver.json' },
  { username: 'admin',   password: process.env.TEST_ADMIN_PASSWORD!,     file: 'QC/.auth/admin.json' },
];

export default async function globalSetup() {
  const browser = await chromium.launch();
  for (const role of ROLES) {
    const page = await browser.newPage();
    await page.goto('/login');
    await page.fill('[name=username]', role.username);
    await page.fill('[name=password]', role.password);
    await page.click('button[type=submit]');
    await page.waitForURL('/submissions');
    await page.context().storageState({ path: role.file });
    await page.close();
  }
  await browser.close();
}
```

### 4.2 Dùng storageState trong spec

```ts
import { test } from '@playwright/test';

// Dùng session của staff
test.use({ storageState: 'QC/.auth/staff.json' });

// Hoặc khai báo trong describe block
test.describe('[WF] Reviewer thẩm định', () => {
  test.use({ storageState: 'QC/.auth/reviewer.json' });
  // ...
});
```

**Quy tắc:** Mỗi `describe` block phải khai báo rõ `storageState` nếu cần role khác default.

---

## 5. VIẾT SPEC

### 5.1 Cấu trúc bắt buộc mỗi test

```ts
test('TC-XXX-NNN: Mô tả', async ({ page }) => {
  // 1. ARRANGE — chuẩn bị điều kiện (navigate, seed data nếu cần)
  await page.goto('/submissions');

  // 2. ACT — thực hiện hành động
  await page.click('text=Tạo tờ trình');
  await page.fill('[name=title]', 'Mua máy tính');

  // 3. ASSERT — kiểm tra kết quả
  await expect(page.locator('[data-testid=toast]')).toContainText('đã được lưu nháp');
  await expect(page).toHaveURL(/\/submissions\/[a-z0-9-]+$/);
});
```

### 5.2 Selector ưu tiên

Thứ tự ưu tiên (cao → thấp):

1. `data-testid` attribute: `page.locator('[data-testid=submit-btn]')`
2. ARIA role: `page.getByRole('button', { name: 'Gửi tờ trình' })`
3. Label: `page.getByLabel('Tiêu đề')`
4. Placeholder: `page.getByPlaceholder('Nhập tiêu đề...')`
5. Text: `page.getByText('Đăng nhập')`

Tuyệt đối không dùng CSS class selector hoặc XPath có index (`nth-child`, `[1]`).

### 5.3 Chờ đợi (Waits)

```ts
// ✅ Đúng — dùng assertion để chờ
await expect(page.locator('[data-testid=submission-list]')).toBeVisible();

// ✅ Đúng — chờ navigation
await page.waitForURL('/submissions');

// ❌ Sai — hardcode sleep
await page.waitForTimeout(2000);
```

Chỉ dùng `waitForTimeout` khi không có cách khác và phải comment lý do.

### 5.4 Isolation — Mỗi test độc lập

- Mỗi test tự tạo dữ liệu cần thiết, không phụ thuộc vào kết quả test khác.
- Dùng `test.beforeEach` / `test.afterEach` để setup/teardown nếu cần.
- Không share state qua biến global giữa các `test()`.

### 5.5 Ghi chú lý do skip

```ts
test.skip('TC-RPT-013: Export Excel', async () => {
  // SKIP: F012 chưa implement — xem requirements.md §8
});
```

---

## 6. BÁO CÁO KẾT QUẢ

### 6.1 Tên file kết quả

```
QC/reports/playwright-result-[DDMMYYYYHHmm].md
```

Ví dụ: `playwright-result-01052026143022.md` (chạy lúc 14:30:22 ngày 01/05/2026)

### 6.2 Tạo file báo cáo

Sau mỗi lần chạy, `report.helper.ts` đọc output JSON của Playwright và ghi ra file markdown theo chuẩn §7 bên dưới.

**Cách chạy có tạo báo cáo:**

```bash
# Trong DEV/
pnpm exec playwright test --reporter=json
node ../QC/playwright/scripts/_helpers/report.helper.ts
```

Hoặc dùng script npm:

```json
// DEV/package.json
"scripts": {
  "test:e2e": "playwright test && node ../QC/playwright/scripts/_helpers/report.helper.ts",
  "test:e2e:auth": "playwright test --project=chromium scripts/auth/",
  "test:e2e:workflow": "playwright test --project=chromium scripts/workflow/"
}
```

### 6.3 Nội dung bắt buộc trong file báo cáo

Xem chi tiết cấu trúc tại **Section 7**.

---

## 7. CẤU TRÚC FILE KẾT QUẢ

File `QC/reports/playwright-result-[DDMMYYYYHHmm].md` phải chứa đầy đủ các phần sau:

---

### 7.1 Header

```markdown
# Playwright Test Result

| Thông tin       | Giá trị                            |
|-----------------|------------------------------------|
| Thời điểm chạy  | DD/MM/YYYY HH:mm:ss                |
| Môi trường      | http://localhost:5418              |
| Browser         | Chromium 130 / Firefox 131         |
| Tổng test case  | N                                  |
| ✅ Pass         | N                                  |
| ❌ Fail         | N                                  |
| ⏭ Skip         | N                                  |
| ⏱ Thời gian    | Xm Ys                              |
| Kết quả tổng   | PASS / FAIL                        |
```

---

### 7.2 Tóm Tắt Theo Nhóm

```markdown
## Tóm Tắt Theo Nhóm

| Nhóm        | Tổng | ✅ Pass | ❌ Fail | ⏭ Skip |
|-------------|------|---------|---------|---------|
| AUTH        | 8    | 7       | 1       | 0       |
| SUBMISSION  | 12   | 12      | 0       | 0       |
| WORKFLOW    | 8    | 8       | 0       | 0       |
| REPORTS     | 4    | 4       | 0       | 0       |
| ADMIN       | 6    | 5       | 0       | 1       |
| PERMISSION  | 10   | 10      | 0       | 0       |
| UPLOAD      | 5    | 5       | 0       | 0       |
| **TỔNG**    | **53**| **51** | **1**   | **1**   |
```

---

### 7.3 Chi Tiết Từng Test Case

**Mỗi test case đều phải ghi đầy đủ**, bất kể pass hay fail:

```markdown
## Chi Tiết Test Cases

---

### [AUTH] Đăng nhập

#### TC-AUTH-001: Đăng nhập thành công với staff
- **Trạng thái:** ✅ PASS
- **Thời gian:** 1.23s
- **Browser:** Chromium
- **Auth:** hungnt (staff)
- **Các bước thực hiện:**
  1. Mở trang `/login`
  2. Nhập username = `hungnt`
  3. Nhập password = `[REDACTED]`
  4. Bấm nút "Đăng nhập"
  5. Kiểm tra redirect sang `/submissions`
  6. Kiểm tra sidebar hiển thị "Nguyễn Thế Hùng"
  7. Kiểm tra không có menu Báo cáo / Admin
- **Kết quả thực tế:** Redirect sang `/submissions`, sidebar đúng tên, không thấy menu cấm.

---

#### TC-AUTH-002: Sai thông tin đăng nhập
- **Trạng thái:** ❌ FAIL
- **Thời gian:** 2.45s
- **Browser:** Chromium
- **Auth:** Không (public)
- **Các bước thực hiện:**
  1. Mở trang `/login`
  2. Nhập username = `hungnt`, password = `wrongpass`
  3. Bấm nút "Đăng nhập"
  4. Kiểm tra vẫn ở trang `/login`
  5. Kiểm tra thông báo lỗi "Thông tin đăng nhập không đúng"
- **Kết quả thực tế:** Bước 5 thất bại — thông báo lỗi hiển thị "Sai mật khẩu" (tiết lộ field sai, vi phạm E001)
- **Lỗi:** `expect(locator).toContainText("Thông tin đăng nhập không đúng")` — nhận được "Sai mật khẩu"
- **Screenshot:** `test-results/auth-login-TC-AUTH-002/screenshot.png`
- **Hành động cần thiết:** Fix backend — không phân biệt "sai username" vs "sai password"

---

#### TC-AUTH-010: isFirstLogin = true bắt buộc đổi mật khẩu
- **Trạng thái:** ⏭ SKIP
- **Lý do:** User test chưa có account với isFirstLogin=true trong test DB
- **TC tham chiếu:** test-plan.md#TC-AUTH-010

---
```

**Quy tắc mô tả các bước:**
- Liệt kê từng bước dưới dạng danh sách đánh số
- Bước nào là assertion phải ghi rõ `Kiểm tra...`
- Với test FAIL: ghi thêm "Kết quả thực tế" và "Lỗi" chi tiết
- Với test SKIP: ghi lý do và tham chiếu đến feature backlog nếu có
- Mật khẩu phải viết là `[REDACTED]`

---

### 7.4 Danh Sách Failures (nếu có)

```markdown
## Failures Cần Xử Lý

| TC ID        | Mô Tả                            | Lỗi Tóm Tắt                                   | File Log |
|--------------|----------------------------------|-----------------------------------------------|----------|
| TC-AUTH-002  | Sai thông tin đăng nhập          | Thông báo lỗi tiết lộ field nào sai           | screenshot.png |
| TC-WF-011    | Reviewer sai bộ phận             | Server trả 200 thay vì 403 (E007)             | trace.zip |
```

---

### 7.5 Môi Trường & Phiên Bản

```markdown
## Môi Trường

| Mục             | Giá Trị                           |
|-----------------|-----------------------------------|
| OS              | Windows 11 Pro                    |
| Node.js         | v22.x.x                           |
| Playwright      | 1.x.x                             |
| Chromium        | 130.x.x                           |
| Firefox         | 131.x.x                           |
| App version     | git commit hash (7 ký tự)         |
| DB              | Railway dev (switchback:16603)    |
| Test chạy bởi   | Nhung / CI                        |
```

---

## 8. QUY TẮC QUAN TRỌNG KHÁC

### 8.1 Không commit dữ liệu nhạy cảm

Thêm vào `.gitignore`:

```
QC/.auth/
QC/reports/_raw/
DEV/test-results/
```

File báo cáo `QC/reports/playwright-result-*.md` được commit bình thường (không chứa password).

### 8.2 Test DB phải tách biệt với Production DB

- Luôn dùng database dev (`switchback.proxy.rlwy.net:16603`) khi chạy test.
- Không bao giờ trỏ `TEST_BASE_URL` sang production.

### 8.3 Thứ tự chạy test

```bash
# Chạy toàn bộ (mặc định)
pnpm test:e2e

# Chạy theo nhóm
pnpm test:e2e:auth
pnpm test:e2e:workflow

# Chạy 1 file cụ thể
pnpm exec playwright test scripts/auth/login.spec.ts

# Chạy 1 TC cụ thể
pnpm exec playwright test --grep "TC-AUTH-001"

# Debug mode
pnpm exec playwright test --debug scripts/auth/login.spec.ts
```

### 8.4 Khi có test FAIL

1. Đọc screenshot / video / trace trong `DEV/test-results/`
2. Ghi rõ vào file báo cáo: lỗi thực tế, bước thất bại, screenshot path
3. Tạo issue hoặc note trong backlog trước khi fix
4. Sau khi fix, chạy lại và tạo báo cáo mới — không sửa file báo cáo cũ

### 8.5 Frequency

| Tình huống                     | Hành động                                          |
|--------------------------------|----------------------------------------------------|
| Merge PR vào `dev`             | Chạy P0 + P1, tạo báo cáo                         |
| Trước release                  | Chạy toàn bộ suite, tạo báo cáo, lưu vào `reports/` |
| Sau khi fix bug                | Chạy lại TC liên quan, tạo báo cáo mới            |
| Thêm tính năng mới             | Viết spec mới → chạy → tạo báo cáo                |
