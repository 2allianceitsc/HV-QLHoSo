# HV-QLHoSo — Câu Hỏi Cần Làm Rõ

> **Người review:** Claude
> **Ngày tạo:** 2026-04-25
> **Nguồn:** Phân tích `BA/requirements.md v2.0.0`
> **Trạng thái:** Chờ PM / stakeholder xác nhận

Mỗi câu hỏi có nhãn độ ưu tiên:
- 🔴 **Blocking** — chưa rõ thì không implement được, ảnh hưởng thiết kế DB / API
- 🟡 **Important** — cần rõ trước khi code UI / nghiệp vụ liên quan
- 🟢 **Nice to have** — có thể quyết định sau, không block sprint đầu

---

## 1. PHÂN QUYỀN & VAI TRÒ

### Q01 🔴 — Người thẩm định / phê duyệt tự tạo tờ trình cho chính bộ phận mình thì ai duyệt?

**Vấn đề:** Trong mockup, `myadh` (Kế toán trưởng, role `tham_dinh`) đồng thời là người thẩm định cho bộ phận Kế toán, Marketing, và Hành chính. Nếu `myadh` tự tạo tờ trình cho phòng Kế toán, bản thân cô ấy sẽ được gán làm người thẩm định cho chính tờ trình của mình.

**Câu hỏi:** Hệ thống có cho phép tự duyệt không? Hay cần có cơ chế chặn và yêu cầu gán người thẩm định khác?

**Ảnh hưởng:** Logic gán `thamDinhId` khi tạo tờ trình, validation phía server.

---

### Q02 🔴 — Người phê duyệt tạo tờ trình thì ai phê duyệt?

**Vấn đề:** Người dùng role `phe_duyet` có thể tạo tờ trình (theo ma trận quyền §3.2). Nhưng người phê duyệt của bộ phận đó chính là họ.

**Câu hỏi:** Khi người phê duyệt tạo tờ trình → ai phê duyệt? Có cần leo thang lên cấp trên (Giám đốc → Hội đồng?) hay admin xử lý thủ công?

---

### Q03 🟡 — Người thẩm định/phê duyệt vắng mặt hoặc bị khóa tài khoản thì sao?

**Vấn đề:** Nếu người được phân công thẩm định đi công tác / nghỉ phép / bị `isActive=false`, các tờ trình đang `cho_duyet` sẽ bị treo vô thời hạn.

**Câu hỏi:** Có cơ chế ủy quyền tạm thời không? Admin có thể gán lại người duyệt cho tờ trình đang pending không? Hay chỉ chờ người đó quay lại?

---

### Q04 🟡 — Khi admin thay đổi cấu hình PhanQuyenDuyet, tờ trình đang pending bị ảnh hưởng không?

**Vấn đề:** Ví dụ: admin đổi người thẩm định cho bộ phận IT từ `tanvt` sang người khác. Lúc đó còn 3 tờ trình đang `cho_duyet` của bộ phận IT đang chờ `tanvt` thẩm định.

**Câu hỏi:** 3 tờ trình đó có tự động chuyển sang người thẩm định mới không? Hay vẫn giữ nguyên `tanvt` cho đến khi xử lý xong?

---

### Q05 🟡 — Upload hợp đồng đã ký (NT): tại sao tham_dinh và phe_duyet được phép upload?

**Vấn đề:** §3.2 ghi `tham_dinh` và `phe_duyet` đều ✅ cho "Upload hợp đồng đã ký (NT)". Trong thực tế, sau khi phê duyệt tờ trình NT, người nào sẽ đi ký hợp đồng và upload bản đã ký?

**Câu hỏi:** Nghiệp vụ cụ thể là gì? Ai chịu trách nhiệm upload bản hợp đồng đã ký? Có phải chỉ người trình (nguoiTrinhId) mới được phép không?

---

## 2. LUỒNG TẠO TỜ TRÌNH

### Q06 🔴 — Người dùng có được phép chọn bộ phận khác bộ phận của mình không?

**Vấn đề:** Form tạo tờ trình có dropdown chọn `boPhan`. Nếu `nhan_vien` IT được chọn bộ phận Kế toán, tờ trình đó sẽ do người thẩm định Kế toán xử lý và nhan_vien IT sẽ không còn thấy tờ trình của mình (do §3.3 lọc theo bộ phận).

**Câu hỏi:** `boPhan` trong form có được tự do chọn hay bị khóa theo `currentUser.boPhan`? Hay chỉ cho phép chọn trong danh sách bộ phận mà user đó thuộc về?

---

### Q07 🟡 — Ngày trình có được phép là ngày trong quá khứ không?

**Vấn đề:** Field `ngayTrinh` do người dùng chọn, mặc định là hôm nay. Về mặt kỹ thuật không có constraint nào ngăn chọn ngày quá khứ.

**Câu hỏi:** Hệ thống có cho phép chọn ngày quá khứ không? Có giới hạn không (ví dụ: không quá 30 ngày về trước)?

---

### Q08 🔴 — Hàng hoá không chịu VAT (0%) xử lý thế nào?

**Vấn đề:** Logic hiện tại: `soTienCoVAT = soTienChuaVAT × 1.1`. Nhưng một số loại hàng hoá/dịch vụ không chịu VAT hoặc chịu VAT 5%, 8%.

**Câu hỏi:**
- Có trường hợp VAT ≠ 10% không?
- Nếu có, user có thể nhập thủ công cả 2 ô `soTienChuaVAT` và `soTienCoVAT` độc lập không?
- Hay chỉ cần nhập `soTienCoVAT` là đủ (không cần tự động tính)?

---

### Q09 🟡 — File upload bị orphan nếu user không lưu tờ trình

**Vấn đề:** Luồng hiện tại: upload file trước → nhận URL → lưu tờ trình sau. Nếu user upload 3 file rồi thoát mà không lưu tờ trình, 3 file đó nằm trên storage mà không thuộc tờ trình nào.

**Câu hỏi:** Cần xử lý file orphan không? Cơ chế nào (TTL tự xóa? Job dọn dẹp định kỳ? Hoặc chấp nhận để đó)?

---

### Q10 🟡 — Số lượng file đính kèm tối đa cho một tờ trình là bao nhiêu?

**Vấn đề:** Hiện tại không có giới hạn số lượng file, chỉ có giới hạn kích thước mỗi file (20MB).

**Câu hỏi:** Có giới hạn số lượng file không? Tổng dung lượng file trên một tờ trình có giới hạn không?

---

## 3. LUỒNG DUYỆT

### Q12 🟡 — Sau khi gửi lại (tu_choi → cho_duyet): thamDinhLuc có bị reset không?

**Vấn đề:** Khi tờ trình bị từ chối, người trình sửa và gửi lại. Lúc đó tờ trình quay về `cho_duyet` để người thẩm định xem lại. Nhưng `thamDinhLuc` vẫn còn giá trị cũ từ lần thẩm định trước.

**Câu hỏi:** `thamDinhLuc` có nên reset về `null` khi tờ trình quay lại `cho_duyet` không? Hay giữ nguyên (chỉ ghi nhận lần thẩm định đầu tiên)?

---

### Q13 🟡 — Sau khi tờ trình được phê duyệt (phe_duyet), có thể làm thêm gì?

**Vấn đề:** Tờ trình NT sau phê duyệt cần upload hợp đồng đã ký. Tờ trình MS sau phê duyệt có thể cần đánh dấu "đã mua" hoặc "đã thanh toán". Hiện tại không có trạng thái nào sau `phe_duyet`.

**Câu hỏi:** Sau khi phê duyệt, có nghiệp vụ theo dõi thực hiện không (theo dõi mua hàng, thanh toán, ký kết)? Hay `phe_duyet` là trạng thái kết thúc hoàn toàn?

---

### Q14 🟢 — Có cần cảnh báo SLA cho tờ trình chờ quá lâu không?

**Câu hỏi:** Nếu tờ trình ở `cho_duyet` hơn 3 ngày mà chưa được thẩm định, hệ thống có tự động gửi nhắc nhở không? SLA là bao nhiêu ngày cho mỗi bước?

---

## 4. DỮ LIỆU & DATABASE

### Q15 🔴 — Mã tờ trình (ma) được sinh thế nào khi có soft delete?

**Vấn đề:** Logic hiện tại: `ma = MS{COUNT(*)+1}` trong số tờ trình loại MS. Nếu có tờ trình bị xóa (soft delete, `isDeleted=true`), `COUNT(*)` có tính tờ trình đã xóa không?

**Ví dụ:** Tạo MS0001, MS0002, MS0003. Xóa MS0002. Tạo mới → MS0004 hay MS0003 (trùng)?

**Câu hỏi:** Mã tờ trình có cần liên tục và không có lỗ hổng không? Nếu có, cần dùng sequence riêng thay vì COUNT.

---

### Q16 🔴 — User.boPhan lưu tên hay ID bộ phận?

**Vấn đề:** §5.1 ghi `User.boPhan: VARCHAR(100), FK → BoPhan.ten`. Nếu admin đổi tên bộ phận (ví dụ "Mua hàng" → "Procurement"), tất cả User có boPhan = "Mua hàng" sẽ bị mất liên kết.

**Câu hỏi:** User.boPhan nên lưu `BoPhan.id` (UUID) hay `BoPhan.ten` (string)? Lưu ID an toàn hơn về mặt referential integrity.

---

### Q17 🟡 — Khi xóa tờ trình (soft delete), file đính kèm trên object storage có bị xóa không?

**Câu hỏi:** Tờ trình bị xóa (isDeleted=true) → các file trong `fileDinhKem[]` có bị xóa khỏi storage không, hay chỉ đánh dấu ẩn? Nếu giữ lại, chi phí storage có được chấp nhận không?

---

### Q18 🟡 — Mã phí có được dùng chung giữa nhiều bộ phận không?

**Vấn đề:** Trong mock data, `CL0001 (CP Vận chuyển)` thuộc bộ phận IT, nhưng thực tế chi phí vận chuyển có thể phát sinh ở nhiều bộ phận.

**Câu hỏi:** Mã phí có được chia sẻ giữa các bộ phận không? Hay mỗi bộ phận có danh mục mã phí riêng? Ảnh hưởng đến thiết kế bảng `MaPhi`.

---

### Q19 🟡 — Báo cáo chi phí tính trên tờ trình nào? Chỉ phe_duyet hay tất cả trạng thái?

**Vấn đề:** Tổng chi phí trong báo cáo (S10) tính dựa trên tờ trình ở trạng thái nào?

**Câu hỏi:** Báo cáo chi phí tính trên:
- Chỉ tờ trình `phe_duyet` (đã được duyệt)?
- Hay tất cả trạng thái trừ `tu_choi`?
- Hay tất cả bao gồm cả đang pending?

---

## 5. NGHIỆP VỤ CHƯA RÕ

### Q20 🔴 — "Tờ trình nguyên tắc" (NT) nghĩa vụ thực tế là gì?

**Vấn đề:** Requirements mô tả NT là "hợp đồng nguyên tắc" với nhà cung cấp, có `ngayBatDauHD`, `ngayHetHanHD`, `nhaCungCap`. Nhưng chưa rõ sự khác biệt về quy trình xử lý so với MS.

**Câu hỏi:**
- NT có danh sách chi phí dự kiến không (như MS) hay chỉ ghi nhận nhà cung cấp + thời hạn?
- Khi hợp đồng sắp hết hạn, có cảnh báo tự động không?
- Hợp đồng đã ký (`hopDongDaKy`) có bắt buộc phải upload trước khi tờ trình được coi là hoàn tất không?

---

### Q21 🟡 — Hạn mức ngân sách theo bộ phận / mã phí có được kiểm soát không?

**Câu hỏi:** Hệ thống có cần kiểm tra và cảnh báo nếu tổng chi phí MS của một bộ phận vượt ngưỡng ngân sách định sẵn không? Hay đây chỉ là hệ thống phê duyệt thuần túy, không có module ngân sách?

---

### Q22 🟡 — Một người có thể thuộc nhiều bộ phận không?

**Vấn đề:** Hiện tại `User.boPhan` là 1 giá trị (1 bộ phận). Nhưng trong thực tế, một nhân viên có thể kiêm nhiệm nhiều phòng ban.

**Câu hỏi:** User có thể thuộc nhiều bộ phận không? Nếu có, ảnh hưởng lớn đến cách filter tờ trình theo bộ phận (§3.3).

---

### Q23 🟢 — Có cần ghi nhận "người ký duyệt" khác với "người thẩm định/phê duyệt" trong hệ thống không?

**Vấn đề:** Trong một số tổ chức, người ký phê duyệt trên giấy tờ (con dấu) khác với người click phê duyệt trên hệ thống.

**Câu hỏi:** Chữ ký số / in tên ký duyệt trên PDF có phải là yêu cầu không?

---

## 6. UX / INTERFACE

### Q24 🟡 — Sau khi đổi mật khẩu lần đầu (isFirstLogin), có cần đăng nhập lại không?

**Vấn đề:** §6.1 ghi sau khi đổi mật khẩu sẽ "Revoke tất cả refreshToken" để buộc login lại ở device khác. Nhưng device hiện tại đang dùng thì sao?

**Câu hỏi:** Sau khi đổi mật khẩu lần đầu thành công, user được giữ nguyên session hay phải đăng nhập lại? Trải nghiệm nào tốt hơn cho người dùng?

---

### Q25 🟡 — Xác nhận gửi tờ trình (M07): luôn hiện hay chỉ hiện lần đầu?

**Câu hỏi:** Dialog xác nhận trước khi gửi (M07) có hiện mỗi lần bấm gửi không? Hay chỉ hiện lần đầu và có checkbox "Không hỏi lại"?

---

### Q26 🟢 — Tờ trình có thể duplicate / copy không?

**Câu hỏi:** User có nhu cầu tạo tờ trình mới từ nội dung của một tờ trình cũ (copy) không? Ví dụ: mỗi tháng mua cùng một loại vật tư.

---

### Q27 🟢 — Có cần tính năng comment / ghi chú trong quá trình thẩm định không?

**Câu hỏi:** Người thẩm định có cần ghi chú / nhận xét vào tờ trình (không phải từ chối hẳn) trước khi chuyển sang phê duyệt không?

---

## 7. MÃ LỖI & NOTIFICATION

### Q28 🟡 — Prefix ID email notification (§10.2) trùng với mã lỗi (§9)

**Vấn đề:** Bảng 10.2 dùng `E001`, `E002`... cho ID email, trong khi §9 Error Handling cũng dùng `E001`, `E002`... cho mã lỗi API. Dễ gây nhầm lẫn khi đọc tài liệu và khi implement.

**Đề xuất:** Đổi prefix ID email thành `EM001`, `EM002`... Cần xác nhận để cập nhật requirements.

---

## TÓM TẮT ƯU TIÊN

| Nhóm | Số câu hỏi | Blocking 🔴 | Important 🟡 | Nice to have 🟢 |
|------|-----------|------------|-------------|----------------|
| Phân quyền & vai trò | 5 | Q01, Q02 | Q03, Q04, Q05 | — |
| Luồng tạo tờ trình | 5 | Q06, Q08 | Q07, Q09, Q10 | — |
| Luồng duyệt | 3 | — | Q12, Q13 | Q14 |
| Dữ liệu & Database | 5 | Q15, Q16 | Q17, Q18, Q19 | — |
| Nghiệp vụ chưa rõ | 4 | Q20 | Q21, Q22 | Q23 |
| UX / Interface | 4 | — | Q24, Q25 | Q26, Q27 |
| Notification & Mã lỗi | 1 | — | Q28 | — |
| **Tổng** | **27** | **6** | **16** | **5** |

> **Khuyến nghị:** Ưu tiên giải đáp 7 câu hỏi 🔴 Blocking trước khi bắt đầu thiết kế DB schema và API.
