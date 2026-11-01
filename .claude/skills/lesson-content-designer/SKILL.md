---
name: lesson-content-designer
description: Soạn bài lý thuyết ngữ pháp dạng micro-learning cho học sinh lớp 9 bị hổng gốc ôn thi vào 10 — công thức, dấu hiệu nhận biết, ví dụ, lỗi hay gặp, flashcard, bảng so sánh, mẹo nhớ, và kịch bản video ngắn. Dùng khi tạo hoặc sửa nội dung bài học trong data_bank/lessons.
---

# Thiết kế bài học micro-learning

## Nguyên tắc
- Một bài = **một ý ngữ pháp**, đọc/xem ≤ 5 phút, tối đa ~120 từ lý thuyết lõi. Chủ điểm lớn (vd. TENSES) tách thành 8–10 bài.
- Giả định học sinh **mất gốc**: không dùng thuật ngữ khi chưa giải thích; bắt đầu từ ví dụ, rồi mới tới công thức.
- **Phong cách đã chốt: kể chuyện theo tình huống** (xem `docs/content-style.md`): mở bài bằng truyện ngắn 4–6 câu với nhân vật cố định (Minh, Lan, Nam, Hoa, Mai, thầy Hùng…), có thoại tiếng Anh + nghĩa tiếng Việt, rồi mới rút công thức. Video: chỉ nhúng link YouTube đã được phụ huynh duyệt, không tải về.
- Thứ tự cố định: **Tình huống mở đầu → Công thức → Dấu hiệu nhận biết → Ví dụ (đúng/sai) → Lỗi hay gặp → Mẹo nhớ → Tự kiểm tra 3 câu**.
- Đối chiếu bằng bảng khi dễ nhầm (HTĐ vs HTTD; since vs for; if loại 1 vs 2; who vs which).
- Bài kết thúc bằng liên kết tới bộ câu luyện đúng sub-skill (`tags`).
- Ví dụ lấy từ đời sống học sinh Việt Nam (trường lớp, Hải Phòng/Hà Nội, du lịch, game, mạng xã hội), câu ngắn ≤ 12 từ.
- Mọi quy tắc ngữ pháp phải **đúng chuẩn Anh-Anh/Anh-Mỹ phổ thông**; ngoại lệ ghi rõ. Không dạy mẹo sai ("cứ có since là HTHT" mà không điều kiện).

## Cấu trúc JSON bài học (`data_bank/lessons/topic_XX_<slug>.json`)
```json
{
  "lesson_id": "L_TENSES_03",
  "topic_code": "TENSES",
  "order": 3,
  "title": "Hiện tại hoàn thành (Present Perfect)",
  "objective": "Nhận biết và chia đúng HTHT với since/for/already/yet",
  "estimated_minutes": 5,
  "hook": "Câu hỏi/tình huống mở đầu",
  "formula": [{"form":"(+)","pattern":"S + have/has + V3/ed","example":"I have lived here for 5 years."}],
  "signals": ["since","for","already","yet","just","ever","never","How long"],
  "comparison_tables": [{"title":"since vs for","rows":[["since","mốc thời gian","since 2020"],["for","khoảng thời gian","for 3 years"]]}],
  "common_mistakes": [{"wrong":"I have seen him yesterday.","right":"I saw him yesterday.","why":"yesterday = mốc quá khứ xác định → QKĐ"}],
  "mnemonic": "…",
  "flashcards": [{"front":"have/has + ?","back":"V3/ed"}],
  "video": {"embed_url": null, "script_outline": ["…"]},
  "practice_tags": ["present_perfect"],
  "status": "draft"
}
```

## Kịch bản video ngắn (nếu được yêu cầu)
60–150 giây: 0–10s hook → 10–40s công thức bằng hình → 40–90s 3 ví dụ → 90–120s lỗi hay gặp → 120s+ chốt mẹo + "làm thử 5 câu". Ghi rõ nguồn nếu nhúng video bên thứ ba; không nhúng video vi phạm bản quyền.

## Kiểm tra trước khi giao
- Mỗi công thức có ≥ 2 ví dụ đúng + 1 lỗi sai điển hình.
- Không quá 3 bảng/bài; văn bản tiếng Việt tự nhiên, ngắn.
- Sub-skill đã có đủ câu luyện tương ứng trong ngân hàng (nếu thiếu, báo để dùng `grammar-question-author`).
- Phạm vi bám SGK Global Success 6–9 và trọng tâm đề thi vào 10; nếu thêm kiến thức ngoài, đánh dấu "mở rộng".
