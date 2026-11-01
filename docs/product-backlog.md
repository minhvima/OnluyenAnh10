# Product Backlog v2 (đã sắp theo FR trong requirements.md)

Ưu tiên: M/S/C. Ước lượng: S/M/L. Thứ tự PO đã chốt: DB → quản trị dữ liệu → học/luyện.

## Sprint 0 — Nền móng & dữ liệu (đang làm)
Goal: dữ liệu sạch + DB thiết kế xong + khung app.
- [x] Quyết định, khảo sát, FR, lộ trình (decisions, requirements, learning-path)
- [x] `tools/validate_questions.py` chạy được: 2800 câu, 0 lỗi, 111 cảnh báo (chưa xử lý)
- [x] `db/schema.sql` bản nháp
- [x] QA ngữ pháp cả 14 chủ điểm (subagent tự giải độc lập, chưa có giáo viên xác nhận): 2673/2800 câu vào `data_bank/json/`; 127 câu chờ trong `review/pending_after_qa.json` (reject chủ yếu do trùng và matching hoán đổi được). Phát hiện 2 câu sai khóa gốc (Q_CONDITIONALS_145, 154), đã sửa.
- [x] Giảm trùng: loại 30 câu cùng nội dung (giữ id nhỏ nhất mỗi nhóm) → `review/duplicates_removed.json`; bản sao lưu trước khi loại ở `review/backup_json_pre_dedupe/`. Bộ đã duyệt còn 2643 câu. Còn 4 cảnh báo gần trùng của validator chưa xem tay (RELATIVE_089~166, COMPARISONS_011~093, GERUNDS_041~094, WORD_FORMS_154~159).
- [x] Khởi tạo `app/` (Vite + TS + vitest): hàm chấm, xáo, mastery, lặp cách quãng; 9 test qua, build qua
- [ ] Viết lại dạng matching cho thiếu cặp duy nhất; áp dụng bài học rút ra cho 11 chủ điểm còn lại

## Sprint 1 — Hạ tầng & quản trị (FR-A, FR-B) — XONG (2026-11-02)
Đã kiểm chứng thật: Supabase chạy schema, đăng nhập Google, import 2643 câu + 140 bài, màn Quản trị, email lạ bị chặn (PO tự thử).
Đã viết (chưa chạy với Supabase thật): sửa trigger schema + `my_access()`, `db/seed.sql`, `tools/import_to_supabase.py` (dry-run OK: 2643 câu, 140 bài), app có đăng nhập Google, màn từ chối, màn Quản trị (allowlist, duyệt câu, duyệt bài), workflow GitHub Pages, `docs/setup-guide.md`. Chờ PO tạo GitHub/Supabase/Google rồi mới kiểm chứng thật.
- Tạo Supabase + Google OAuth (PO đăng nhập, Team hướng dẫn), chạy schema, xác minh chặn allowlist.
- Script import JSON → DB; màn Admin: allowlist, danh sách/duyệt/loại câu hỏi.
- Deploy GitHub Pages (repo public chỉ chứa mã, không chứa câu hỏi).

## Sprint 2 — Học & luyện một chủ điểm (FR-C) — ĐÃ VIẾT, CHỜ KIỂM TRA THẬT
Đã làm: trang chủ nhiều màu, danh sách bài, màn Học + Luyện 2 cột, 6 dạng câu, phản hồi tức thì, phím tắt, xáo đáp án, tổng kết + lưu kết quả, tra từ (popup + chế độ Tra từ), ví dụ gắn nhãn cho 10 bài Tenses. 29 test qua, build qua; chạy thử với dữ liệu thật qua bản xem thử cục bộ (14 chủ điểm, không lỗi). CHƯA kiểm với Supabase thật (cần PO duyệt bài + chạy import cập nhật nội dung bài). Còn: ví dụ gắn nhãn cho 130 bài khác; hint; kiểm tra IPA/nghĩa/nhãn với giáo viên.
- Trang chủ chủ điểm/bài; màn 2 cột; phản hồi tức thì; 6 dạng câu; phím tắt; xáo đáp án; hint; hàm chấm + test.
- Chủ điểm đầu tiên: TENSES (khớp lộ trình).

## Sprint 3 — Mastery & sổ lỗi sai (FR-D1, FR-E)
## Sprint 4 — Test đầu vào, lộ trình, màn hình phụ huynh (FR-D2, D3, FR-F)
## Sprint 5 — Ôn gộp, XP, a11y, hoàn thiện (FR-D4, FR-G, NFR)
Hạ ưu tiên: mock exam (FR-H1), export sao lưu (FR-H2).

## Rủi ro
- 2800 câu đều `draft`; chưa câu nào được xác nhận đúng ngữ pháp. Câu `needs_teacher` có thể làm thiếu câu.
- Chặn đăng ký bằng trigger `auth.users` chưa kiểm chứng trên Supabase thật.
- Cần tài khoản GitHub, Supabase, Google Cloud do PO sở hữu.
