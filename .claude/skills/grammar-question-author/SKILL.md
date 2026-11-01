---
name: grammar-question-author
description: Viết, sinh hoặc sửa câu hỏi ngữ pháp/từ vựng ôn thi vào 10 môn Tiếng Anh (GDPT 2018, Hà Nội & Hải Phòng) theo 12 chủ điểm, đúng schema JSON của dự án, có lời giải tiếng Việt. Dùng khi cần tạo thêm câu hỏi, viết lại câu template gượng, hoặc mở rộng dạng bài.
---

# Viết câu hỏi ngữ pháp thi vào 10

## Trước khi viết
1. Xác định `topic_code` (xem CLAUDE.md §3), mức `cognitive_level`, `question_type`, số lượng.
2. Đọc 5–10 câu mẫu cùng chủ điểm trong `Data ban dau/` và/hoặc `data_bank/json/` để giữ giọng văn, tránh trùng.
3. Nếu bám đề Hà Nội/Hải Phòng: xem `docs/exam-spec.md` / skill `exam-profile-hn-hp`.

## Schema (mỗi câu một object)
```json
{
  "question_id": "Q_PASSIVE_VOICE_042",
  "topic_code": "PASSIVE_VOICE",
  "cognitive_level": "Recognition | Comprehension | Application",
  "question_type": "multiple_choice | fill_in_blank | matching",
  "prompt": "This house ______ by my grandfather in 1990.",
  "options": [{"id":"A","text":"built"},{"id":"B","text":"was built"},{"id":"C","text":"is built"},{"id":"D","text":"has built"}],
  "correct_answer": "B",
  "accepted_answers": [],
  "hint": "Dấu hiệu thời gian + chủ ngữ là vật",
  "explanation": "…",
  "media": null,
  "tags": ["passive_voice","past_simple","grade_9"],
  "source": "original | adapted:<nguồn> | template-reviewed",
  "status": "draft | reviewed | approved"
}
```
- `fill_in_blank`: `options` = `[]`; `correct_answer` là chuỗi chuẩn; `accepted_answers` liệt kê biến thể đúng (rút gọn, `isn't` / `is not`).
- `error_identification`: prompt có 4 phần đánh dấu `<u>(A)…</u>`…`(D)`; options A–D là 4 phần đó; đúng 1 phần sai; lời giải nêu lỗi và cách sửa.
- `sentence_transformation`: prompt là câu gốc; 4 phương án là câu viết lại, **chỉ 1 câu giữ nguyên nghĩa và đúng ngữ pháp**.
- `sentence_combination`: prompt là 2 câu đơn; 4 phương án là câu nối; sai ở liên từ/mệnh đề quan hệ/thì hoặc đổi nghĩa.
- Chủ điểm hợp lệ gồm cả `SENTENCE_STRUCTURES`, `MODALS_QUANTIFIERS`, `COMMUNICATION` (xem `docs/curriculum-map.md`).
- `matching`: `options` = mảng `{left,right}`, `correct_answer` mô tả cặp; mỗi cặp phải **ghép duy nhất**.
- Id: `Q_<TOPIC_CODE>_<3 chữ số>`; không tái sử dụng id.

## Quy tắc chất lượng (bắt buộc)
- **Chỉ một đáp án đúng.** Tự kiểm: thử từng phương án vào câu; nếu hai phương án cùng đúng → sửa.
- Nhiễu (distractor) phải **hợp lý** – đại diện lỗi học sinh hay mắc (nhầm thì, quên chia, sai dạng V), không vô nghĩa, không dài/ngắn lộ đáp án.
- Vị trí đáp án đúng **phân bố đều** A/B/C/D trên cả bộ.
- Từ vựng & ngữ cảnh trong tầm SGK Global Success 6–9 (trường học, du lịch Việt Nam, môi trường, công nghệ, lễ hội, sức khỏe…). Không từ quá khó làm lệch trọng tâm ngữ pháp.
- Một câu kiểm **một** điểm ngữ pháp chính (trừ mức Vận dụng).
- Chủ ngữ – đại từ nhất quán (Lan → she, Mr. Nam → he). Tên riêng và địa danh dùng chuẩn.
- Câu tự nhiên như người bản ngữ viết; tránh lặp mẫu "[subject] + [place] + [year]" liên tục — đa dạng ngữ cảnh.
- Không sao chép nguyên văn đề thi/sách có bản quyền; viết lại ngữ cảnh, giữ điểm ngữ pháp.
- Mức độ: Recognition = dấu hiệu rõ, 1 bước; Comprehension = suy từ ngữ cảnh, 2 bước; Application = kết hợp 2 điểm ngữ pháp hoặc biến đổi câu.

## Lời giải (tiếng Việt, ≤ 3 câu)
Mẫu: `Dấu hiệu: "…" → dùng <cấu trúc>: <công thức> → chọn <đáp án>.`
Có thể thêm 1 dòng "Vì sao các đáp án còn lại sai" cho câu Vận dụng.

## Quy trình sinh hàng loạt
1. Lập bảng **sub-skill** của chủ điểm (vd. TENSES: HTĐ-thói quen, HTTD-"now/Look!", HTHT-since/for, QKĐ-yesterday/ago, QKTD-while/when, QKHT-by the time, TLĐ-promise/predict, Tương lai gần-căn cứ). Phân bổ số câu đều cho các sub-skill, gắn vào `tags`.
2. Viết theo lô ≤ 20 câu, tự rà từng câu theo checklist trên.
3. Lưu vào `data_bank/review/` với `status: draft`; chạy `python tools/validate_questions.py <file>`; sửa đến khi sạch; rồi chuyển qua skill `question-bank-qa` để duyệt trước khi vào `data_bank/json/`.

## Đầu ra
Báo cáo ngắn: số câu tạo, phân bố mức độ/dạng/đáp án A-D, số câu tự đánh dấu còn nghi ngờ (cần giáo viên duyệt).
