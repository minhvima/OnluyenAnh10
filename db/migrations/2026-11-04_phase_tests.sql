-- Bai kiem tra tong the cuoi moi giai doan: luu moi lan lam (thoi diem, thoi gian, diem, nhan xet).
-- Chay 1 lan trong Supabase SQL Editor. App van chay neu bang chua co (chi khong luu duoc lich su).
create table if not exists phase_test_runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles on delete cascade,
  phase         int  not null check (phase between 1 and 4),
  started_at    timestamptz not null,
  finished_at   timestamptz not null default now(),
  duration_s    int  not null,
  time_limit_s  int  not null,
  n_questions   int  not null,
  n_correct     int  not null,
  score         numeric(3,1) not null,            -- thang diem 10
  pass_score    numeric(3,1) not null,
  passed        boolean not null,
  topic_scores  jsonb not null default '[]',      -- [{topic_code, correct, total}]
  weak_lessons  jsonb not null default '[]',      -- [{lesson_id, title, missed, of}]
  comment       text not null default '',         -- nhan xet ngan hien trong lich su
  answers       jsonb not null default '[]'       -- [{question_id, correct}]  (de uu tien cau moi o lan sau)
);
create index if not exists phase_test_runs_user_idx on phase_test_runs (user_id, phase, finished_at desc);

alter table phase_test_runs enable row level security;
drop policy if exists ptr_own on phase_test_runs;
drop policy if exists ptr_admin on phase_test_runs;
create policy ptr_own   on phase_test_runs for all    using (user_id = auth.uid()) with check (user_id = auth.uid() and is_allowed());
create policy ptr_admin on phase_test_runs for select using (is_admin());
