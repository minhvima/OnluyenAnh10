# Bài kiểm tra tổng thể cuối mỗi giai đoạn

Mục đích: kiểm tra em đã **nắm chắc** cả giai đoạn chưa, chỉ ra phần còn yếu để học lại, và cho làm lại nhiều lần. Đây là *ôn gộp có tính giờ nhẹ*, không mô phỏng áp lực đề thi (CLAUDE.md §7).

## 1. Mở khóa
- Bài kiểm tra của một giai đoạn chỉ **mở khi mỗi bài trong giai đoạn đã được luyện ít nhất 1 lần** (có một lượt làm 10 câu, điểm bao nhiêu cũng được). PO chọn điều kiện này (thay vì "đạt 80%") để em không bị kẹt ở một bài khó; bài kiểm tra sẽ chỉ ra bài nào còn yếu.
- Chưa mở: nút bị vô hiệu, kèm số bài đã luyện và danh sách bài còn thiếu (bấm vào được).
- Nếu em đang làm dở một bài kiểm tra thì vẫn vào tiếp được.

## 2. Số câu, thời gian, điểm đạt (do Team quyết, lý do bên dưới)
| Giai đoạn | Số bài | Số câu | Thời gian | Điểm đạt |
|---|---|---|---|---|
| 1 Nền tảng (Tenses, Sentence Structures, Modals) | 30 | 30 | 30 phút | 7/10 |
| 2 Mở rộng (5 chủ điểm) | 50 | 40 | 40 phút | 7/10 |
| 3 Biến đổi câu (5 chủ điểm) | 50 | 40 | 40 phút | 7/10 |
| 4 Hoàn thiện (Cụm động từ & collocation, PO chọn) | 10 | 20 | 20 phút | 7/10 |

Quy tắc: **số câu = số bài**, kẹp trong khoảng 20–40; **1 phút mỗi câu**.
- *Tối thiểu 20 câu:* ít hơn thì điểm dao động quá nhiều (1 câu = 5 điểm phần trăm trở lên), nên giai đoạn 4 (10 bài) hỏi 2 câu mỗi bài.
- *Tối đa 40 câu / 40 phút:* quá khoảng 40 phút em 14–15 tuổi mệt, điểm phản ánh sự mệt hơn là kiến thức; cũng hợp với quỹ thời gian học 30–45 phút/ngày. Giai đoạn 2–3 có 50 bài nên mỗi lần bỏ qua 10 bài (xem mục 3).
- *1 phút/câu:* câu ngữ pháp trắc nghiệm hoặc điền từ cần khoảng 30–60 giây; rộng hơn mức đó để không tạo áp lực.
- *Điểm đạt 7/10:* bài kiểm tra gộp nhiều chủ điểm xen kẽ nên khó hơn một bài lẻ (ngưỡng bài lẻ là 80% vì câu quen và làm ngay sau khi học). 70% cho thấy nắm vững phần lớn mà không đòi hỏi hoàn hảo; dưới 5/10 coi là cần học lại hẳn.
- Ngưỡng và số liệu nằm ở `app/src/phase-test.ts` (`PASS_SCORE`, `MIN_QUESTIONS`, `MAX_QUESTIONS`, `SECONDS_PER_QUESTION`), đổi một chỗ là áp dụng toàn bộ.

## 3. Cách chọn câu
- Lấy **ngẫu nhiên từ ngân hàng câu hỏi của chính các bài trong giai đoạn** (nối bài với câu bằng thẻ `practice_tags`).
- Chia đều cho các chủ điểm theo số bài; trong mỗi chủ điểm hỏi đều các bài.
- Khi phải bỏ bài (giai đoạn 2, 3): **ưu tiên hỏi các bài em chưa đạt**, rồi các bài ít được hỏi ở lần trước. Nhờ vậy sau **hai lần làm liên tiếp, mọi bài đều đã được hỏi** (có test).
- Lần làm lại **tránh các câu đã gặp ở hai lần gần nhất**; chỉ lặp lại khi ngân hàng không còn câu mới.
- Giữ tỉ lệ mức nhận thức ~50% Nhận biết / 30% Thông hiểu / 20% Vận dụng; trộn lẫn các chủ điểm (không xếp từng khối) để em phải tự nhận ra dạng bài.
- Đủ 6 dạng câu như khi luyện. Tra từ (T) vẫn dùng được trong lúc làm.

## 4. Lúc làm bài
- Một câu mỗi màn hình, vừa khung (đã đo ở 1024×640, 1280×720, 1366×650, 1920×1080); thanh số câu cho biết câu nào đã trả lời.
- **Không hiện đúng/sai trong lúc làm**; được quay lại sửa đáp án; bấm "Nộp bài" có hỏi lại nếu còn câu trống (câu trống tính là chưa đúng).
- Đồng hồ đếm ngược theo **giờ thật** (hết hạn tính từ lúc bắt đầu), nên chuyển tab, tải lại trang hay để máy ngủ không cho thêm giờ và **không mất bài**; hết giờ thì **tự nộp**. Còn 5 phút và 1 phút có báo nhẹ.
- Tiến trình lưu trong trình duyệt (24 giờ); mở lại sẽ tiếp tục đúng câu và đồng hồ.

## 5. Kết quả và nhận xét
- Điểm thang 10 (1 chữ số thập phân) = đúng/tổng × 10; đạt khi ≥ 7.0.
- **Lời động viên theo mức điểm** (không phán xét): ≥ 9 "Xuất sắc!", ≥ 8 "Rất tốt!", đạt "Đạt rồi, giỏi lắm!", 5–6.9 "Gần đạt rồi, cố thêm chút nữa nhé!", < 5 "Không sao, bài này giúp em biết cần ôn gì". Kèm so sánh với lần trước (tăng/giảm/bằng).
- **Phần yếu dù đã đạt:** chủ điểm đúng dưới 60% được đánh dấu "Cần ôn"; liệt kê tối đa 5 **bài nên học lại** (suy ra từ các câu sai và thẻ của bài, có liên kết bấm vào học ngay), kèm lời khuyên "học lại các bài này rồi làm lại bài kiểm tra". Chưa đạt thì lời khuyên tương tự; không có bài yếu thì nói em vững cả giai đoạn.
- Xem lại từng câu: đáp án em chọn, đáp án đúng, lý do vì sao chưa đúng (nếu đã có) và lời giải.

## 6. Lịch sử các lần làm
- Mỗi lần làm được lưu vào bảng `phase_test_runs` (cần chạy `db/migrations/2026-11-04_phase_tests.sql` một lần): thời điểm nộp, thời gian đã làm, điểm, đạt/chưa, nhận xét ngắn, điểm từng chủ điểm, các bài yếu, và các câu đã hỏi (để lần sau tránh trùng).
- Trang "Bài kiểm tra Giai đoạn N" hiện danh sách các lần (mới nhất trước); bấm vào một lần để đọc lại lời nhận xét và lời khuyên của lần đó. Trang chủ hiện điểm cao nhất và số lần làm.
- Nếu bảng chưa có, app vẫn chạy: làm bài được nhưng báo "chưa lưu được lịch sử".
- Phụ huynh (admin) đọc được toàn bộ lịch sử (RLS); màn hình theo dõi dành cho phụ huynh sẽ làm ở Sprint sau.

## 7. Chưa làm / hạn chế
- Mới kiểm tra bằng bản xem thử với dữ liệu giả lập, chưa thử với Supabase thật.
- Phản hồi "vì sao sai" đã soạn cho cả 14 chủ điểm (7022 lý do, mỗi lý do qua một lượt soạn và một lượt kiểm chứng độc lập). Câu nào chưa có lý do (ví dụ dạng nối) thì phần xem lại không hiện dòng đó. Chưa có giáo viên duyệt.
- Xem lại *từng câu* chỉ có ngay sau khi nộp; trong lịch sử chỉ lưu nhận xét và bài yếu (không lưu nội dung từng câu).
