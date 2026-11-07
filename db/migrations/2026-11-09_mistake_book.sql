-- So tay loi sai: tu ghi cau lam sai, hen on lai sau 1 / 3 / 7 ngay (xem app/src/mistake-book.ts).
-- Chay 1 lan trong Supabase SQL Editor, sau 2026-11-08. Chay lai nhieu lan van an toan.

create table if not exists mistake_book (
  user_id        uuid not null references profiles on delete cascade,
  question_id    text not null references questions,
  topic_code     text not null references topics,
  wrong_count    int  not null default 1,
  stage          int  not null default 0 check (stage between 0 and 3),   -- 0/1/2 = cho on sau 1/3/7 ngay; 3 = da nam
  next_review_at timestamptz not null default now() + interval '1 day',
  mastered       boolean not null default false,
  last_wrong_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
-- Cho phu huynh theo doi: so lan on va lan on gan nhat.
alter table mistake_book add column if not exists reviews_count    int not null default 0;
alter table mistake_book add column if not exists last_reviewed_at  timestamptz;
create index if not exists mistake_book_due_idx on mistake_book (user_id, next_review_at) where not mastered;

alter table mistake_book enable row level security;
drop policy if exists mb_own on mistake_book;
drop policy if exists mb_admin on mistake_book;
create policy mb_own   on mistake_book for all    using (user_id = auth.uid()) with check (user_id = auth.uid() and is_allowed());
create policy mb_admin on mistake_book for select using (is_admin());

-- Nhat ky hoat dong: them man hinh "So loi sai" de tinh thoi gian hoc o do.
alter table activity_log drop constraint if exists activity_log_view_kind_check;
alter table activity_log add constraint activity_log_view_kind_check
  check (view_kind in ('home','topic','lesson','topic_test','phase','phase_test','mistakes'));

-- Tong hop cho trang quan tri (tab Thong ke): moi hoc sinh con bao nhieu cau, bao nhieu cau den han / qua han.
-- "Den han" = ngay hen (gio Viet Nam) la hom nay hoac truoc do; "qua han" = tre tu 3 ngay tro len.
create or replace function admin_mistake_summary()
returns table (user_id uuid, open_count bigint, due_count bigint, overdue_count bigint, mastered_count bigint, last_reviewed_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  perform assert_admin();
  return query
  select m.user_id,
         (count(*) filter (where not m.mastered))::bigint,
         (count(*) filter (where not m.mastered and (m.next_review_at at time zone 'Asia/Ho_Chi_Minh')::date <= today))::bigint,
         (count(*) filter (where not m.mastered and (m.next_review_at at time zone 'Asia/Ho_Chi_Minh')::date <= today - 3))::bigint,
         (count(*) filter (where m.mastered))::bigint,
         max(m.last_reviewed_at)
  from mistake_book m
  group by m.user_id;
end $$;
revoke all on function admin_mistake_summary() from public, anon;
grant execute on function admin_mistake_summary() to authenticated;
