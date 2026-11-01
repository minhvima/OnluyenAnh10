---
name: webapp-delivery
description: Quy trình triển khai ứng dụng web ôn thi vào 10 — lập kế hoạch tính năng, kiến trúc MVP tĩnh rồi nâng lên Supabase, schema DB, logic chấm điểm, sổ lỗi sai, mock exam, kiểm thử và definition of done. Dùng khi bắt đầu hoặc mở rộng mã nguồn trong app/ và tools/.
---

# Triển khai web ôn thi vào 10

## Lộ trình (làm tuần tự, mỗi mốc chạy được)
1. **M0 – Nền móng:** cấu trúc thư mục (CLAUDE.md §6), `tools/` validate, nạp 1 chủ điểm đã duyệt (≥ 30 câu) làm dữ liệu thử.
2. **M1 – Luyện tập lõi:** chọn chủ điểm → làm bài → phản hồi xanh/đỏ + khóa nút + lời giải + hint. Hàm chấm thuần + test.
3. **M2 – Bài học:** màn lý thuyết (thẻ công thức, bảng so sánh, flashcard, video nhúng) từ `data_bank/lessons`.
4. **M3 – Sổ tay lỗi sai & tiến độ:** lưu `localStorage` (có export/import JSON), làm lại câu sai theo cách quãng, dashboard % theo 12 chủ điểm.
5. **M4 – Kiểm tra bài (mastery) & ôn gộp:** bài test đầu vào theo chủ điểm → bản đồ điểm yếu; kiểm tra bài với ngưỡng đạt cấu hình (mặc định 80%); ôn gộp sau 3–4 bài. Bấm giờ là tùy chọn (dùng timestamp, không cộng dồn setInterval). Mock exam theo profile Hà Nội/Hải Phòng chỉ làm nếu được yêu cầu.
6. **M5 – Tài khoản (tùy chọn):** Supabase Auth + Postgres; đồng bộ tiến độ; trang giáo viên xem lớp. Cần RLS chặt: học sinh chỉ đọc/ghi dữ liệu của mình.
7. **M6 – Hoàn thiện:** PWA/offline, a11y, hiệu năng, triển khai (GitHub Pages / Netlify / Vercel / Cloudflare Pages).

## Mô hình dữ liệu
Dùng schema bảng ở báo cáo (`topics, lessons, questions, question_options, quizzes, quiz_questions, user_progress, user_answers`) cho giai đoạn DB. Bổ sung: `user_answers.attempt_id`, `review_due_at`, `time_spent_ms`. Ở MVP tĩnh, ánh xạ 1-1 sang cấu trúc `localStorage`:
```
progress: {lessonId: {status, score, updatedAt}}
answers:  [{questionId, correct, selected, ts, attemptId}]
errorLog: {questionId: {wrongCount, lastWrongAt, nextReviewAt, box}}
```
Gắn `schema_version` và viết hàm migrate khi đổi cấu trúc.

## Logic quan trọng cần test
- Chấm MCQ/điền từ (chuẩn hóa: trim, hạ chữ hoa, gộp khoảng trắng, nháy `'`/`’`, viết tắt `isn't`↔`is not` qua `accepted_answers`)/matching.
- Chọn câu ngẫu nhiên không lặp, cân bằng mức độ; xáo đáp án nhưng giữ ánh xạ đáp án đúng.
- Lịch ôn lỗi sai (Leitner 3 hộp: 1 / 3 / 7 ngày).
- Bộ đếm giờ, nộp bài khi hết giờ, khôi phục khi tải lại trang giữa chừng.

## UI/UX
- Gọi skill `professional-web-ui` cho thiết kế & kiểm định giao diện; token màu/typography đặt trong CSS variables; chế độ sáng/tối tùy chọn.
- **Desktop-first** (học sinh bắt buộc dùng máy tính): bố cục 2 cột lý thuyết | bài tập, phím tắt A–D/1–4 chọn đáp án, Enter sang câu tiếp, Tab/focus rõ ràng.
- Màn hình làm bài: thanh tiến độ, nút "Gợi ý", sau khi chọn: xanh ✓ / đỏ ✗ + lời giải + nút "Câu tiếp".
- Trạng thái rỗng/lỗi/đang tải rõ ràng; thông điệp động viên khi sai ("Gần đúng rồi — xem vì sao nhé").

## Bảo mật & riêng tư
Học sinh là trẻ vị thành niên: không thu thập họ tên thật bắt buộc, không SDK quảng cáo/theo dõi, không lộ khóa bí mật trong mã client (chỉ anon key + RLS), cho phép xóa dữ liệu cá nhân.

## Kiểm thử & xác minh
- `npm test` (hoặc tương đương) cho logic thuần; `python tools/validate_questions.py data_bank/json` trước mỗi build dữ liệu.
- Chạy app bằng preview, kiểm ở 1280px và 1920px (và ~1024px), không lỗi console, thử đủ 3 dạng câu và phím tắt.
- Báo kết quả thật (pass/fail, những gì chưa kiểm).

## Khi bắt đầu một tính năng
1. Nêu ngắn: mục tiêu, file sẽ đụng, cách kiểm chứng.
2. Làm nhỏ, chạy được, rồi mới mở rộng.
3. Ghi quyết định kiến trúc đáng nhớ vào `docs/decisions.md` (ngày, bối cảnh, lựa chọn, lý do).
