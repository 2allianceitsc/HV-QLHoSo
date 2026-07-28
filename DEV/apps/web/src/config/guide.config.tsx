/**
 * guide.config.tsx — Nội dung màn hình "Hướng dẫn sử dụng" (HV-QLHoSo)
 *
 * Nội dung được nhóm theo 3 nhóm vai trò nghiệp vụ:
 *   - staff             → Nhân viên (tạo, gửi tờ trình)
 *   - reviewer_approver → Thẩm định / Phê duyệt (xử lý tờ trình khi tới lượt)
 *   - admin             → Quản trị (người dùng, bộ phận, mã phí, trạng thái, phân quyền duyệt)
 *
 * Một user có thể có nhiều hvRoles cùng lúc — UserGuidePage suy ra danh sách
 * GuideRole cần hiển thị từ hvRoles thực tế, không giới hạn 1 nhóm.
 */

export type GuideRole = 'staff' | 'reviewer_approver' | 'admin';

export interface IGuideStep {
  heading: string;
  body: string;
  image?: string;
}

export interface IGuideSection {
  id: string;
  title: string;
  steps: IGuideStep[];
}

export const GUIDE_TAB_LABELS: Record<GuideRole, string> = {
  staff: 'Nhân viên',
  reviewer_approver: 'Thẩm định / Phê duyệt',
  admin: 'Quản trị',
};

export const GUIDE_SECTIONS: Record<GuideRole, IGuideSection[]> = {
  staff: [
    {
      id: 'staff-create',
      title: 'Tạo và gửi tờ trình',
      steps: [
        {
          heading: '1. Vào danh sách tờ trình',
          body: 'Chọn mục "Tờ trình" trên thanh menu bên trái. Đây là danh sách tất cả tờ trình bạn đã tạo, kèm trạng thái xử lý (Nháp, Chờ thẩm định, Đang duyệt, Đã duyệt, Từ chối).',
          image: 'staff-submission-list.png',
        },
        {
          heading: '2. Tạo tờ trình mới',
          body: 'Bấm nút "Tạo tờ trình" ở góc trên bên phải. Điền đầy đủ thông tin: bộ phận, các dòng chi phí (mã phí, số tiền), đính kèm file nếu cần.',
          image: 'staff-submission-create.png',
        },
        {
          heading: '3. Lưu nháp hoặc gửi ngay',
          body: 'Bấm "Lưu nháp" nếu muốn chỉnh sửa tiếp sau. Bấm "Gửi tờ trình" để đưa vào quy trình thẩm định/phê duyệt — từ lúc này bạn không thể tự ý sửa nếu đã có người xử lý bước đầu tiên.',
        },
        {
          heading: '4. Theo dõi trạng thái',
          body: 'Mở lại tờ trình bất kỳ lúc nào để xem đã tới bước thẩm định/phê duyệt nào, ai đang xử lý, và lịch sử duyệt/từ chối.',
          image: 'staff-submission-detail.png',
        },
        {
          heading: '5. Sửa hoặc tạo lại khi bị từ chối',
          body: 'Nếu tờ trình bị từ chối, bạn có thể chỉnh sửa và gửi lại (nếu còn ở trạng thái cho phép sửa), hoặc dùng nút "Tạo lại" trên một tờ trình cũ để tạo bản sao mới.',
        },
      ],
    },
  ],
  reviewer_approver: [
    {
      id: 'reviewer-process',
      title: 'Thẩm định / Phê duyệt tờ trình',
      steps: [
        {
          heading: '1. Nhận biết tờ trình cần xử lý',
          body: 'Trong danh sách "Tờ trình", các tờ trình đang chờ bạn xử lý được đánh dấu nhãn "Thẩm định" (màu vàng) hoặc "Phê duyệt" (màu xanh) — nghĩa là đã tới lượt bạn trong quy trình.',
          image: 'reviewer-submission-list.png',
        },
        {
          heading: '2. Mở chi tiết tờ trình',
          body: 'Bấm vào mã tờ trình để xem đầy đủ thông tin: bộ phận đề xuất, các dòng chi phí, file đính kèm, và lịch sử các bước duyệt trước đó.',
          image: 'reviewer-submission-detail.png',
        },
        {
          heading: '3. Duyệt hoặc từ chối',
          body: 'Sau khi kiểm tra, bấm "Duyệt" để chuyển tờ trình sang bước tiếp theo trong quy trình, hoặc "Từ chối" kèm lý do để trả lại cho người tạo chỉnh sửa.',
        },
        {
          heading: '4. Đổi người duyệt (nếu cần)',
          body: 'Nếu bạn không phải người phù hợp xử lý bước này (nghỉ phép, chuyển việc...), dùng chức năng "Đổi người duyệt" để chuyển bước xử lý sang người khác.',
        },
      ],
    },
  ],
  admin: [
    {
      id: 'admin-users',
      title: 'Quản trị người dùng',
      steps: [
        {
          heading: 'Thêm / sửa người dùng',
          body: 'Vào "Quản trị → Người dùng". Bấm "Thêm người dùng" để tạo tài khoản mới (mật khẩu mặc định: HV@123!), gán bộ phận và một hoặc nhiều vai trò (Nhân viên, Thẩm định, Phê duyệt, Quản trị).',
          image: 'admin-users.png',
        },
        {
          heading: 'Đặt lại mật khẩu / khóa tài khoản',
          body: 'Dùng nút reset mật khẩu hoặc bật/tắt trạng thái hoạt động của người dùng ngay trong bảng danh sách.',
        },
      ],
    },
    {
      id: 'admin-departments',
      title: 'Quản trị bộ phận',
      steps: [
        {
          heading: 'Thêm / sửa / ẩn bộ phận',
          body: 'Vào "Quản trị → Bộ phận" để quản lý danh sách bộ phận dùng khi tạo tờ trình và phân quyền duyệt theo bộ phận.',
          image: 'admin-departments.png',
        },
      ],
    },
    {
      id: 'admin-cost-codes',
      title: 'Quản trị mã phí',
      steps: [
        {
          heading: 'Thêm / sửa mã phí',
          body: 'Vào "Quản trị → Mã phí" để quản lý danh mục mã phí, gắn với bộ phận và bật/tắt trạng thái sử dụng.',
          image: 'admin-cost-codes.png',
        },
      ],
    },
    {
      id: 'admin-statuses',
      title: 'Quản trị trạng thái tờ trình',
      steps: [
        {
          heading: 'Tùy chỉnh nhãn và màu trạng thái',
          body: 'Vào "Quản trị → Trạng thái" để đổi tên hiển thị và màu sắc của các trạng thái tờ trình (một số trạng thái lõi của hệ thống không thể xóa).',
          image: 'admin-statuses.png',
        },
      ],
    },
    {
      id: 'admin-approval-rules',
      title: 'Phân quyền duyệt theo loại chi phí',
      steps: [
        {
          heading: 'Cấu hình quy trình thẩm định/phê duyệt',
          body: 'Vào "Quản trị → Phân quyền theo loại CP" để thiết lập ai thẩm định, ai phê duyệt cho từng mã phí/bộ phận, và thứ tự các bước trong quy trình.',
          image: 'admin-approval-rules.png',
        },
      ],
    },
  ],
};
