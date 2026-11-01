# Decisions

## D1 — Quy trình: Scrum (PO = phụ huynh, Team = Claude + skill dự án)
- Chạy nhiều Sprint liền (0→4), báo cáo + demo sau mỗi nhóm Sprint; PO duyệt backlog trước khi bắt đầu.
- Mỗi Sprint có Sprint Goal, Definition of Done theo CLAUDE.md §11, Review, Retro (ghi cuối file này).
- Ngày: 2026-11-01.

## D2 — Dữ liệu: duyệt xong rồi mới làm app (PO chọn)
- Sprint 0 gồm việc chạy `question-bank-qa` cho cả 14 chủ điểm trong `data_bank/review/` → `data_bank/json/`.
- Câu cần giáo viên (`needs_teacher_*.md`) giữ ở review, KHÔNG đưa vào app tới khi có ý kiến.

## D3 — Tech stack: Vite + vanilla TypeScript (PO chọn) + Supabase (cập nhật 2026-11-01, thay quyết định "không backend")
- Lý do đổi: khảo sát PO cho thấy cần tài khoản, nhiều em dùng, phụ huynh xem tiến độ từ xa.
- Frontend: Vite + vanilla TS. Backend: Supabase (PostgreSQL + Auth), gói miễn phí.
- Thứ tự (PO chọn): **thiết kế cơ sở dữ liệu trước**, sau đó làm phần quản trị dữ liệu (admin), rồi mới tới giao diện học.
- Hosting (PO chọn): **GitHub Pages** cho frontend tĩnh + Supabase free. Repo Pages miễn phí phải public → câu hỏi/đáp án chỉ nằm trong Supabase (RLS), không đưa vào repo public.

## D5 — Thiết kế DB (db/schema.sql, DRAFT)
- Học sinh đọc được `correct_answer` (RLS chỉ cho người trong allowlist, chỉ câu `approved`). Đánh đổi: chấm bằng hàm thuần TS ở client, phản hồi tức thì không cần mạng; đổi lại không chống gian lận — chấp nhận vì đây là bài luyện, không phải thi.
- Chặn đăng ký ngoài allowlist bằng trigger trên `auth.users` (cần xác minh trên Supabase thật ở Sprint 1; có phương án dự phòng: kiểm tra `is_allowed()` ở RLS, người lạ đăng nhập được nhưng không đọc được gì).
- Admin chỉ đọc dữ liệu học của học sinh, không sửa.

## D4 — Khảo sát PO (2026-11-01)
- Người học: vài em (anh chị em, bạn bè); hổng nhiều chỗ; còn < 3 tháng; 30–45 phút/ngày.
- Thành công: em tự giác học đều; điểm ngữ pháp tăng; PO theo dõi được tiến độ; em hiểu bản chất.
- Giao diện: thân thiện, vui, trẻ trung. Ưu tiên đầu tiên: học + luyện một chủ điểm chạy tốt.
- Đăng nhập: Google (Gmail), chỉ cho phép email nằm trong **danh sách cho phép** (allowlist) do phụ huynh quản lý.
- Phụ huynh xem tiến độ từ xa trên máy phụ huynh (cần vai trò admin/parent).
- Số liệu đề HN/HP: bỏ qua, app không bám ma trận đề.
- Admin: chỉ PO (một email). Không có so sánh điểm giữa các em.
- Thứ tự chủ điểm: xem `docs/learning-path.md` (D5, chờ PO duyệt).
- Hệ quả: lộ trình ngắn → ưu tiên chủ điểm hay gặp trước; export/import JSON chỉ còn là sao lưu phụ.
