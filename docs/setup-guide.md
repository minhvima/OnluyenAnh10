# Hướng dẫn thiết lập (Sprint 1) — dành cho phụ huynh

Anh/chị tự làm các bước có tài khoản; Team không tạo tài khoản thay. Làm theo thứ tự. Mọi dịch vụ dùng gói **miễn phí**.

> **Quy tắc an toàn:** có 2 loại khóa Supabase. **anon key** thì công khai được (đưa cho Team, đưa vào GitHub Secrets). **service_role key** thì TUYỆT ĐỐI không gửi cho ai, không dán vào chat, không đưa lên GitHub. Chỉ dùng trên máy anh/chị để chạy script import.

## Bước 1 — GitHub (repo + trang web)
1. Đăng ký/đăng nhập https://github.com.
2. Tạo repo mới, đặt tên (vd. `ngu-phap-vao-10`), chọn **Public** (gói miễn phí của Pages cần public). Không tick "Add README".
3. Nhớ tên đăng nhập và tên repo. Địa chỉ web sẽ là `https://<tên-đăng-nhập>.github.io/<tên-repo>/`.
4. Vào repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Bước 2 — Supabase (cơ sở dữ liệu + đăng nhập)
1. Đăng ký https://supabase.com (có thể dùng tài khoản GitHub), tạo **New project** (đặt mật khẩu DB mạnh, lưu lại; chọn region gần, vd. Singapore).
2. Vào **SQL Editor** → New query:
   1. Dán toàn bộ `db/schema.sql` → Run. Báo lỗi nếu có (gửi nguyên văn thông báo lỗi).
   2. Dán toàn bộ `db/seed.sql` → Run (nạp 14 chủ điểm).
   3. Mở file `db/admin.local.sql` (chỉ có trên máy anh/chị, không lên GitHub; email đã điền sẵn, kiểm tra lại cho đúng), dán → Run. Đây là bước tạo tài khoản admin; phải làm trước khi đăng nhập lần đầu.
3. **Project Settings → API**: ghi lại **Project URL** và **anon public key** (hai giá trị này gửi cho Team được). **service_role key**: giữ riêng.

## Bước 3 — Google đăng nhập
1. Vào https://console.cloud.google.com → tạo Project mới.
2. **APIs & Services → OAuth consent screen**: User type *External*, điền tên app, email hỗ trợ. Để trạng thái *Testing* và thêm tất cả email Gmail của các em + của anh/chị vào **Test users** (tối đa 100).
3. **Credentials → Create credentials → OAuth client ID → Web application**. Mục **Authorized redirect URIs** điền: `https://<project-ref>.supabase.co/auth/v1/callback` (lấy đúng địa chỉ này ở Supabase → Authentication → Providers → Google).
4. Copy **Client ID** và **Client secret**, dán vào Supabase → Authentication → Providers → **Google** → bật → Save.
5. Supabase → Authentication → **URL Configuration**: *Site URL* = địa chỉ web ở Bước 1; thêm vào *Redirect URLs*: địa chỉ đó và `http://localhost:5173/`.

## Bước 4 — Đưa giá trị vào GitHub
Repo → Settings → Secrets and variables → Actions → New repository secret, tạo 2 secret:
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_ANON_KEY` = anon public key

## Bước 5 — Đẩy mã lên GitHub
Team sẽ hướng dẫn lệnh (git init, remote, push) khi anh/chị xong bước 1. Thư mục `data_bank/` (câu hỏi/đáp án) đã được loại khỏi git, sẽ **không** lên repo public.

## Bước 6 — Nhập câu hỏi vào Supabase (chạy trên máy anh/chị)
```bash
python tools/import_to_supabase.py            # chạy thử, không gửi gì
```
Rồi đặt biến môi trường (PowerShell) và chạy thật:
```powershell
$env:SUPABASE_URL="https://<project-ref>.supabase.co"
$env:SUPABASE_SERVICE_KEY="<service_role key>"
python tools/import_to_supabase.py --apply
```
Script chỉ thêm dòng mới, không ghi đè thay đổi anh/chị đã làm trong màn Quản trị.

## Bước 7 — Kiểm tra cuối
1. Mở web, đăng nhập bằng Gmail của anh/chị → thấy mục **Quản trị**.
2. Quản trị → Bài học → duyệt các bài (đang là nháp).
3. Thêm email của một em → em đăng nhập thử; một Gmail lạ phải bị từ chối.

## Điều Team chưa kiểm chứng được (cần chạy thật mới biết)
- `db/schema.sql` chưa từng chạy trên Supabase; có thể cần chỉnh nhỏ.
- Trigger chặn email lạ chưa thử thật; phương án dự phòng là RLS (người lạ vào được nhưng không đọc được gì).
- Màn Quản trị và đăng nhập mới chỉ qua kiểm tra kiểu và build, chưa chạy với dữ liệu thật.
