-- Nhat ky hoat dong hoc (cho trang quan tri): dang nhap, thoi gian xem tung man hinh.
-- Chay 1 lan trong Supabase SQL Editor. App van chay neu bang chua co (chi khong ghi duoc nhat ky).
-- Khong luu IP, khong luu thong tin thiet bi, khong co ben thu ba.
create table if not exists activity_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles on delete cascade,
  event       text not null check (event in ('login','view')),
  view_kind   text check (view_kind in ('home','topic','lesson','topic_test','phase','phase_test')),
  ref_id      text,                                  -- lesson_id / topic_code / so giai doan tuy view_kind
  topic_code  text,
  duration_ms int check (duration_ms is null or duration_ms between 0 and 3600000),  -- thoi gian tuong tac thuc, da cat khi nghi
  created_at  timestamptz not null default now()
);
create index if not exists activity_log_user_time_idx on activity_log (user_id, created_at desc);
create index if not exists activity_log_event_idx on activity_log (event, created_at desc);

alter table activity_log enable row level security;
drop policy if exists al_own_insert on activity_log;
drop policy if exists al_own_select on activity_log;
drop policy if exists al_admin on activity_log;
create policy al_own_insert on activity_log for insert with check (user_id = auth.uid() and is_allowed());
create policy al_own_select on activity_log for select using (user_id = auth.uid());
create policy al_admin      on activity_log for select using (is_admin());
