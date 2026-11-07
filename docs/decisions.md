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

## D6 — Giao diện học sinh (Sprint 2), PO duyệt hướng thiết kế v2.1
- Phong cách khối mềm, indigo + cam; font Baloo 2 + Nunito **tự lưu trong app** (`@fontsource`), không nạp từ Google (quyền riêng tư của trẻ).
- Tra từ: **từ điển dựng sẵn** `app/public/glossary.json` (2439 dạng từ, IPA Anh-Anh, nghĩa, ví dụ), không gọi API ngoài. Nút nghe dùng giọng `en-GB` của trình duyệt. IPA/nghĩa do Team soạn; 160 mục gắn `check` cần giáo viên xem.
- Ví dụ gắn nhãn S/V/Aux/O/C/Adj/Adv/Prep/Conj: dữ liệu bổ sung `formula_v2`, `rules`, `examples` trong nội dung bài; mới có cho 10 bài Tenses.
- Nối bài với câu hỏi bằng `practice_tags` ∩ `tags` của câu (không đổi schema).
- Bài đạt khi ≥ 80% (đọc từ `app_settings`), chưa đạt chỉ cảnh báo, không khóa bài sau.

## D7 — Không để mất bài đang làm (sửa lỗi nghiêm trọng, 2026-11-02)
- Nguyên nhân: supabase-js phát lại `SIGNED_IN` mỗi khi tab hiện lại; app vẽ lại toàn trang khi nhận sự kiện đó nên bỏ bài đang làm và bốc 10 câu mới.
- Sửa: (1) chỉ vẽ lại khi người đăng nhập thật sự đổi (`app/src/auth-events.ts`); (2) lưu bài đang làm vào `localStorage` (câu hỏi, đáp án đã chọn, thứ tự đáp án, câu hiện tại; hết hạn sau 24 giờ; theo từng người + từng bài) để tải lại trang hoặc trình duyệt giải phóng tab vẫn khôi phục được (`app/src/session-store.ts`). Hoàn thành bài hoặc bấm "Luyện thêm" thì xóa bản lưu.
- Dữ liệu lưu chỉ nằm trong trình duyệt của em, không gửi đi đâu.

## D8 — Lý do vì sao đáp án sai (2026-11-03, PO yêu cầu)
- Khi em chọn sai, phản hồi hiện thêm "Vì sao '…' chưa đúng: …" rồi "Đáp án đúng vì: …". Câu tìm lỗi dùng dòng dẫn riêng ("Về phần em chọn") vì phần em chọn là phần đúng.
- Dữ liệu ở cột mới `questions.why_wrong` (jsonb): dạng chọn đáp án khóa theo id đáp án; dạng điền từ khóa theo đáp án sai hay gặp (so khớp như hàm chấm). Cần chạy `db/migrations/2026-11-03_why_wrong.sql` một lần; app vẫn chạy khi chưa có cột. Câu ghép cặp không có (mỗi dòng sai đã hiện đáp án đúng).
- Quy trình 2 lớp: agent soạn → agent khác tự giải lại rồi duyệt/sửa/bỏ từng lý do (`data_bank/why/`). Phạm vi hiện tại: chủ điểm Tenses (522 lý do, 179/196 câu). 13 chủ điểm còn lại chưa làm.
- Phát hiện phụ: 7 câu trắc nghiệm có đáp án nhiễu thực ra cũng đúng → đã thay bằng dạng chắc chắn sai (Q_TENSES_041, 044, 050, 052, 071, 074, 099; bản sao lưu ở `data_bank/review/backup_json_pre_why/`). Tám câu điền từ có dạng gõ khác cũng đúng (Q117, 120, 122, 127, 128, 129, 133, 139): PO chọn viết lại để chỉ còn một đáp án; đã viết lại 6 câu và agent độc lập kiểm tra đạt; Q133 và Q139 giữ thêm dạng đúng tự nhiên (begins/will begin; has already finished/already finished) và nhận cả dạng viết tắt. Q_TENSES_156 (câu tìm lỗi mà chính 'lỗi' gây tranh cãi) chuyển sang danh sách chờ giáo viên.

## D9 — Bài kiểm tra tổng thể cuối mỗi giai đoạn (2026-11-04, PO yêu cầu)
- PO chọn: mở khóa khi mỗi bài trong giai đoạn đã luyện ít nhất 1 lần; bài kiểm tra Giai đoạn 4 chỉ gồm Cụm động từ & collocation.
- Team quyết (lý do trong `docs/phase-test-spec.md`): số câu = số bài trong khoảng 20–40, 1 phút/câu, đạt 7/10, ưu tiên bài yếu và câu chưa gặp, không hiện đúng/sai đến khi nộp, hết giờ tự nộp, lưu tiến trình để không mất bài.
- Lịch sử trong bảng mới `phase_test_runs` (migration `db/migrations/2026-11-04_phase_tests.sql`).

## D10 — Theo dõi học tập cho phụ huynh: nhật ký hoạt động + tab Thống kê (2026-11-06, PO yêu cầu)
- PO chọn: dùng cho phụ huynh theo dõi vài em; ghi đầy đủ thời gian học; báo cáo gồm biểu đồ ngày/tuần/tháng, cảnh báo bỏ học/điểm yếu, bảng + xuất CSV.
- Dữ liệu: bảng `activity_log` (`db/migrations/2026-11-06_activity_log.sql`) chỉ có `login` và `view` (màn hình + số ms tương tác). Số câu, % đúng, bài đạt, bài kiểm tra lấy từ `attempts`, `lesson_progress`, `phase_test_runs` có sẵn nên không ghi trùng. Không lưu IP, thiết bị, không bên thứ ba.
- Thời gian học là **thời gian tương tác thực**, không phải thời gian mở tab: mỗi lần thao tác cộng khoảng cách từ lần trước, tối đa 60 giây (`app/src/activity.ts`). Là ước lượng từ trình duyệt; đóng tab đột ngột có thể mất tối đa ~2 phút chưa gửi.
- Thống kê dùng hàm SQL `security definer` (`2026-11-07_admin_stats.sql`), mỗi hàm tự gọi `assert_admin()`; **không dùng view** vì view chạy bằng quyền chủ bảng và bỏ qua RLS. Đã kiểm chứng trên Supabase thật: tài khoản học sinh gọi hàm nhận 403 `NOT_ADMIN`. Ngày tính theo giờ Việt Nam; gom tuần/tháng ở client.
- "Bỏ dở bài" không có sự kiện riêng mà suy ra: bài xem ≥ 1 phút nhưng cùng ngày không có câu trả lời nào (`admin_abandoned_lessons`, `2026-11-08_activity_retention.sql`).
- **Lưu giữ:** `activity_log` chỉ giữ 3 tháng (PO chọn), tự xóa hằng ngày bằng pg_cron nếu bật được, nếu không thì dùng nút "Dọn nhật ký" trong tab Thống kê. Kết quả làm bài và bài kiểm tra không bị xóa. Lý do: tối thiểu hóa dữ liệu của học sinh vị thành niên.
- Bài học khi triển khai: `sum()` của cột bigint trả về numeric nên hàm khai báo `bigint` phải ép kiểu, SQL chưa chạy thử trên Postgres thật thì dễ sót lỗi kiểu này.

## D11 — Sổ lỗi sai với ôn lặp cách quãng 1/3/7 ngày (2026-11-07, PO yêu cầu)
- PO chọn: ghi câu sai từ **cả ba nguồn** (bài luyện, bài kiểm tra cuối chủ điểm, bài kiểm tra giai đoạn); mỗi lần ôn **tối đa 20 câu**; chỉ nhắc **trong app** (trang chủ), có giám sát cho phụ huynh; câu đã nắm **giữ lại nhưng ẩn** khỏi danh sách cần ôn.
- Quy tắc: sai → giai đoạn 0, hẹn sau 1 ngày; ôn đúng → giai đoạn 1 (3 ngày) → 2 (7 ngày) → đúng lần nữa là "đã nắm"; ôn sai → về giai đoạn 0. Câu đã nắm mà làm sai lại ở nơi khác thì quay về giai đoạn 0. Logic thuần ở `app/src/mistake-book.ts` (có test), hàm `nextReview` dùng lại từ `grading.ts`.
- **"Đến hạn" tính theo ngày lịch giờ Việt Nam**, không theo giờ: sai lúc 19:00 hôm nay thì sáng mai đã thấy cần ôn. Thứ tự chọn câu: trễ lâu nhất trước, rồi câu sai nhiều lần nhất.
- Mỗi đáp án ôn được lưu ngay khi trả lời (thoát giữa chừng không mất). Ghi câu sai vào sổ **không bao giờ làm hỏng** việc lưu kết quả bài: lỗi thì bỏ qua âm thầm.
- Câu ôn lại **không ghi vào `attempts`** để thống kê "số câu" và "% đúng theo chủ điểm" của trang quản trị không bị lệch (câu ôn là câu đã từng sai). Thay vào đó có `mistake_book.reviews_count` / `last_reviewed_at` và hàm `admin_mistake_summary` (`db/migrations/2026-11-09_mistake_book.sql`). Thời gian ở màn hình sổ vẫn được tính vào nhật ký (`view_kind = 'mistakes'`).
- Giám sát: tab Thống kê có bảng sổ lỗi sai từng em (đang theo dõi, cần ôn, quá hạn ≥ 3 ngày, đã nắm, lần ôn gần nhất) và cảnh báo khi có câu quá hạn ≥ 3 ngày.
- **Không cho xem đáp án trước khi nhớ (PO chọn kiểu nghiêm, 2026-11-07):** theo nguyên lý nhớ lại chủ động, danh sách sổ chỉ hiện đề với câu chưa nắm; đáp án và lời giải chỉ hiện khi em bấm "Xem đáp án". Với câu **đang đến hạn**, bấm xem tính là chưa nhớ: về giai đoạn 0, hẹn lại sau 1 ngày (`peekLapse`; không cộng số lần sai hay số lần ôn). Câu chưa đến hạn thì xem không bị tính. Câu đã nắm hiện đáp án luôn. Trong lượt ôn, đáp án vẫn chỉ hiện sau khi em trả lời.
- Giới hạn đã biết: không có email hay thông báo đẩy, em phải mở web mới thấy nhắc. Chưa có ngoại lệ cho em nghỉ dài (câu cứ tồn lại, mỗi lần chỉ ôn 20).

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
