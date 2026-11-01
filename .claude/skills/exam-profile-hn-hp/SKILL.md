---
name: exam-profile-hn-hp
description: Tra cứu, kiểm chứng và cấu hình cấu trúc đề thi vào lớp 10 môn Tiếng Anh của Hà Nội và Hải Phòng (số câu, thời gian, dạng bài, ma trận mức độ, điểm), rồi dựng mock exam theo từng địa phương. Dùng khi cần số liệu đề thi, tạo exam_profiles.json, hoặc lắp bài thi thử.
---

# Hồ sơ đề thi Hà Nội & Hải Phòng

> **Ưu tiên thấp.** App tập trung lấp lỗ hổng ngữ pháp theo chủ điểm, không luyện đề. Dùng skill này chỉ để (a) đối chiếu đề thật xem còn chủ điểm/dạng bài nào thiếu trong `docs/curriculum-map.md`, (b) làm mock exam tùy chọn. Tra sơ bộ 11/2026: Hà Nội 2026 ≈ 40 câu trắc nghiệm/60 phút (chưa đối chiếu văn bản Sở); Hải Phòng chưa có nguồn.

## Nguyên tắc cốt lõi
**Không dùng số liệu từ trí nhớ.** Đề thi mỗi năm có thể đổi (số câu, hình thức, thang điểm, có/không bài nghe). Báo cáo trong `Data ban dau/` chỉ nêu mô hình chung (50 câu/60 phút/50-30-20) và chưa xác nhận theo địa phương.

## Quy trình kiểm chứng
1. Tìm bằng WebSearch/WebFetch, ưu tiên theo thứ tự: thông báo/đề minh họa/đề chính thức của **Sở GD&ĐT Hà Nội**, **Sở GD&ĐT Hải Phòng**; Bộ GD&ĐT; báo chính thống (VnExpress, Tuổi Trẻ, Thanh Niên, Dân Trí, báo địa phương) phân tích đề; sau cùng mới tới trung tâm luyện thi.
2. Lấy **ít nhất 2 năm gần nhất** (năm học hiện tại và năm trước) cho mỗi địa phương. Ghi: thời gian làm bài, tổng số câu, các phần (ngữ âm, từ vựng-ngữ pháp, chức năng giao tiếp, đọc điền từ, đọc hiểu, viết lại câu…), số câu/phần, thang điểm, có nghe hay không.
3. Ghi vào `docs/exam-spec.md` theo mẫu bảng: *Địa phương | Năm | Mục | Giá trị | Nguồn (URL) | Ngày tra cứu | Độ tin cậy (chính thức/báo/trung tâm)*. Mâu thuẫn giữa nguồn → ghi cả hai, ưu tiên nguồn chính thức.
4. Không chắc → `TODO-VERIFY`, hỏi người dùng nếu họ có đề/thông báo của trường/giáo viên.

## Cấu hình máy đọc: `config/exam_profiles.json`
```json
{
  "profiles": {
    "hanoi":   {"label":"Hà Nội", "verified_year": null, "duration_minutes": null,
                "sections":[{"id":"grammar_vocab","topics":["TENSES","..."],"count":null,"points":null}],
                "level_ratio":{"Recognition":null,"Comprehension":null,"Application":null},
                "sources":[]},
    "haiphong":{"label":"Hải Phòng", "verified_year": null, "duration_minutes": null, "sections":[], "level_ratio":{}, "sources":[]}
  },
  "default_practice": {"duration_minutes": 60, "questions": 50, "level_ratio":{"Recognition":0.5,"Comprehension":0.3,"Application":0.2},
                       "note":"Mô hình chung, KHÔNG phải đề chính thức"}
}
```
Giá trị `null` = chưa kiểm chứng; app phải hiển thị nhãn "đề luyện tập chung" cho đến khi profile được kiểm chứng.

## Dựng mock exam
- Đầu vào: profile, ngân hàng `data_bank/json`, lịch sử học sinh (loại câu vừa làm).
- Thuật toán: với mỗi section → chọn câu theo `topics` và `level_ratio` (làm tròn bằng largest-remainder để tổng khớp), cân bằng đáp án A–D, trộn thứ tự, không lặp câu trong một đề, `seed` để tái lập.
- Thiếu câu ở một ô (topic × level) → báo rõ ô thiếu thay vì lấp tạm bằng câu sai level.
- Chấm: trả điểm tổng, điểm theo chủ điểm, theo mức độ, danh sách câu sai → đẩy vào Sổ tay lỗi sai, đề xuất 3 bài học yếu nhất.
- Kèm ghi chú thực tế cho học sinh: đối chiếu dạng đề địa phương nhưng khuyến khích luyện đủ 12 chủ điểm.

## Phân tích xu hướng (tùy chọn)
Tổng hợp 3–5 năm đề thật: tần suất từng chủ điểm → cập nhật trọng số ưu tiên ôn tập; chỉ dùng số liệu có nguồn.
