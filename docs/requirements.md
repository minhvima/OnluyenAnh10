# Yêu cầu hệ thống: As-Is → To-Be → FR (DRAFT, chờ PO duyệt)

Căn cứ: khảo sát PO 2026-11-01 (decisions.md D3–D4), CLAUDE.md.

## 1. As-Is (hiện trạng)

| Khía cạnh | Hiện tại |
|---|---|
| Học | Em học rời rạc (sách/trung tâm/video), không biết hổng chủ điểm nào, không có lộ trình |
| Luyện | Làm đề/bài tập giấy hoặc nguồn rời; không chấm và giải thích tức thì |
| Ôn lỗi | Không có sổ lỗi sai có hệ thống; sai xong dễ quên, lặp lại lỗi cũ |
| Theo dõi | Phụ huynh không biết em học bao nhiêu, yếu chỗ nào, tiến bộ ra sao |
| Động lực | Phụ thuộc nhắc nhở; học không đều |
| Nội dung | Đã có 14 bài lý thuyết (`data_bank/lessons`), câu hỏi chờ duyệt (`data_bank/review`), một số câu cần giáo viên |
| Hệ thống | Chưa có app, chưa có DB, chưa có hosting |

Vấn đề chính: em hổng gốc, còn < 3 tháng, chỉ học được 30–45 phút/ngày → cần học đúng chỗ yếu, có phản hồi tức thì, ôn lại lỗi, và phụ huynh nắm được tình hình.

## 2. To-Be (đích đến)

- Web desktop-first, giao diện thân thiện, vui, trẻ trung, tiếng Việt.
- Em đăng nhập bằng Google; chỉ email trong danh sách cho phép mới vào được.
- Quy trình mỗi em: **Test đầu vào → Bản đồ điểm yếu → Lộ trình → Học (lý thuyết micro) → Luyện (phản hồi tức thì) → Kiểm tra bài (mastery ≥ 80%) → Sổ lỗi sai (lặp 1/3/7 ngày) → Ôn gộp**.
- Phụ huynh (admin) đăng nhập xem tiến độ từ xa, quản lý danh sách cho phép và nội dung.
- Dữ liệu trong Supabase (PostgreSQL + Auth + RLS); frontend tĩnh trên **GitHub Pages**.
- Ngoài phạm vi: bám ma trận đề HN/HP, mock exam (ưu tiên thấp), phát âm, đọc hiểu, Listening.

### Vai trò
| Vai trò | Quyền |
|---|---|
| Học sinh | Học, luyện, xem tiến độ và sổ lỗi sai của chính mình |
| Phụ huynh/Admin | Quản lý allowlist, xem tiến độ mọi em, quản lý nội dung (bài, câu hỏi, duyệt/loại) |

## 3. Yêu cầu chức năng (FR)

Ưu tiên: M = Must, S = Should, C = Could. Sprint theo thứ tự đã chốt (DB → quản trị → học/luyện).

### Nhóm A — Tài khoản & phân quyền
- FR-A1 (M) Đăng nhập bằng Google.
- FR-A2 (M) Chỉ email trong allowlist được vào; email khác thấy thông báo "chưa được cấp quyền".
- FR-A3 (M) Hai vai trò học sinh / admin; học sinh chỉ truy cập dữ liệu của mình (RLS).
- FR-A4 (M) Admin thêm/xóa/khóa email trong allowlist.
- FR-A5 (S) Đăng xuất; ghi nhớ phiên.

### Nhóm B — Quản trị nội dung (Admin)
- FR-B1 (M) Import bài lý thuyết và câu hỏi từ JSON vào DB (script có kiểm tra schema).
- FR-B2 (M) Xem danh sách câu hỏi theo chủ điểm/mức độ/dạng/trạng thái (nháp, đã duyệt, bị loại, cần giáo viên).
- FR-B3 (M) Duyệt/loại/sửa câu hỏi; chỉ câu "đã duyệt" hiển thị cho học sinh.
- FR-B4 (S) Sửa bài lý thuyết.
- FR-B5 (S) Báo cáo chất lượng: câu trùng, câu bị học sinh sai hàng loạt.

### Nhóm C — Học & luyện
- FR-C1 (M) Trang chủ: danh sách chủ điểm và bài, trạng thái từng bài (chưa học / đang học / đạt).
- FR-C2 (M) Màn bài học 2 cột: lý thuyết cạnh bài tập (≤ 5 phút lý thuyết/bài).
- FR-C3 (M) Phản hồi tức thì: đúng xanh, sai đỏ, kèm icon ✓/✗ và chữ; khóa các đáp án còn lại; hiện lời giải ≤ 3 câu.
- FR-C4 (M) Hỗ trợ 6 dạng câu: multiple_choice, fill_in_blank, matching, error_identification, sentence_transformation, sentence_combination.
- FR-C5 (M) Phím tắt: A–D hoặc 1–4 chọn đáp án, Enter sang câu tiếp.
- FR-C6 (M) Xáo thứ tự đáp án mỗi lần làm.
- FR-C7 (S) Gợi ý (từ khóa/công thức), không lộ đáp án.
- FR-C8 (M) Chấm điểm bằng hàm thuần có unit test; lưu kết quả từng câu.

### Nhóm D — Mastery, lộ trình, chẩn đoán
- FR-D1 (M) Bài "đạt" khi đúng ≥ 80% (ngưỡng cấu hình); chưa đạt thì gợi ý học lại/luyện thêm, bài sau không bị khóa nhưng có cảnh báo.
- FR-D2 (M) Test đầu vào theo chủ điểm.
- FR-D3 (M) Bản đồ điểm yếu và gợi ý lộ trình, ưu tiên chủ điểm hay gặp khi thời gian ngắn.
- FR-D4 (S) Ôn gộp sau 3–4 bài, bấm giờ nhẹ tùy chọn.

### Nhóm E — Sổ lỗi sai
- FR-E1 (M) Tự ghi câu sai vào sổ.
- FR-E2 (M) Làm lại theo lịch lặp cách quãng 1 / 3 / 7 ngày.
- FR-E3 (S) Lọc sổ theo chủ điểm; đánh dấu "đã nắm".

### Nhóm F — Theo dõi (Phụ huynh)
- FR-F1 (M) Danh sách các em, thời gian học gần nhất, số ngày học liên tiếp.
- FR-F2 (M) Chi tiết từng em: điểm theo chủ điểm, bài đạt/chưa đạt, lỗi hay sai.
- FR-F3 (S) Biểu đồ tiến bộ theo thời gian.

### Nhóm G — Động lực
- FR-G1 (S) XP và chuỗi ngày học, không bảng xếp hạng công khai tên thật.
- FR-G2 (C) Huy hiệu khi đạt mastery.

### Nhóm H — Khác
- FR-H1 (C) Mock exam theo `config/exam_profiles.json`.
- FR-H2 (C) Export tiến độ dạng sao lưu.

## 4. Yêu cầu phi chức năng (tóm tắt)
- NFR-1 Desktop-first, dùng được ở 1024/1280/1920px.
- NFR-2 A11y WCAG AA, điều hướng bàn phím, không chỉ dùng màu báo đúng/sai.
- NFR-3 Riêng tư trẻ vị thành niên: chỉ lưu email, tên hiển thị, kết quả học; không tracking bên thứ ba, không quảng cáo.
- NFR-4 Bảo mật: RLS trên mọi bảng; khóa Supabase phía client chỉ là anon key; không commit secret.
- NFR-5 Không lỗi console; có trạng thái rỗng/lỗi.
- NFR-6 Chi phí 0 đồng (GitHub Pages + Supabase free).

## 5. Điểm cần lưu ý kỹ thuật
- GitHub Pages chỉ phục vụ file tĩnh (đúng với kế hoạch) và cần repo GitHub; gói miễn phí yêu cầu repo **public**. Vì vậy câu hỏi và đáp án **không nằm trong repo/bundle công khai**; chỉ nằm trong Supabase, học sinh đăng nhập mới đọc được (RLS). File JSON nguồn trong `data_bank/` cần giữ ngoài repo public hoặc repo riêng.
- Thư mục dự án hiện chưa phải git repo; cần tạo repo GitHub (anh/chị tạo hoặc cấp quyền).
- Google OAuth và Supabase cần anh/chị đăng nhập tạo dự án; tôi hướng dẫn từng bước.

## 6. Câu hỏi mở cho PO
1. Admin là mình anh/chị (một email) hay có thêm người?
2. Có cần học sinh nhìn thấy điểm so với bạn khác không (hiện mặc định: không)?
3. Danh sách chủ điểm ưu tiên khi thời gian ngắn — để Team đề xuất?
