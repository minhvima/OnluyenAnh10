# CLAUDE.md — Web ôn thi vào 10 môn Tiếng Anh (Ngữ pháp) · Hà Nội & Hải Phòng

## 1. Sứ mệnh dự án
Xây ứng dụng web giúp học sinh lớp 9 (đặc biệt em bị hổng gốc) **lấp lỗ hổng ngữ pháp theo từng chủ điểm** nằm trong khung kiến thức thi tuyển sinh lớp 10 môn Tiếng Anh (Hà Nội, Hải Phòng), theo **GDPT 2018** (SGK Global Success 6–9), tham chiếu thêm chương trình THPT và các trung tâm uy tín.

**Trọng tâm là nắm vững chủ điểm (mastery), KHÔNG phải luyện bộ đề thi.** Đề thật chỉ dùng để xác định chủ điểm/dạng bài cần có; mock exam là tùy chọn, ưu tiên thấp.

Nguyên tắc vàng: **đúng kiến thức > đẹp > nhiều tính năng**. Một câu hỏi sai đáp án hoặc lời giải sai làm hại học sinh hơn mọi tính năng thiếu.

## 2. Người dùng & ngôn ngữ
- Học sinh 14–15 tuổi, **bắt buộc làm trên máy tính** → **desktop-first**: bố cục 2 cột (lý thuyết cạnh bài tập), hỗ trợ bàn phím (A–D hoặc 1–4 chọn đáp án, Enter sang câu tiếp). Không cần tối ưu điện thoại.
- Giao diện, lý thuyết, lời giải: **tiếng Việt** (thuật ngữ ngữ pháp kèm tiếng Anh, vd. "Hiện tại hoàn thành (Present Perfect)"). Câu hỏi, đáp án, ví dụ: **tiếng Anh**.
- Giọng văn: thân thiện, ngắn, như gia sư kiên nhẫn. Không phán xét lỗi sai. Mỗi lời giải ≤ 3 câu, nêu **dấu hiệu nhận biết → công thức → kết luận**.

## 3. Phạm vi nội dung
15 chủ điểm (mã `topic_code` dùng xuyên suốt code, JSON, DB). Chi tiết sub-skill, nguồn và thứ tự học: `docs/curriculum-map.md`. Chủ điểm 13–15 thêm sau B0: `SENTENCE_STRUCTURES` (cấu trúc & kết hợp câu, câu hỏi), `MODALS_QUANTIFIERS` (khuyết thiếu, lượng từ, đếm được/không đếm được), `COMMUNICATION` (giao tiếp, ưu tiên thấp). Bảng dưới là 12 chủ điểm gốc:

| # | topic_code | Chủ điểm |
|---|---|---|
| 1 | TENSES | Các thì |
| 2 | PASSIVE_VOICE | Câu bị động |
| 3 | CONDITIONALS | Câu điều kiện 0/1/2, unless |
| 4 | REPORTED_SPEECH | Câu tường thuật |
| 5 | RELATIVE_CLAUSES | Mệnh đề quan hệ |
| 6 | COMPARISONS | So sánh |
| 7 | GERUNDS_INFINITIVES | V-ing / to-V / bare V |
| 8 | PREPOSITIONS_CONJUNCTIONS | Giới từ & liên từ |
| 9 | WISH_SENTENCES | Câu ước |
| 10 | WORD_FORMS | Cấu tạo từ |
| 11 | ARTICLES_PRONOUNS | Mạo từ & đại từ |
| 12 | PHRASAL_VERBS_COLLOCATIONS | Cụm động từ & collocation |

Mức nhận thức: `Recognition` (Nhận biết ~50%) · `Comprehension` (Thông hiểu ~30%) · `Application` (Vận dụng ~20%).
Dạng câu: `multiple_choice`, `fill_in_blank`, `matching`, `error_identification` (tìm lỗi gạch chân), `sentence_transformation` (chọn câu cùng nghĩa), `sentence_combination` (chọn câu kết hợp đúng). Ba dạng sau mô phỏng dạng đề thật nhưng chỉ để kiểm tra chủ điểm ngữ pháp.

**Ngoài phạm vi (giai đoạn đầu):** phát âm/trọng âm, đọc điền từ và đọc hiểu, từ đồng/trái nghĩa, Listening. Chỉ thêm khi được yêu cầu.

## 4. Dữ kiện đề thi — PHẢI KIỂM CHỨNG, không được bịa
Cấu trúc/thời lượng/số câu/ma trận của **Hà Nội** và **Hải Phòng** thay đổi theo năm và khác nhau. File `Data ban dau/bao-cao-ky-thuat-*.md` nêu "50 câu / 60 phút / 50-30-20" nhưng là báo cáo tổng hợp, **chưa xác nhận**; tra cứu sơ bộ (11/2026) cho thấy Hà Nội 2026 khoảng 40 câu trắc nghiệm/60 phút. Hải Phòng: phụ huynh cung cấp cấu trúc 40 câu/60 phút/0,25đ/câu (4 ngữ âm, 16 từ vựng-ngữ pháp, 2 tìm lỗi, 10 đọc, 8 viết) — ghi ở `docs/curriculum-map.md` (S8), chưa có nguồn/năm. Phần này không chặn việc phát triển vì app không bám ma trận đề.
- Khi cần con số đề thi: tra đề chính thức/đề minh họa/thông báo của Sở GD&ĐT Hà Nội, Sở GD&ĐT Hải Phòng bằng WebSearch/WebFetch, ghi **nguồn + năm** vào `docs/exam-spec.md`.
- Chưa kiểm chứng được → ghi `TODO-VERIFY`, không hiển thị cho học sinh như sự thật.
- Cấu hình mock exam đặt trong `config/exam_profiles.json` (profile `hanoi`, `haiphong`), không hard-code trong code.

## 5. Dữ liệu hiện có (`Data ban dau/`) — chỉ đọc, không sửa
- `bao-cao-ky-thuat-*.md`: báo cáo kiến trúc, 12 chủ điểm, schema DB, JSON schema câu hỏi. Là **nguồn tham chiếu thiết kế**, kèm tag `[cite: n]` không đưa vào sản phẩm.
- `ng_n_h_ng_200_c_u_h_i_...tenses.md`: 200 câu mẫu chủ điểm Tenses (100 MCQ / 70 điền từ / 30 nối).
- `tr_nh_kh_i_t_o_...py`: script **sinh câu hỏi theo template** cho 12 chủ điểm (~2400 câu).

**Cảnh báo chất lượng:** câu sinh từ template dễ trùng cấu trúc, ngữ cảnh gượng, đại từ sai (vd. chủ ngữ "Lan" nhưng thay bằng "he"), nhiều đáp án cùng đúng. **Không coi là đã duyệt.** Mọi câu phải qua skill `question-bank-qa` trước khi đưa vào `data_bank/`. Ưu tiên chất lượng hơn đủ 2400 câu.

## 6. Kiến trúc & tech stack (mặc định, đổi phải ghi lý do vào `docs/decisions.md`)
- **Giai đoạn 1 (MVP, không backend):** web tĩnh — Vite + vanilla JS/TypeScript (hoặc React nếu cần), CSS tự viết theo design token; dữ liệu là JSON tĩnh; tiến độ & sổ lỗi sai lưu `localStorage` (có export/import JSON để không mất dữ liệu).
- **Giai đoạn 2 (khi cần tài khoản, giáo viên xem tiến độ):** Supabase (PostgreSQL + Auth) theo schema ở báo cáo mục 4; import JSON → DB bằng script.
- Không thêm framework/thư viện nặng khi vanilla làm được. Không dùng CDN không rõ nguồn. Trang phải chạy được trên điện thoại 3G/cũ.
- Pipeline dữ liệu (Python 3.11+): `tools/` — validate, dedupe, export. Thu thập dữ liệu web chỉ từ nguồn công khai, tôn trọng bản quyền (không sao chép nguyên văn đề/lời giải có bản quyền; tự viết lại hoặc ghi nguồn + xin phép).

### Cấu trúc thư mục chuẩn
```
CLAUDE.md
.claude/skills/          # skill của dự án
Data ban dau/            # dữ liệu gốc, chỉ đọc
data_bank/
  json/topic_XX_<slug>.json      # câu hỏi đã duyệt
  lessons/topic_XX_<slug>.json   # bài lý thuyết
  media/{images,videos}/
  review/                        # câu chờ duyệt / bị loại + lý do
config/exam_profiles.json
docs/{exam-spec.md,decisions.md,content-style.md}
tools/                   # validate_questions.py, dedupe, export...
app/                     # mã nguồn web
```

## 7. Quy tắc sư phạm bắt buộc trong sản phẩm
1. **Vòng phản hồi tức thì:** chọn đáp án → đổi xanh/đỏ ngay, **khóa** nút còn lại, hiện lời giải.
2. **Học → Luyện → Kiểm tra bài → Ôn gộp**: lý thuyết micro (≤ 5 phút/bài) rồi luyện ngay. **Mastery:** bài "đạt" khi đúng ≥ 80% (ngưỡng cấu hình được); chưa đạt → quay lại lý thuyết/luyện thêm, không mở khóa bài sau bắt buộc nhưng cảnh báo. Bài test đầu vào theo chủ điểm → bản đồ điểm yếu → gợi ý lộ trình. Kiểm tra tổng hợp sau 3–4 bài là *ôn gộp* các chủ điểm đã học, không mô phỏng áp lực đề thi.
3. **Sổ tay lỗi sai** tự ghi câu sai, cho làm lại có lặp cách quãng (spaced repetition đơn giản: sai → quay lại sau 1 ngày / 3 ngày / 7 ngày).
4. **Gợi ý (hint)** là từ khóa/công thức, không lộ đáp án.
5. (Tùy chọn, ưu tiên thấp) Mock exam theo `exam_profiles.json`; mặc định bài kiểm tra tổng hợp có thể bấm giờ nhẹ, không bắt buộc 40/50 câu hay 60 phút.
6. Gamification nhẹ (XP, chuỗi ngày) — không gây áp lực, không bảng xếp hạng công khai tên thật.
7. Đáp án xáo trộn thứ tự khi làm lại; không lộ đáp án qua DOM/URL ở bản dành cho học sinh nếu có chế độ thi.

## 8. Quy tắc code
- Tách dữ liệu / logic chấm / giao diện. Hàm chấm điểm là hàm thuần có unit test.
- Mã chủ điểm, id câu hỏi (`Q_<TOPIC>_<NNN>`), tên file: ASCII, không dấu.
- Truy cập được (a11y): tương phản WCAG AA, điều hướng bàn phím, không chỉ dùng màu để báo đúng/sai (kèm icon ✓/✗ và chữ).
- Quyền riêng tư học sinh là trẻ vị thành niên: tối thiểu dữ liệu cá nhân, không theo dõi bên thứ ba, không quảng cáo.
- Thay đổi UI: dùng skill `professional-web-ui`; xác minh bằng preview trên desktop (1280px và 1920px; thu nhỏ cửa sổ ~1024px vẫn dùng được).
- Nguồn học liệu: ưu tiên **tự soạn/viết lại**; video chỉ nhúng link; không cào hàng loạt Facebook/YouTube/web thương mại; ghi nguồn trong `source`. Danh mục chủ điểm/sub-skill lưu ở `docs/curriculum-map.md` kèm nguồn tham chiếu.

## 9. Skill của dự án (gọi khi phù hợp)
| Skill | Dùng khi |
|---|---|
| `grammar-question-author` | Viết/sinh/sửa câu hỏi theo chủ điểm |
| `question-bank-qa` | Kiểm định, lọc trùng, sửa lỗi ngân hàng câu hỏi; chạy validator |
| `lesson-content-designer` | Soạn bài lý thuyết micro-learning, flashcard, bảng so sánh |
| `exam-profile-hn-hp` | (Tùy chọn) đối chiếu đề Hà Nội/Hải Phòng để bổ sung chủ điểm; mock exam |
| `webapp-delivery` | Lập kế hoạch & triển khai tính năng web, schema DB, kiểm thử, definition of done |

## 10. Cách làm việc với tôi
- **QUY TẮC HỎI LẠI (bắt buộc):** bất cứ khi nào có điều chưa rõ liên quan đến lựa chọn của phụ huynh (phạm vi, ưu tiên, phong cách, nguồn, số lượng, định dạng…), **hỏi ngay bằng AskUserQuestion, không tự suy luận hay chọn thay**. Chỉ tự quyết khi phụ huynh nói rõ "bạn tự quyết".
- Trả lời bằng **tiếng Việt**, ngắn gọn; code/comment/tên biến bằng tiếng Anh.
- Việc lớn: đề xuất kế hoạch ngắn rồi làm; quyết định kỹ thuật có đánh đổi thì nêu 1 khuyến nghị, không liệt kê dài.
- Không xóa/ghi đè dữ liệu trong `Data ban dau/` và `data_bank/json/` nếu chưa sao lưu hoặc chưa được đồng ý.
- Mọi thay đổi nội dung câu hỏi phải chạy `tools/validate_questions.py` và báo kết quả thật (kể cả khi lỗi).
- Nói rõ cái gì **đã kiểm chứng**, cái gì **chưa** (đặc biệt số liệu đề thi và đáp án ngữ pháp).

## 11. Definition of Done
- Câu hỏi: qua validator, 1 đáp án đúng duy nhất, lời giải đúng & ngắn, đúng chủ điểm/mức độ, không trùng.
- Tính năng web: chạy tốt trên desktop, có trạng thái rỗng/lỗi, a11y cơ bản, phím tắt, không lỗi console, logic chấm có test.
- Số liệu đề thi Hà Nội/Hải Phòng (nếu dùng): có nguồn + năm.
