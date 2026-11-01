# Đề xuất thiết kế giao diện học sinh (Sprint 2) — CHỜ PO DUYỆT

Mockup xem được: `docs/mockups/learn-screen.html` (mở bằng trình duyệt; bấm một đáp án hoặc phím A–D để xem phản hồi).

## 1. Tình trạng skill tham chiếu
- `ui-ux-pro-max`: **available** (v2.15.0), đã chạy truy vấn thiết kế cho "ứng dụng giáo dục, vui, thân thiện".
- Áp dụng từ skill: phong cách **Claymorphism** (khối mềm, viền dày 3px, bo 16–24px, bóng kép), palette indigo + cam, chuyển động nhẹ 150–300ms, tôn trọng `prefers-reduced-motion`, tránh dark mode cho sản phẩm này, icon SVG thay emoji, focus nhìn thấy rõ, tương phản chữ ≥ 4.5:1.
- **Không áp dụng / điều chỉnh** (lý do):
  - Font **Comic Neue**: không có chữ có dấu tiếng Việt → thay bằng **Nunito** (thân chữ), giữ **Baloo 2** cho tiêu đề (hỗ trợ tiếng Việt).
  - Nạp font qua **Google Fonts CDN**: bỏ, vì gửi địa chỉ IP của trẻ vị thành niên cho bên thứ ba và trái CLAUDE.md. Thay bằng font tự lưu trong app (gói `@fontsource/baloo-2`, `@fontsource/nunito`, tập ký tự Latin + Việt).
  - Mẫu trang "Feature-Rich Showcase": bỏ (dành cho trang quảng cáo, không phải ứng dụng học).
  - Mockup đang dùng emoji 🔥⭐ cho chuỗi ngày/XP; bản thật dùng **icon SVG**.

## 2. Design tokens
| Nhóm | Giá trị |
|---|---|
| Primary | `#4F46E5` (chữ trắng trên nền này đạt 6.3:1) |
| Accent / nút chính | `#C2410C` nền, chữ trắng (5.18:1). Bản đầu dùng `#EA580C` chỉ đạt 3.56:1 nên đã đổi |
| Nền | `#EEF2FF`; thẻ `#FFFFFF`; viền `#C7D2FE` |
| Chữ | `#1E1B4B`; chữ phụ `#475569` |
| Đúng | `#0F7B4A` trên nền `#DCFCE7` |
| Sai | `#B42318` trên nền `#FEE2E2` (mềm, không dùng đỏ chói) |
| Nhấn focus | `#FBBF24`, viền 4px |
| Bo góc | 20px (thẻ), 14px (nút lựa chọn), pill (nút chính) |
| Bóng | `0 4px 0` màu viền + bóng mờ (cảm giác nút nổi, ấn xuống) |
| Chữ | Tiêu đề Baloo 2; thân Nunito; cỡ thân 17px, dòng 1.55 |
| Khung | tối thiểu 1024px, rộng tối đa ~1360px; 2 cột (lý thuyết : bài tập = 5 : 6); dưới 900px xếp 1 cột |

## 3. Màn hình Sprint 2
1. **Trang chủ — bản đồ chủ điểm:** 14 chủ điểm theo lộ trình, trạng thái từng bài (chưa học / đang học / đạt ≥ 80%).
2. **Màn Học + Luyện (mockup):** trái lý thuyết (mục tiêu, truyện ngắn, công thức, dấu hiệu, lỗi hay gặp), phải bài tập từng câu.
3. **Tổng kết bài:** điểm, đạt hay chưa, nút "Luyện thêm" / "Xem lại lý thuyết" / "Bài tiếp theo" (cảnh báo nhẹ nếu chưa đạt, không khóa).
4. **Trạng thái:** đang tải (khung chờ), rỗng (chưa có bài được duyệt), lỗi mạng (thử lại).

## 4. Quy tắc tương tác
- Chọn đáp án → khóa các nút còn lại → đổi màu + icon ✓/✗ + chữ ("Đúng"/"Chưa đúng") → hiện lời giải ≤ 3 câu. Không chỉ dùng màu.
- Giọng điệu không phán xét: sai thì "Chưa đúng, không sao đâu!".
- Phím tắt: A–D / 1–4 chọn, Enter câu tiếp, H gợi ý. Nút có chữ gợi ý phím.
- Đáp án xáo thứ tự mỗi lần; vùng trạng thái dùng `aria-live`.
- Chuyển động nhẹ, tắt hẳn khi người dùng bật "giảm chuyển động".

## 5b. Chỉnh sửa sau nhận xét của PO (v2)
- **Nhiều màu, vui hơn:** mỗi chủ điểm một màu riêng trên trang chủ (`home-map.html`); huy hiệu đáp án A–D bốn màu khác nhau (không dùng xanh lá/đỏ vì dành cho đúng/sai); thanh tiến độ chuyển màu; tiêu đề từng mục lý thuyết có chấm màu.
- **Ví dụ có gắn nhãn thành phần câu:** mỗi từ/cụm có nhãn chữ **S, V, Aux, O, Adj, Adv, Prep, Det** kèm màu riêng, có chú giải. Nhãn chữ luôn hiện nên em khó phân biệt màu vẫn đọc được. Tất cả cặp màu chữ/nền đã tính đạt ≥ 4.5:1.
- **Công thức đủ trường hợp:** mỗi công thức (khẳng định, phủ định, nghi vấn, to be) có sơ đồ S+V+O tô màu và ví dụ gắn nhãn; riêng V(s/es) có bảng 6 trường hợp (đa số, -s/-sh/-ch/-x/-z/-o, phụ âm+y, nguyên âm+y, have→has, chủ ngữ I/you/we/they), mỗi dòng có ví dụ.
- **Thêm ví dụ theo cách dùng:** thói quen, sự thật, lịch trình, có trạng từ tần suất; mỗi câu có nghĩa tiếng Việt.
- **Bố cục giữ nguyên;** thêm cột bài tập "đứng yên" khi cuộn phần lý thuyết dài (để vừa đọc lý thuyết vừa làm bài).
- **Cách báo đúng/sai giữ nguyên.**

### Tra từ bằng cách bấm vào từ (yêu cầu PO, v2.1)
- **Popup** hiện ngay cạnh từ: từ + loại từ, phiên âm **IPA giọng Anh-Anh**, nút nghe đọc (giọng `en-GB` có sẵn trong trình duyệt, **không gọi dịch vụ bên ngoài**), nghĩa tiếng Việt, ví dụ ngắn có dịch. Từ biến đổi (makes, brushes, teeth) chỉ về từ gốc ("dạng của make").
- **Bấm được ở:** lý thuyết và ví dụ, đề bài, lời giải sau khi trả lời. Với **các đáp án A–D**, bấm vào đáp án là để chọn, nên có nút **"Tra từ" (phím T)**: khi bật, bấm từ nào cũng chỉ hiện nghĩa, chưa chọn đáp án; tắt lại thì bấm là chọn như thường.
- **Bàn phím:** Tab đến từ rồi Enter để mở, Esc để đóng (trả lại vị trí cũ).
- **Dữ liệu cần soạn:** từ điển nhỏ khoảng **2600 dạng từ** có trong bài học và câu hỏi (lấy từ dữ liệu hiện có; 500 từ thường gặp nhất phủ ~86% chữ, 1500 từ phủ ~98%). Mỗi từ: từ gốc, loại từ, IPA, nghĩa, ví dụ. Do tôi soạn nên **IPA và nghĩa cần giáo viên xem một mẫu**. Không gọi từ điển trực tuyến để tránh gửi dữ liệu của trẻ cho bên thứ ba.
- Trong mockup chỉ có khoảng 16 từ mẫu; từ khác sẽ báo "chưa có trong từ điển mẫu".

### Độ tương phản chữ tiếng Việt (v2.1)
Các dòng nghĩa tiếng Việt, mục tiêu bài, ví dụ dịch chuyển từ xám sang gần đen (`#0B0B1A`, tương phản 15.8:1 trên nền xanh nhạt); chữ phụ còn lại đậm hơn (`#334155`, 9.2:1).

### Việc kéo theo về dữ liệu (cần PO biết)
Bài học hiện chỉ có công thức và ví dụ dạng chữ thường, **chưa có nhãn thành phần câu**. Để hiển thị như mockup cần bổ sung dữ liệu cho từng bài:
- `examples`: danh sách câu, mỗi câu tách thành các phần `{"t": "Lan", "r": "S"}`, kèm nghĩa tiếng Việt và nhãn cách dùng.
- `formula[].cases`: các trường hợp con (ví dụ bảng V(s/es)) kèm ví dụ.
Tôi sẽ soạn cho **10 bài Tenses trong Sprint 2**; 130 bài còn lại bổ sung dần theo thứ tự lộ trình. Nhãn S/V/O do tôi gắn nên **cần giáo viên xem lại một mẫu** (phân tích thành phần câu dễ có ca tranh luận, ví dụ "at six" là Adv hay Prep + O).

## 5. Cần PO quyết (GATE 1)
1. Duyệt phong cách và bảng màu ở trên (hay muốn chỉnh: nhiều màu hơn, nghiêm túc hơn...).
2. Đồng ý thêm 2 gói phông tự lưu (`@fontsource/baloo-2`, `@fontsource/nunito`); icon vẽ SVG sẵn, không thêm gói.
3. Đồng ý phạm vi Sprint 2 như mục 3 (chủ điểm đầu tiên: Tenses).
