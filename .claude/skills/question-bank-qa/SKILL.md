---
name: question-bank-qa
description: Kiểm định chất lượng ngân hàng câu hỏi ôn thi vào 10 — chạy validator schema, lọc trùng, phát hiện đáp án sai/đa đáp án, đại từ sai, câu template gượng; phân loại duyệt/loại. Dùng trước khi đưa câu hỏi vào data_bank/json hoặc import DB, và khi rà file sinh từ script template.
---

# QA ngân hàng câu hỏi

## Công cụ
Chạy validator (có sẵn trong skill, sao chép vào `tools/` nếu chưa có):
```bash
python .claude/skills/question-bank-qa/validate_questions.py <file_or_dir.json> [--strict]
```
Kiểm: trường bắt buộc, `topic_code`/`cognitive_level`/`question_type` hợp lệ, id duy nhất, MCQ đúng 4 phương án A–D & `correct_answer` thuộc phương án, không phương án trùng, fill_in_blank có đáp án, matching có cặp, lời giải không rỗng, prompt trùng/gần trùng, phân bố A–D, tỷ lệ mức độ & dạng.
Exit code ≠ 0 nếu có lỗi nghiêm trọng.

## Quy trình duyệt (3 lớp)
1. **Máy:** validator → sửa lỗi cấu trúc.
2. **Quy tắc ngữ pháp (Claude rà):** với mỗi câu, tự giải độc lập *không nhìn đáp án*, rồi so với `correct_answer`. Đánh dấu khi:
   - ≥ 2 phương án cùng đúng, hoặc không phương án nào đúng;
   - lời giải mâu thuẫn đáp án;
   - đại từ/chủ ngữ lệch (Lan → he), số ít/số nhiều lệch, mạo từ sai;
   - ngữ cảnh phi thực tế/gượng (vd. "Tourists visited Hue by …" lặp mẫu);
   - lệch chủ điểm hoặc mức độ ghi nhãn;
   - từ vựng ngoài SGK THCS làm khó không cần thiết.
3. **Người:** câu nghi ngờ xuất ra `data_bank/review/needs_teacher.md` (id, vấn đề, đề xuất sửa) để giáo viên duyệt.

## Đặc biệt với dữ liệu sinh bằng template (`Data ban dau/*.py`)
- Coi là **bản nháp**. Đo "độ đa dạng": số prompt khác nhau theo khung (thay các slot subject/place/year ra `{}` rồi đếm khung duy nhất). Khung lặp > 20% của một chủ điểm → báo và yêu cầu viết thêm bằng skill `grammar-question-author`.
- Kiểm riêng dạng matching: cặp phải ghép duy nhất, không trùng giữa các câu.
- Kiểm riêng chủ điểm có điểm bẫy: câu điều kiện (loại 2 dùng *were*), tường thuật (lùi thì, đổi trạng từ), câu ước, mệnh đề quan hệ (that/who/which, dấu phẩy).

## Lọc trùng
- Chuẩn hóa: lowercase, bỏ dấu câu, thay tên riêng/địa danh/năm bằng token, so sánh Jaccard 3-gram hoặc TF-IDF cosine; ≥ 0.90 → trùng (giữ câu có lời giải tốt hơn), 0.75–0.90 → cảnh báo.

## Kết quả đầu ra
- `data_bank/json/topic_XX_<slug>.json`: chỉ câu `status: approved`.
- `data_bank/review/rejected.json`: câu loại + `reject_reason`.
- Báo cáo (markdown) gồm: tổng/duyệt/loại/cần giáo viên; phân bố mức độ, dạng, A–D; chủ điểm còn thiếu so với mục tiêu. **Báo số liệu thật, không làm tròn đẹp.**

## Nguyên tắc
- Không tự "sửa cho qua": nếu không chắc đáp án, đánh dấu cần giáo viên.
- Không ghi đè file nguồn; ghi ra file mới và ghi lại thay đổi.
