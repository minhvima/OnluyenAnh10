-- Supabase / PostgreSQL schema (DRAFT v1) -- Grammar vao 10
-- Chua chay tren Supabase that. Chay thu o Sprint 1 va ghi ket qua vao docs/decisions.md.
-- Quy uoc: ma ASCII khong dau; id cau hoi Q_<TOPIC>_<NNN>; bai L_<TOPIC>_<NN>.

create extension if not exists pgcrypto;

-- ============ 1. Nguoi dung & phan quyen ============
-- Danh sach cho phep do admin (phu huynh) quan ly. Email luon luu lowercase.
create table allowed_emails (
  email      text primary key check (email = lower(email)),
  role       text not null default 'student' check (role in ('student','admin')),
  active     boolean not null default true,
  note       text,
  created_at timestamptz not null default now()
);

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  display_name text,
  role         text not null default 'student' check (role in ('student','admin')),
  created_at   timestamptz not null default now()
);

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p
                 join allowed_emails a on a.email = p.email
                 where p.id = auth.uid() and p.role = 'admin' and a.active);
$$;

create function is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p
                 join allowed_emails a on a.email = p.email
                 where p.id = auth.uid() and a.active);
$$;

-- Vai tro cua nguoi dang dang nhap ('student' | 'admin'), hoac NULL neu khong (con) trong allowlist.
create function my_access() returns text
language sql stable security definer set search_path = public as $$
  select p.role from profiles p join allowed_emails a on a.email = p.email
  where p.id = auth.uid() and a.active;
$$;

-- Chan dang ky neu email khong trong allowlist; tao profile neu hop le.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare a allowed_emails%rowtype;
begin
  select * into a from allowed_emails where email = lower(new.email) and active;
  if not found then
    raise exception 'EMAIL_NOT_ALLOWED';
  end if;
  insert into profiles(id, email, display_name, role)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), a.role);
  return new;
end $$;

-- AFTER insert (profiles co khoa ngoai toi auth.users). Exception trong trigger se rollback
-- ca viec tao user, nen email ngoai allowlist khong tao duoc tai khoan.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============ 2. Noi dung ============
create table topics (
  topic_code text primary key,
  name_vi    text not null,
  name_en    text not null,
  sort_order int  not null,            -- thu tu hoc mac dinh (docs/learning-path.md)
  phase      int  not null,            -- giai doan 1-4
  prereqs    text[] not null default '{}',
  priority   text not null default 'P1' check (priority in ('P1','P2','P3')),
  active     boolean not null default true
);

create table lessons (
  lesson_id         text primary key,
  topic_code        text not null references topics,
  ord               int  not null,
  title             text not null,
  estimated_minutes int  not null default 5,
  content           jsonb not null,     -- story, observe, formula, signals, tables, mistakes, mnemonic, flashcards
  status            text not null default 'draft' check (status in ('draft','approved','rejected')),
  updated_at        timestamptz not null default now(),
  unique (topic_code, ord)
);

create table questions (
  question_id      text primary key,
  topic_code       text not null references topics,
  lesson_id        text references lessons,           -- nullable: gan bai sau
  cognitive_level  text not null check (cognitive_level in ('Recognition','Comprehension','Application')),
  question_type    text not null check (question_type in
    ('multiple_choice','fill_in_blank','matching','error_identification','sentence_transformation','sentence_combination')),
  prompt           text not null,
  options          jsonb not null default '[]',
  correct_answer   text not null,
  accepted_answers jsonb not null default '[]',
  explanation      text not null,
  why_wrong        jsonb not null default '{}',   -- ly do tung dap an sai (xem db/migrations)
  hint             text,
  tags             text[] not null default '{}',
  media            jsonb,
  source           text not null default 'original',
  status           text not null default 'draft'
                     check (status in ('draft','approved','rejected','needs_teacher')),
  reject_reason    text,
  version          int  not null default 1,
  updated_at       timestamptz not null default now()
);
create index on questions (topic_code, status);
create index on questions (lesson_id) where lesson_id is not null;

-- ============ 3. Tien do hoc sinh ============
create table attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles on delete cascade,
  question_id text not null references questions,
  topic_code  text not null references topics,
  lesson_id   text references lessons,
  context     text not null check (context in ('placement','practice','lesson_test','review','mixed')),
  answer      text not null,
  is_correct  boolean not null,
  time_ms     int,
  created_at  timestamptz not null default now()
);
create index on attempts (user_id, created_at desc);
create index on attempts (user_id, topic_code);

create table lesson_progress (
  user_id         uuid not null references profiles on delete cascade,
  lesson_id       text not null references lessons,
  status          text not null default 'in_progress' check (status in ('in_progress','mastered')),
  best_score      numeric(5,2),           -- 0-100
  last_score      numeric(5,2),
  attempts_count  int not null default 0,
  mastered_at     timestamptz,
  last_activity   timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table placement_results (
  user_id    uuid not null references profiles on delete cascade,
  topic_code text not null references topics,
  score      numeric(5,2) not null,
  n_questions int not null,
  taken_at   timestamptz not null default now(),
  primary key (user_id, topic_code, taken_at)
);

-- So tay loi sai; stage 0/1/2 -> hen 1/3/7 ngay; qua stage 2 dung = da nam. Sai -> stage 0.
create table mistake_book (
  user_id        uuid not null references profiles on delete cascade,
  question_id    text not null references questions,
  topic_code     text not null references topics,
  wrong_count    int  not null default 1,
  stage          int  not null default 0 check (stage between 0 and 3),
  next_review_at timestamptz not null default now() + interval '1 day',
  mastered       boolean not null default false,
  last_wrong_at  timestamptz not null default now(),
  reviews_count  int  not null default 0,
  last_reviewed_at timestamptz,
  primary key (user_id, question_id)
);
create index on mistake_book (user_id, next_review_at) where not mastered;

create table study_days (
  user_id uuid not null references profiles on delete cascade,
  day     date not null,
  minutes int  not null default 0,
  xp      int  not null default 0,
  primary key (user_id, day)
);

-- ============ 3b. Bai kiem tra giai doan va chu diem (xem db/migrations/2026-11-04_phase_tests.sql, 2026-11-05_topic_tests.sql) ============
create table if not exists phase_test_runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles on delete cascade,
  phase         int  not null check (phase between 1 and 4),
  topic_code    text,                             -- co gia tri = bai kiem tra cuoi chu diem; null = bai kiem tra giai doan
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

-- ============ 3c. Nhat ky hoat dong (xem db/migrations/2026-11-06_activity_log.sql) ============
create table if not exists activity_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles on delete cascade,
  event       text not null check (event in ('login','view')),
  view_kind   text check (view_kind in ('home','topic','lesson','topic_test','phase','phase_test','mistakes')),
  ref_id      text,
  topic_code  text,
  duration_ms int check (duration_ms is null or duration_ms between 0 and 3600000),
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

-- ============ 4. Cau hinh ============
create table app_settings (
  key   text primary key,
  value jsonb not null
);
insert into app_settings values
  ('mastery_threshold', '0.8'),
  ('review_intervals_days', '[1,3,7]');

-- ============ 5. RLS ============
alter table allowed_emails    enable row level security;
alter table profiles          enable row level security;
alter table topics            enable row level security;
alter table lessons           enable row level security;
alter table questions         enable row level security;
alter table attempts          enable row level security;
alter table lesson_progress   enable row level security;
alter table placement_results enable row level security;
alter table mistake_book      enable row level security;
alter table study_days        enable row level security;
alter table app_settings      enable row level security;

create policy allowed_admin   on allowed_emails for all using (is_admin()) with check (is_admin());
create policy profiles_self   on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_admin  on profiles for update using (is_admin());

-- Noi dung: hoc sinh chi doc muc da duyet; admin doc/ghi tat ca.
create policy topics_read     on topics    for select using (is_allowed());
create policy topics_admin    on topics    for all using (is_admin()) with check (is_admin());
create policy lessons_read    on lessons   for select using (is_allowed() and status = 'approved');
create policy lessons_admin   on lessons   for all using (is_admin()) with check (is_admin());
create policy questions_read  on questions for select using (is_allowed() and status = 'approved');
create policy questions_admin on questions for all using (is_admin()) with check (is_admin());
create policy settings_read   on app_settings for select using (is_allowed());
create policy settings_admin  on app_settings for all using (is_admin()) with check (is_admin());

-- Du lieu hoc sinh: tu doc/ghi cua minh; admin chi doc.
create policy att_own    on attempts          for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_allowed());
create policy att_admin  on attempts          for select using (is_admin());
create policy lp_own     on lesson_progress   for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_allowed());
create policy lp_admin   on lesson_progress   for select using (is_admin());
create policy pr_own     on placement_results for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_allowed());
create policy pr_admin   on placement_results for select using (is_admin());
create policy mb_own     on mistake_book      for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_allowed());
create policy mb_admin   on mistake_book      for select using (is_admin());
create policy sd_own     on study_days        for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_allowed());
create policy sd_admin   on study_days        for select using (is_admin());

-- ============ 6. View cho man hinh phu huynh ============
create view v_topic_accuracy with (security_invoker = on) as
select user_id, topic_code,
       count(*) as n, avg(is_correct::int)::numeric(4,3) as accuracy,
       max(created_at) as last_at
from attempts group by user_id, topic_code;
