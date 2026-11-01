# Bản đồ chủ điểm & sub-skill ngữ pháp (bản nháp B0)

> Trạng thái: **DRAFT — chờ phụ huynh/giáo viên xác nhận.** Lập ngày 2026-11-01.
> Mục đích: làm khung cho bài học, ngân hàng câu hỏi và bài test đầu vào. Mỗi sub-skill = 1 bài học nhỏ + bộ câu luyện gắn `tags`.

## 1. Nguồn và độ tin cậy

| Mã | Nguồn | Dùng cho | Độ tin cậy |
|---|---|---|---|
| S1 | Điểm ngữ pháp theo Unit, *Tiếng Anh 9 Global Success* — https://zim.vn/bai-tap-tieng-anh-lop-9 | Lớp 9 (12 unit) | Trung bình: trang trung tâm, chưa đối chiếu SGK |
| S2 | Như S1 cho lớp 8 — https://zim.vn/bai-tap-tieng-anh-lop-8 | Lớp 8 | Trung bình |
| S3 | Như S1 cho lớp 7 — https://zim.vn/bai-tap-tieng-anh-lop-7 | Lớp 7 | Trung bình |
| S4 | Tổng quan ngữ pháp *Tiếng Anh 6 Global Success* — https://zim.vn/bai-tap-tieng-anh-lop-6 | Lớp 6 (không chia theo unit) | Trung bình |
| S5 | 9 chủ điểm ngữ pháp thi vào 10 — The IELTS Workshop, https://onthiielts.com.vn/ngu-phap-tieng-anh-thi-vao-10/ | Danh mục ôn thi | Trung bình |
| S6 | Báo cáo kỹ thuật nội bộ `Data ban dau/bao-cao-ky-thuat-*.md` (12 chủ điểm, tỷ trọng) | Khung 12 chủ điểm | Thấp–TB: tổng hợp, tỷ trọng chưa kiểm chứng |
| S7 | Thông tư 32/2018/TT-BGDĐT — Chương trình GDPT môn Tiếng Anh (văn bản chính thức) | Chuẩn gốc | Cao, **chưa đọc được**: tải file `.doc` bị lỗi kết nối; cần tải bản PDF chính thức |

| S8 | Cấu trúc đề Hải Phòng (100% trắc nghiệm, 40 câu/60 phút, 0,25đ/câu; 4 ngữ âm + 16 từ vựng-ngữ pháp + 2 tìm lỗi + 10 đọc + 8 viết) do **phụ huynh cung cấp** (2026-11-01), không kèm nguồn/năm | Xác định dạng bài & chủ điểm phải có | Chưa kiểm chứng; dùng làm tham chiếu, ghi `TODO-VERIFY` trong `exam-spec` |

**Hạn chế đã biết:** chưa đối chiếu được văn bản chương trình chính thức (S7) và mục lục SGK gốc; chưa có nguồn riêng của các trung tâm lớn ngoài S5; điểm ngữ pháp lớp 6 chưa chia theo unit. Mọi dòng dưới đây cần được xem là *đề xuất có nguồn*, chưa phải chuẩn cuối.

## 2. Kết luận nhanh

- Khung **12 chủ điểm** hiện tại bao phủ phần lớn các nguồn (S5 liệt kê 9 chủ điểm đều nằm trong 12).
- Nguồn SGK cho thấy còn **3 nhóm kiến thức hay gặp mà 12 chủ điểm chưa có chỗ rõ ràng**: (a) cấu trúc câu (đơn/ghép/phức, mệnh đề trạng ngữ, although/however), (b) động từ khuyết thiếu, used to, lượng từ, (c) câu hỏi và cấu trúc đặc biệt (Yes/No, Wh-, question word + to-V, adj + to-V/that, suggest). → **Đã quyết định thêm chủ điểm 13–15** (mục 4), gộp câu hỏi vào chủ điểm 13 và thêm `COMMUNICATION` ưu tiên thấp theo cấu trúc đề S8.
- Con đang lớp 9: phần lớn chủ điểm "khó" (tường thuật, điều kiện, quan hệ, bị động, ước) xuất hiện lại ở lớp 9, nên bài test đầu vào nên quét từ lớp 6 để tìm **gốc hổng** (thường nằm ở các thì và cấu trúc cơ bản).

## 3. 12 chủ điểm → sub-skill

Cột "Lớp" = nơi kiến thức xuất hiện trong SGK theo S1–S4 (chỉ mang tính tham khảo). Chỗ có ghi `(Uxx)` là lấy từ S1–S4; các giá trị lớp còn lại là **suy luận của tôi, chưa đối chiếu SGK**. Ưu tiên: **P1** nền tảng/tần suất cao, **P2** quan trọng, **P3** mở rộng. Thứ tự học đề xuất đi từ P1.

### 1. TENSES — Các thì (P1)
| Sub-skill | Lớp | Ghi chú |
|---|---|---|
| T1 Hiện tại đơn (thói quen, sự thật, lịch trình) | 6–7 | Gồm trạng từ tần suất |
| T2 Hiện tại tiếp diễn (đang diễn ra, kế hoạch gần) | 6–7 | Look!/Listen!/now |
| T3 So sánh HTĐ vs HTTD, động từ không chia tiếp diễn | 7 | Điểm nhầm phổ biến |
| T4 Quá khứ đơn (động từ thường, bất quy tắc, to be) | 6–7 | Cần bảng động từ bất quy tắc |
| T5 Quá khứ tiếp diễn + when/while | 8 | Hành động song song/xen vào |
| T6 Hiện tại hoàn thành (since/for/already/yet/ever) | 7–8 | Nguồn S5, S6; kiểm tra SGK có đủ không |
| T7 Quá khứ hoàn thành | 9 (U6, U10) | Thứ tự hành động |
| T8 Tương lai đơn (will) vs be going to | 6–8 | Dự đoán, hứa hẹn, quyết định |
| T9 Hiện tại đơn chỉ tương lai (lịch trình) | 8 (U8) | Tàu xe, lịch cố định |
| T10 Phân biệt tổng hợp các thì (dấu hiệu nhận biết) | 9 | Bài ôn gộp |

### 2. PASSIVE_VOICE — Bị động (P1)
| Sub-skill | Lớp |
|---|---|
| P1 Bị động HTĐ, QKĐ | 8–9 |
| P2 Bị động HTHT, tương lai đơn (U11) | 9 |
| P3 Bị động với động từ khuyết thiếu | 9 |
| P4 Bị động không ngôi / động từ chỉ ý kiến (It is said that…) (U5) | 9 |
| P5 Khi nào dùng by + tác nhân; chuyển câu hỏi sang bị động | 9 |

### 3. CONDITIONALS — Câu điều kiện (P1)
| Sub-skill | Lớp |
|---|---|
| C1 Loại 0 và loại 1 (kể cả modal trong mệnh đề chính, U7) | 6–9 |
| C2 Loại 2 (were cho mọi ngôi) (U9) | 9 |
| C3 Unless, as long as, provided that | 9 |
| C4 Phân biệt loại 1 vs 2; viết lại câu | 9 |
| (P3) Loại 3 và hỗn hợp — nguồn S5 có, SGK THCS chưa thấy; để mở rộng | — |

### 4. REPORTED_SPEECH — Tường thuật (P1)
| Sub-skill | Lớp |
|---|---|
| R1 Câu trần thuật: lùi thì, đổi đại từ | 8–9 (U11 lớp 8, U3 lớp 9) |
| R2 Đổi trạng từ thời gian/nơi chốn | 8–9 |
| R3 Câu hỏi Yes/No (if/whether) | 8 |
| R4 Câu hỏi Wh- | 8 |
| R5 Câu mệnh lệnh/yêu cầu (tell/ask + to-V) và động từ tường thuật (suggest, advise, promise…) | 9 |
| R6 Question word + to-V (U3 lớp 9) | 9 |

### 5. RELATIVE_CLAUSES — Mệnh đề quan hệ (P1)
| Sub-skill | Lớp |
|---|---|
| RC1 who/which/that (xác định) (U9, U10) | 9 |
| RC2 whose, whom | 9 |
| RC3 where/when/why | 9 |
| RC4 Không xác định (dấu phẩy) (U11) | 9 |
| RC5 Lược bỏ đại từ quan hệ; nối 2 câu | 9 |

### 6. COMPARISONS — So sánh (P2)
| Sub-skill | Lớp |
|---|---|
| CP1 So sánh hơn/nhất tính từ ngắn | 6 |
| CP2 So sánh tính từ dài, bất quy tắc | 6–7 |
| CP3 So sánh bằng, like, different from, (not) as…as | 7 (U4) |
| CP4 So sánh của trạng từ | 8–9 (U2) |
| CP5 Đồng nghĩa giữa các dạng so sánh (viết lại câu) | 9 |

### 7. GERUNDS_INFINITIVES (P1)
| Sub-skill | Lớp |
|---|---|
| G1 Động từ + V-ing (like, enjoy, hate…) | 8 (U1) |
| G2 Động từ + to-V (want, decide, hope…) | 8–9 (U12) |
| G3 Bare V sau modal và make/let | 7–9 |
| G4 Đổi nghĩa: remember/forget/stop/try + V-ing vs to-V | 9 |
| G5 Adj + to-V / that-clause (U6); suggest + V-ing/should (U5); question word + to-V | 9 |

### 8. PREPOSITIONS_CONJUNCTIONS (P2)
| Sub-skill | Lớp |
|---|---|
| PC1 Giới từ thời gian (in/on/at, for/since, during, by, until) | 6–8 |
| PC2 Giới từ nơi chốn/chuyển động | 6–7 |
| PC3 Giới từ đi kèm tính từ/động từ (depend on, good at…) | 8–9 |
| PC4 Liên từ and/but/or/so/because (câu ghép) | 6–7 |
| PC5 Although/though/despite/in spite of/however (U12, lớp 7 U8) | 7–9 |

### 9. WISH_SENTENCES — Câu ước (P2)
| Sub-skill | Lớp |
|---|---|
| W1 Wish hiện tại (QKĐ, were) (U4 lớp 9) | 9 |
| W2 Wish tương lai (would/could) | 9 |
| W3 Phân biệt wish vs if only; viết lại | 9 |
| (P3) Wish quá khứ (past perfect) — mở rộng | — |

### 10. WORD_FORMS — Cấu tạo từ (P1)
| Sub-skill | Lớp |
|---|---|
| WF1 Vị trí từ loại trong câu (N/V/Adj/Adv) | 6–9 |
| WF2 Hậu tố danh từ (-tion, -ment, -ness, -er/-or) | 7–9 |
| WF3 Hậu tố tính từ/trạng từ (-ful, -less, -ous, -ive, -ly) | 7–9 |
| WF4 Tiền tố phủ định (un-, im-, in-, dis-, ir-) | 7–9 |
| WF5 Ôn gộp: chọn dạng đúng theo ngữ cảnh | 9 |

### 11. ARTICLES_PRONOUNS (P2)
| Sub-skill | Lớp |
|---|---|
| AP1 a/an/the (U12 lớp 7) | 6–7 |
| AP2 Zero article (U5 lớp 8) và công dụng khác của mạo từ (U8 lớp 9) | 8–9 |
| AP3 Đại từ nhân xưng, tính từ sở hữu, đại từ sở hữu (U11 lớp 7) | 6–7 |
| AP4 Đại từ phản thân, chỉ định, bất định | 7–9 |

### 12. PHRASAL_VERBS_COLLOCATIONS (P2)
| Sub-skill | Lớp |
|---|---|
| PV1 Phrasal verbs theo SGK lớp 9 (U1, U2: look up, turn on, …) | 9 |
| PV2 Phrasal verbs thông dụng theo nhóm nghĩa | 8–9 |
| PV3 Collocations make/do/take/have/get | 7–9 |
| PV4 Cụm cố định hay gặp (be interested in, be fond of…) | 8–9 |

## 4. Chủ điểm bổ sung — QUYẾT ĐỊNH (dựa trên S1–S4 và cấu trúc đề S8)

Phụ huynh giao quyền tự quyết dựa trên cấu trúc đề. Quyết định: **thêm 3 chủ điểm 13–15**, giữ nguyên 12 chủ điểm cũ.

| # | Mã | Chủ điểm | Sub-skill chính | Căn cứ |
|---|---|---|---|---|
| 13 | `SENTENCE_STRUCTURES` | Cấu trúc câu & kết hợp câu | Câu đơn/ghép/phức (lớp 7 U2, lớp 8 U3), mệnh đề độc lập (lớp 9 U1), mệnh đề trạng ngữ (lớp 8 U7), nối câu bằng liên từ/although/because/so that; câu hỏi Yes/No, Wh- (lớp 7 U9, lớp 8 U4) | S1–S3; S8 "kết hợp câu" 4 câu |
| 14 | `MODALS_QUANTIFIERS` | Động từ khuyết thiếu, lượng từ, danh từ | should/must/might, used to (lớp 9 U4), some/any/a lot of (lớp 7 U5), quantifiers (lớp 9 U7), danh từ đếm được/không đếm được | S1, S3, S4; S8 liệt kê "đếm được/không đếm được" |
| 15 | `COMMUNICATION` | Giao tiếp cơ bản (P3, làm sau) | Mời/đề nghị/xin phép/đồng ý-từ chối, khen-cảm ơn, đưa ý kiến | S8 ("giao tiếp cơ bản" trong 12 câu Language Focus). Không thuần ngữ pháp nên ưu tiên thấp |

### Sub-skill chủ điểm 14 `MODALS_QUANTIFIERS` (đã triển khai, draft)
M1 can/could · M2 should/shouldn't · M3 must/have to/don't have to · M4 might/may/could · M5 used to · M6 đếm được/không đếm được · M7 some/any · M8 much/many/a lot of · M9 a few/few/a little/little · M10 tổng hợp (too/enough, ôn gộp). Do chủ điểm 14 gồm hai nhóm nội dung khác nhau (modal + lượng từ), tôi tự chia theo logic; cần phụ huynh xác nhận.

### Sub-skill chủ điểm 6 `COMPARISONS` (đã triển khai, draft)
C1 so sánh hơn (tính từ ngắn) · C2 so sánh hơn (tính từ dài) · C3 so sánh nhất · C4 bất quy tắc & chính tả · C5 as…as · C6 the same as/different from/similar to/like · C7 so sánh trạng từ · C8 much/a lot, less/fewer/least · C9 the more…the more & comparative and comparative · C10 tổng hợp & viết lại câu. Cách chia này khác 5 mục CP1–CP5 ở mục 3; tôi gộp/tách để đủ 10 bài.

### Sub-skill chủ điểm 8 `PREPOSITIONS_CONJUNCTIONS` (đã triển khai, draft)
P1 in/on/at (thời gian) · P2 for/since/during/by/until · P3 in/on/at (nơi chốn) · P4 giới từ chuyển động & vị trí · P5 tính từ + giới từ · P6 động từ + giới từ · P7 and/but/or/so · P8 because/because of/so that · P9 although/despite/however · P10 tổng hợp. Tôi tự gộp 5 mục PC1–PC5 ở mục 3 thành 10 bài.

### Sub-skill chủ điểm 2 `PASSIVE_VOICE` (đã triển khai, draft)
V1 hiện tại đơn · V2 quá khứ đơn · V3 tương lai · V4 hiện tại hoàn thành · V5 với modal · V6 quy tắc chuyển đổi · V7 câu hỏi bị động · V8 bị động không ngôi (It is said that…) · V9 V3 & nhận biết bị động · V10 tổng hợp. Cách chia này khác 5 mục P1–P5 ở mục 3.

### Sub-skill chủ điểm 3 `CONDITIONALS` (đã triển khai, draft)
D1 loại 0 · D2 loại 1 · D3 loại 1 với modal/mệnh lệnh · D4 loại 2 · D5 If I were you · D6 unless · D7 phân biệt loại 1 và 2 · D8 as long as/provided that/otherwise · D9 viết lại câu · D10 tổng hợp. Loại 3 và hỗn hợp chưa làm (phần mở rộng).

### Sub-skill chủ điểm 5 `RELATIVE_CLAUSES` (đã triển khai, draft)
R1 who/which · R2 that · R3 whom & lược bỏ · R4 whose · R5 where · R6 when/why · R7 không xác định · R8 xác định vs không xác định · R9 nối câu · R10 tổng hợp. Mệnh đề quan hệ rút gọn chưa làm.

### Sub-skill chủ điểm 4 `REPORTED_SPEECH` (đã triển khai, draft)
S1 lùi thì cơ bản · S2 lùi thì mở rộng & modal · S3 đổi đại từ · S4 đổi trạng từ thời gian/nơi chốn · S5 câu hỏi Yes/No · S6 câu hỏi Wh- · S7 mệnh lệnh/yêu cầu · S8 động từ tường thuật · S9 say/tell & không lùi thì · S10 tổng hợp.

### Sub-skill chủ điểm 11 `ARTICLES_PRONOUNS` (đã triển khai, draft)
A1 a/an · A2 the · A3 không mạo từ · A4 các cách dùng the khác · A5 đại từ nhân xưng · A6 sở hữu · A7 phản thân · A8 this/that/these/those, one/ones · A9 another/other/each/every · A10 tổng hợp. Cách chia khác 4 mục AP1–AP4 ở mục 3.

### Sub-skill chủ điểm 7 `GERUNDS_INFINITIVES` (đã triển khai, draft)
G1 V + V-ing · G2 V + to V · G3 V + O + to V · G4 V nguyên mẫu không to · G5 giới từ + V-ing · G6 would like/prefer/would rather · G7 remember/forget/stop/try · G8 V-ing chủ ngữ, adj + to V, too/enough, mục đích · G9 be/get used to, used to, see + O + V · G10 tổng hợp.

### Sub-skill chủ điểm 9 `WISH_SENTENCES` (đã triển khai, draft)
W1 wish + QKĐ · W2 wish + were · W3 wish + would · W4 wish + could · W5 ước phủ định · W6 If only · W7 wish vs hope · W8 viết lại từ It's a pity · W9 wish + had V3 (mở rộng) · W10 tổng hợp.

### Sub-skill chủ điểm 10 `WORD_FORMS` (đã triển khai, draft)
F1 danh từ (vị trí) · F2 tính từ (vị trí, -ing/-ed) · F3 trạng từ · F4 động từ (-en, -ify, -ise) · F5 hậu tố danh từ · F6 danh từ chỉ người · F7 hậu tố tính từ · F8 tiền tố phủ định · F9 cặp tính từ/trạng từ dễ nhầm (hard/hardly…) · F10 tổng hợp.

### Sub-skill chủ điểm 12 `PHRASAL_VERBS_COLLOCATIONS` (đã triển khai, draft)
P1 up · P2 on/off · P3 out/in · P4 down/away/back · P5 look/take/get/go · P6 nghĩa (đồng nghĩa) · P7 make/do · P8 take/have/get · P9 go/play/give/keep/pay/save/catch · P10 tổng hợp. Danh sách cụm do tôi chọn, chưa đối chiếu SGK.

### Sub-skill chủ điểm 13 `SENTENCE_STRUCTURES` (đã triển khai, draft)
Q1 câu đơn/ghép · Q2 câu phức · Q3 mệnh đề thời gian · Q4 nguyên nhân – kết quả (so/such…that) · Q5 nhượng bộ – tương phản · Q6 câu hỏi Yes/No · Q7 câu hỏi Wh- · Q8 trật tự từ · Q9 both…and/either…or/neither…nor/too–enough · Q10 tổng hợp. Chủ điểm 15 `COMMUNICATION` chưa làm (phụ huynh chọn bỏ ở lô 3).

### Ngoài phạm vi (theo mục tiêu "lấp lỗ hổng ngữ pháp")
Phát âm, trọng âm (4 câu), đọc điền từ và đọc hiểu (10 câu), từ đồng/trái nghĩa (4 câu). Có thể làm sau như mô-đun riêng nếu phụ huynh muốn. Cloze chỉ dùng ở dạng *kiểm tra ngữ pháp trong đoạn văn* khi cần.

### Lớp "dạng bài" (task formats) — chiều thứ hai của ngân hàng câu hỏi
Đề thật kiểm tra *cùng một chủ điểm* qua nhiều dạng. Ngân hàng cần gắn `question_type` mở rộng, mỗi chủ điểm có đủ các dạng phù hợp:

| question_type | Mô tả | Chủ điểm hay dùng (S8) |
|---|---|---|
| `multiple_choice` | Chọn từ/cụm hoàn thành câu | Hầu hết |
| `error_identification` | Chọn 1 trong 4 phần gạch chân bị sai | Tenses, Passive, So sánh, Mệnh đề quan hệ, Giới từ, Mạo từ, Word forms |
| `sentence_transformation` | Chọn câu cùng nghĩa (viết lại) | Điều kiện, Wish, Bị động, Tường thuật, So sánh, Tenses |
| `sentence_combination` | Chọn câu kết hợp đúng nhất | Mệnh đề quan hệ, Liên từ, Cấu trúc câu |
| `fill_in_blank`, `matching` | Điền từ/chia dạng; nối | Giữ nguyên (phục vụ luyện sâu, không có trong đề trắc nghiệm) |

Việc cần làm khi thực thi: cập nhật schema/validator thêm 3 `question_type` mới và 3 `topic_code` mới.

### Về cấu trúc đề Hải Phòng (S8)
Ghi nhận để tham chiếu: 40 câu/60 phút/0,25 đ/câu; Language Focus 16 câu (12 chọn từ/cụm + 2 đồng nghĩa + 2 trái nghĩa), tìm lỗi 2, viết 8 (4 viết lại + 4 kết hợp câu). Phần **ngữ pháp thuần** vào khoảng 12 + 2 + 8 = 22/40 câu, đối chiếu khớp với việc tập trung ngữ pháp. Văn bản S8 không nêu nguồn/năm nên chưa dùng làm số liệu cố định trong app.

## 5. Thứ tự học đề xuất (gợi ý, điều chỉnh theo kết quả test đầu vào)
1. Tenses (T1→T10) → 2. Modals & Quantifiers → 3. Comparisons → 4. Prepositions & Conjunctions → 5. Articles & Pronouns → 6. Gerunds/Infinitives → 7. Passive → 8. Conditionals → 9. Relative Clauses → 10. Reported Speech → 11. Wish → 12. Word Forms → 13. Phrasal Verbs & Collocations → 14. Sentence structures (kết hợp câu, câu hỏi), xen kẽ khi cần → 15. Communication (cuối, tùy chọn).

Khối lượng ước tính: ~70–80 bài nhỏ. MVP: chỉ **Tenses** (10 bài).

## 6. Việc còn lại để chốt B0
- [ ] Lấy bản chương trình GDPT môn Tiếng Anh (PDF chính thức, Thông tư 32/2018) và đối chiếu phần ngữ pháp từng cấp.
- [ ] Đối chiếu mục lục SGK Global Success 6–9 (có sách giấy sẽ nhanh nhất).
- [x] Chủ điểm bổ sung: đã quyết định (mục 4).
- [ ] Phụ huynh xem lại thứ tự học và danh sách sub-skill.
- [ ] Làm bài test đầu vào để biết con yếu chủ điểm nào trước khi ưu tiên.
