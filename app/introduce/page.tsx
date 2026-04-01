import AppLayout from '@/components/layout/AppLayout';
import {
  FileText, ShoppingCart, FileCheck2, Users, Shield, CheckCircle2,
  Clock, XCircle, Search, Moon, Building2, Activity, ArrowRight,
  Send, Eye, PenLine, BadgeCheck, ChevronRight, Banknote, CalendarRange,
  UserCheck, AlertCircle, Info,
} from 'lucide-react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '9', label: 'Tài khoản demo', icon: Users, color: 'var(--primary)', bg: 'var(--primary-muted)' },
  { value: '2', label: 'Loại tờ trình', icon: FileText, color: 'var(--success)', bg: 'var(--success-muted)' },
  { value: '5', label: 'Bộ phận', icon: Building2, color: 'var(--warning)', bg: 'var(--warning-muted)' },
];

const DOC_TYPES = [
  {
    code: 'MS',
    title: 'Tờ trình Mua sắm',
    subtitle: 'Procurement Request',
    icon: ShoppingCart,
    color: 'var(--primary)',
    bg: 'var(--primary-muted)',
    border: '#bfdbfe',
    description: 'Dùng khi bộ phận cần mua sắm thiết bị, phần mềm hoặc vật tư. Tờ trình liệt kê chi tiết từng khoản chi phí kèm nhà cung cấp.',
    fields: ['Mã phí & tên khoản mục', 'Số tiền (VNĐ)', 'Nhà cung cấp', 'Tổng chi phí tự động'],
    example: 'VD: Mua máy tính xách tay cho phòng IT — 3 dòng chi phí: Laptop 40tr + Màn hình 8tr + Chuột/bàn phím 2tr = 50.000.000 VNĐ',
  },
  {
    code: 'NT',
    title: 'Tờ trình Nguyên tắc',
    subtitle: 'Principle / Contract',
    icon: FileCheck2,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    description: 'Dùng khi cần ký kết hoặc gia hạn hợp đồng với nhà cung cấp dịch vụ. Theo dõi ngày hiệu lực và hết hạn hợp đồng.',
    fields: ['Tên nhà cung cấp / đối tác', 'Ngày bắt đầu hợp đồng', 'Ngày hết hạn hợp đồng', 'Cảnh báo hết hạn'],
    example: 'VD: Gia hạn hợp đồng phần mềm kế toán với Công ty Merap — hiệu lực 01/01/2026 đến 31/12/2026',
  },
];

const WORKFLOW_STEPS = [
  {
    status: 'nhap',
    label: 'Nháp',
    sublabel: 'Đang soạn thảo',
    icon: PenLine,
    color: 'var(--text-muted)',
    bg: 'var(--surface-2)',
    border: 'var(--border)',
    actor: 'Nhân viên',
    desc: 'Nhân viên tạo tờ trình, điền đầy đủ thông tin. Có thể lưu nháp và chỉnh sửa trước khi gửi.',
  },
  {
    status: 'cho_duyet',
    label: 'Chờ duyệt',
    sublabel: 'Đã gửi lên',
    icon: Clock,
    color: 'var(--warning)',
    bg: 'var(--warning-muted)',
    border: '#fde68a',
    actor: 'Người thẩm định',
    desc: 'Nhân viên bấm "Gửi tờ trình". Hệ thống tự động chuyển đến người thẩm định được phân quyền theo bộ phận.',
  },
  {
    status: 'tham_dinh',
    label: 'Thẩm định',
    sublabel: 'Đã xem xét',
    icon: UserCheck,
    color: 'var(--primary)',
    bg: 'var(--primary-muted)',
    border: '#bfdbfe',
    actor: 'Người phê duyệt',
    desc: 'Người thẩm định xem xét nội dung, có thể chấp thuận để chuyển lên hoặc từ chối với lý do cụ thể.',
  },
  {
    status: 'phe_duyet',
    label: 'Phê duyệt',
    sublabel: 'Hoàn tất',
    icon: BadgeCheck,
    color: 'var(--success)',
    bg: 'var(--success-muted)',
    border: '#a7f3d0',
    actor: 'Lưu trữ',
    desc: 'Ban lãnh đạo ra quyết định cuối. Tờ trình được phê duyệt hoặc từ chối. Mọi bước đều có dấu thời gian.',
  },
];

const ROLES = [
  {
    role: 'nhan_vien',
    title: 'Nhân viên',
    subtitle: 'Staff',
    icon: PenLine,
    color: 'var(--primary)',
    bg: 'var(--primary-muted)',
    permissions: [
      'Tạo tờ trình mới (MS hoặc NT)',
      'Lưu nháp và chỉnh sửa trước khi gửi',
      'Gửi tờ trình lên để duyệt',
      'Xem trạng thái tờ trình của mình',
      'Đính kèm tài liệu hỗ trợ',
    ],
    examples: ['Nguyễn Thế Hùng — IT', 'Hoàng Minh Liên — Kế toán', 'Phạm Văn Thành — Marketing'],
  },
  {
    role: 'tham_dinh',
    title: 'Người thẩm định',
    subtitle: 'Reviewer',
    icon: UserCheck,
    color: 'var(--warning)',
    bg: 'var(--warning-muted)',
    permissions: [
      'Xem tất cả tờ trình chờ thẩm định',
      'Thẩm định: chuyển lên người phê duyệt',
      'Từ chối: trả lại cho nhân viên',
      'Xem lịch sử phê duyệt',
      'Xem file đính kèm',
    ],
    examples: ['Dương Thuý Quỳnh — Mua hàng', 'Trương Văn Tân — IT', 'Dương Hà My — Kế toán'],
  },
  {
    role: 'phe_duyet',
    title: 'Người phê duyệt',
    subtitle: 'Approver',
    icon: BadgeCheck,
    color: 'var(--success)',
    bg: 'var(--success-muted)',
    permissions: [
      'Xem tờ trình đã qua thẩm định',
      'Phê duyệt cuối cùng: hoàn tất quy trình',
      'Từ chối: kết thúc quy trình với lý do',
      'Xem toàn bộ tờ trình hệ thống',
      'Quyết định ưu tiên cao nhất',
    ],
    examples: ['Trần Hồng Nhung — Marketing', 'Dương Văn Hồng — Giám đốc', 'Lê Thị Hồng Vân — PGĐ'],
  },
];

const DEPT_PERMISSIONS = [
  { dept: 'IT', reviewer: 'Trương Văn Tân', approver: 'Dương Văn Hồng (GĐ)' },
  { dept: 'Kế toán', reviewer: 'Dương Hà My', approver: 'Dương Văn Hồng (GĐ)' },
  { dept: 'Marketing', reviewer: 'Dương Hà My', approver: 'Trần Hồng Nhung' },
  { dept: 'Mua hàng', reviewer: 'Dương Thuý Quỳnh', approver: 'Lê Thị Hồng Vân (PGĐ)' },
  { dept: 'Hành chính', reviewer: 'Dương Hà My', approver: 'Dương Văn Hồng (GĐ)' },
];

const FEATURES = [
  { icon: Banknote, title: 'Quản lý chi phí', desc: 'Tờ trình MS liệt kê chi tiết từng khoản chi phí theo mã phí, nhà cung cấp. Tính tổng tự động.', color: 'var(--primary)', bg: 'var(--primary-muted)' },
  { icon: CalendarRange, title: 'Theo dõi hợp đồng', desc: 'Tờ trình NT lưu ngày bắt đầu, hết hạn hợp đồng — giúp theo dõi và gia hạn kịp thời.', color: '#7c3aed', bg: '#f5f3ff' },
  { icon: Activity, title: 'Tiến trình thực tế', desc: 'Mọi bước duyệt đều có dấu thời gian. Biết chính xác ai đã thẩm định/phê duyệt lúc mấy giờ.', color: 'var(--success)', bg: 'var(--success-muted)' },
  { icon: Search, title: 'Tìm kiếm nhanh', desc: 'Tìm kiếm theo mã tờ trình, tiêu đề hoặc nội dung. Lọc theo loại MS/NT ngay trên bảng danh sách.', color: 'var(--warning)', bg: 'var(--warning-muted)' },
  { icon: Shield, title: 'Phân quyền theo bộ phận', desc: 'Mỗi bộ phận có người thẩm định và người phê duyệt riêng. Hệ thống tự động định tuyến đúng người.', color: 'var(--danger)', bg: 'var(--danger-muted)' },
  { icon: Moon, title: 'Giao diện sáng / tối', desc: 'Hỗ trợ dark mode và light mode. Chuyển đổi ngay trong sidebar — không mất dữ liệu.', color: '#64748b', bg: '#f1f5f9' },
];

const HOW_TO_STEPS = [
  {
    step: 1,
    title: 'Đăng nhập hệ thống',
    desc: 'Chọn tài khoản từ danh sách demo (9 tài khoản có sẵn). Mỗi tài khoản đại diện một vai trò và bộ phận khác nhau.',
    tip: 'Demo: Chọn "Nguyễn Thế Hùng" (nhân viên IT) để trải nghiệm tạo tờ trình.',
    icon: Users,
  },
  {
    step: 2,
    title: 'Tạo tờ trình mới',
    desc: 'Vào menu "Tờ trình" → bấm "Tạo tờ trình". Chọn loại MS hoặc NT, điền thông tin bộ phận, tiêu đề và nội dung đề xuất.',
    tip: 'Hệ thống tự động gán người thẩm định và phê duyệt dựa theo bộ phận bạn chọn.',
    icon: PenLine,
  },
  {
    step: 3,
    title: 'Điền chi tiết & đính kèm',
    desc: 'Với MS: thêm từng dòng chi phí (mã phí, số tiền, nhà cung cấp). Với NT: điền thông tin hợp đồng và ngày hiệu lực.',
    tip: 'Có thể "Lưu nháp" để tiếp tục sau, hoặc "Gửi tờ trình" ngay khi đã sẵn sàng.',
    icon: FileText,
  },
  {
    step: 4,
    title: 'Duyệt tờ trình',
    desc: 'Đăng nhập bằng tài khoản thẩm định để thấy tờ trình đang chờ. Bấm "Thẩm định" hoặc "Từ chối" sau khi xem xét.',
    tip: 'Demo: Dùng tài khoản "Trương Văn Tân" để thẩm định tờ trình của bộ phận IT.',
    icon: UserCheck,
  },
  {
    step: 5,
    title: 'Phê duyệt cuối & kết quả',
    desc: 'Người phê duyệt (Ban lãnh đạo) xem xét tờ trình đã thẩm định và ra quyết định cuối. Trạng thái cập nhật ngay lập tức.',
    tip: 'Demo: Dùng tài khoản "Dương Văn Hồng" (Giám đốc) để phê duyệt lần cuối.',
    icon: BadgeCheck,
  },
];

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function SectionHeader({ label, title, subtitle }: { label: string; title: string; subtitle: string }) {
  return (
    <div className="text-center mb-10">
      <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
        {label}
      </span>
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <p className="text-sm max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
    </div>
  );
}

function Divider() {
  return <div className="h-px my-2" style={{ background: 'var(--border)' }} />;
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function IntroducePage() {
  return (
    <AppLayout>
      <div className="space-y-12 pb-12">

        {/* ── 1. HERO ── */}
        <section className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 60%, #4f46e5 100%)', boxShadow: 'var(--shadow-md)' }}>
          <div className="px-8 py-12 text-white">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                Tài liệu hệ thống
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-3 leading-tight">
              HV — Quy Trình Duyệt Hồ Sơ
            </h1>
            <p className="text-base mb-8 max-w-2xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Hệ thống quản lý và phê duyệt tờ trình nội bộ dành cho doanh nghiệp. Quy chuẩn hoá quy trình từ soạn thảo đến phê duyệt — minh bạch, có kiểm soát, lưu vết đầy đủ.
            </p>
            {/* Stats */}
            <div className="flex flex-wrap gap-4">
              {STATS.map(s => (
                <div key={s.label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <s.icon size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold leading-none text-white">{s.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. LOẠI TỜ TRÌNH ── */}
        <section>
          <SectionHeader
            label="Loại tờ trình"
            title="Hai loại tờ trình chính"
            subtitle="Hệ thống phân biệt rõ hai loại hồ sơ — mỗi loại có trường thông tin riêng phù hợp với từng mục đích sử dụng."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DOC_TYPES.map(doc => (
              <div key={doc.code} className="rounded-2xl p-6 flex flex-col gap-5" style={{ background: 'var(--surface)', border: `1.5px solid ${doc.border}`, boxShadow: 'var(--shadow-sm)' }}>
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: doc.bg }}>
                    <doc.icon size={22} style={{ color: doc.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md font-mono" style={{ background: doc.bg, color: doc.color }}>{doc.code}</span>
                    </div>
                    <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{doc.title}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{doc.subtitle}</p>
                  </div>
                </div>

                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{doc.description}</p>

                {/* Fields */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Thông tin cần điền</p>
                  <div className="space-y-1.5">
                    {doc.fields.map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <CheckCircle2 size={13} style={{ color: doc.color, flexShrink: 0 }} />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* Example */}
                <div className="rounded-xl p-3.5 text-sm leading-relaxed" style={{ background: doc.bg, color: doc.color }}>
                  <div className="flex items-start gap-2">
                    <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{doc.example}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. QUY TRÌNH DUYỆT ── */}
        <section className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <SectionHeader
            label="Quy trình"
            title="Luồng phê duyệt 4 bước"
            subtitle="Mỗi tờ trình đi qua 4 trạng thái rõ ràng. Hệ thống ghi lại người thực hiện và thời điểm của từng bước."
          />

          {/* Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line (desktop) */}
            <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5" style={{ background: 'var(--border)' }} />

            {WORKFLOW_STEPS.map((step, idx) => (
              <div key={step.status} className="flex flex-col items-center text-center gap-3 relative">
                {/* Step number */}
                <div className="text-xs font-bold mb-1 px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  Bước {idx + 1}
                </div>
                {/* Icon circle */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative z-10" style={{ background: step.bg, border: `2px solid ${step.border}`, boxShadow: 'var(--shadow-sm)' }}>
                  <step.icon size={24} style={{ color: step.color }} />
                </div>
                {/* Label */}
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{step.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{step.sublabel}</p>
                </div>
                {/* Actor badge */}
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: step.bg, color: step.color }}>
                  {step.actor}
                </span>
                {/* Description */}
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Reject note */}
          <div className="mt-8 rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--danger-muted)', border: '1px solid #fecaca' }}>
            <XCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--danger)' }}>Từ chối — có thể xảy ra ở bất kỳ bước nào</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Cả người thẩm định và người phê duyệt đều có thể từ chối tờ trình. Khi đó trạng thái chuyển sang "Từ chối" và nhân viên cần tạo lại hồ sơ mới nếu cần.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. PHÂN QUYỀN ── */}
        <section>
          <SectionHeader
            label="Phân quyền"
            title="Ba vai trò trong hệ thống"
            subtitle="Mỗi tài khoản được gán một vai trò xác định quyền hạn thao tác. Quyền duyệt được phân theo bộ phận."
          />

          {/* Role cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {ROLES.map(r => (
              <div key={r.role} className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: r.bg }}>
                    <r.icon size={20} style={{ color: r.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.subtitle}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {r.permissions.map(p => (
                    <div key={p} className="flex items-start gap-2">
                      <CheckCircle2 size={13} style={{ color: r.color, flexShrink: 0, marginTop: 2 }} />
                      <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p}</span>
                    </div>
                  ))}
                </div>

                <Divider />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Tài khoản demo</p>
                  <div className="space-y-1">
                    {r.examples.map(e => (
                      <div key={e} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{e}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dept permission table */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="px-5 py-4" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Phân quyền theo Bộ phận</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Hệ thống tự động định tuyến tờ trình đến đúng người theo bộ phận của nhân viên tạo</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  {['Bộ phận', 'Người thẩm định', 'Người phê duyệt'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ background: 'var(--surface)' }}>
                {DEPT_PERMISSIONS.map((d, idx) => (
                  <tr key={d.dept} style={{ borderBottom: idx < DEPT_PERMISSIONS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td className="px-5 py-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>{d.dept}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <UserCheck size={13} style={{ color: 'var(--warning)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{d.reviewer}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <BadgeCheck size={13} style={{ color: 'var(--success)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{d.approver}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 5. TÍNH NĂNG ── */}
        <section className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <SectionHeader
            label="Tính năng"
            title="Tính năng nổi bật"
            subtitle="Được thiết kế đơn giản, trực quan — nhân viên không cần đào tạo kỹ thuật vẫn sử dụng được ngay."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-xl p-5 flex gap-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: f.bg }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. HƯỚNG DẪN SỬ DỤNG ── */}
        <section>
          <SectionHeader
            label="Hướng dẫn"
            title="Cách sử dụng hệ thống"
            subtitle="Làm theo 5 bước dưới đây để trải nghiệm toàn bộ quy trình từ tạo tờ trình đến phê duyệt."
          />
          <div className="space-y-4">
            {HOW_TO_STEPS.map((s, idx) => (
              <div key={s.step} className="rounded-2xl p-5 flex gap-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                {/* Step number */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--primary)' }}>
                    {s.step}
                  </div>
                  {idx < HOW_TO_STEPS.length - 1 && (
                    <div className="w-0.5 flex-1 min-h-4" style={{ background: 'var(--border)' }} />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-3 mb-2">
                    <s.icon size={16} style={{ color: 'var(--primary)' }} />
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
                  <div className="flex items-start gap-2 rounded-lg px-3 py-2.5" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                    <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span className="text-xs">{s.tip}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
