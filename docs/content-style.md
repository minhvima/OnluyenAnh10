# Quy ước nội dung (đã được phụ huynh chốt 2026-11-01)

## Quyết định của phụ huynh
- **Cách làm:** song song theo lô 3–4 chủ điểm; mỗi chủ điểm gồm bài lý thuyết + ngân hàng ≥ 200 câu.
- **Lô 1:** Tenses → Modals & Quantifiers → Comparisons → Prepositions & Conjunctions (theo thứ tự trong `curriculum-map.md`). Làm lần lượt từng chủ điểm, mỗi chủ điểm dừng để phụ huynh xem.
- **Phong cách bài giảng:** *kể chuyện theo tình huống* — mỗi bài mở bằng một tình huống/đoạn truyện ngắn, rồi mới rút ra công thức.
- **Video:** chỉ nhúng link YouTube chọn lọc (không tải về). Tôi tìm ứng viên, phụ huynh duyệt trước khi nhúng. Chưa duyệt thì `video.embed_url = null`.
- **Dạng câu:** bám dạng đề trắc nghiệm. Bỏ dạng Yes/No. Không có dạng True/False.
- **Bài kiểm tra:** 15–20 câu rút ngẫu nhiên từ ngân hàng của chủ điểm.

## Ngân hàng 200 câu / chủ điểm
| Dạng | Số câu | Ghi chú |
|---|---|---|
| `multiple_choice` | 100 | Chọn từ/cụm hoàn thành câu |
| `fill_in_blank` | 40 | Điền/chia dạng từ trong ngoặc |
| `error_identification` | 20 | Tìm 1 phần sai trong 4 phần gạch chân |
| `sentence_transformation` + `sentence_combination` | 20 | Chọn câu cùng nghĩa / kết hợp đúng nhất |
| `matching` | 20 | Mỗi câu 4 cặp |
Mức độ: ~50% Recognition, ~30% Comprehension, ~20% Application. Chủ điểm nào không hợp một dạng (vd. word forms với matching) thì điều chỉnh số lượng và **báo lại phụ huynh**.
Mỗi sub-skill ~ 1/10 số câu (Tenses: 10 sub-skill × 20 câu).

## Nhân vật & bối cảnh dùng lặp lại (để truyện có tính liên tục)
Minh, Lan, Nam, Hoa, Mai; thầy Hùng, cô Mai; mèo Mướp. Địa điểm: Hải Phòng (Đồ Sơn, Cát Bà), Hà Nội, trường THCS. Không dùng tên thật của con trai phụ huynh.

## Cấu trúc 1 bài (kể chuyện)
1. **Tình huống** (4–6 câu, có thoại ngắn tiếng Anh, kèm nghĩa tiếng Việt)
2. **Điều gì vừa xảy ra?** (rút nhận xét từ truyện)
3. **Công thức** (bảng +, −, ?)
4. **Dấu hiệu nhận biết**
5. **Lỗi hay gặp** (sai → đúng → vì sao)
6. **Mẹo nhớ**
7. **Thẻ ghi nhớ** (flashcard)
8. Chuyển sang bài luyện cùng sub-skill

## Lưu trữ
- Bài học: `data_bank/lessons/topic_XX_<slug>.json`
- Câu hỏi nháp: `data_bank/review/topic_XX_<slug>.json` (`status: draft`) → qua rà soát → `data_bank/json/`
- Video ứng viên: `docs/video-candidates.md`
