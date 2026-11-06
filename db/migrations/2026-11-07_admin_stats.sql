-- Ham thong ke cho trang quan tri. Chi admin (is_admin()) goi duoc; nguoi khac nhan loi NOT_ADMIN.
-- Dung ham security definer thay vi view: view mac dinh chay voi quyen chu bang va se bo qua RLS.
-- Ngay tinh theo gio Viet Nam. Gom tuan/thang lam o client tu so lieu theo ngay.
-- Chay sau 2026-11-06_activity_log.sql, trong Supabase SQL Editor.

create or replace function assert_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;
end $$;

-- 1. Tom tat tung hoc sinh --------------------------------------------------------------
create or replace function admin_students_summary()
returns table (
  user_id uuid, email text, display_name text,
  last_active timestamptz, idle_days int,
  minutes_7d numeric, active_days_7d int,
  answers_total bigint, correct_total bigint,
  lessons_mastered bigint, lessons_started bigint, tests_taken bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_admin();
  return query
  select p.id, p.email, p.display_name,
    la.last_active,
    case when la.last_active is null then null
         else (now() at time zone 'Asia/Ho_Chi_Minh')::date - (la.last_active at time zone 'Asia/Ho_Chi_Minh')::date end,
    coalesce(round(w.ms / 60000.0, 1), 0),
    coalesce(w.days, 0)::int,
    coalesce(a.n, 0), coalesce(a.ok, 0),
    coalesce(lp.mastered, 0), coalesce(lp.started, 0),
    coalesce(t.n, 0)
  from profiles p
  left join lateral (
    select max(ts) as last_active from (
      select max(created_at) as ts from attempts x where x.user_id = p.id
      union all select max(created_at) from activity_log y where y.user_id = p.id
      union all select max(finished_at) from phase_test_runs z where z.user_id = p.id
    ) u
  ) la on true
  left join lateral (
    select sum(duration_ms) as ms,
           count(distinct (created_at at time zone 'Asia/Ho_Chi_Minh')::date) as days
    from activity_log y
    where y.user_id = p.id and y.event = 'view' and y.created_at >= now() - interval '7 days'
  ) w on true
  left join lateral (
    select count(*) as n, count(*) filter (where is_correct) as ok from attempts x where x.user_id = p.id
  ) a on true
  left join lateral (
    select count(*) filter (where status = 'mastered') as mastered, count(*) as started
    from lesson_progress l where l.user_id = p.id
  ) lp on true
  left join lateral (
    select count(*) as n from phase_test_runs z where z.user_id = p.id
  ) t on true
  where p.role = 'student'
  order by la.last_active desc nulls last;
end $$;

-- 2. Hoat dong theo ngay (p_user null = tat ca hoc sinh) -----------------------------------
create or replace function admin_daily_activity(p_from date, p_to date, p_user uuid default null)
returns table (
  day date, user_id uuid,
  minutes numeric, answers bigint, correct bigint,
  lessons_practiced bigint, tests bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_admin();
  return query
  with ev as (
    select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as d, x.user_id as u,
           coalesce(duration_ms, 0) / 60000.0 as mins, 0::bigint as ans, 0::bigint as ok,
           null::text as lesson, 0::bigint as tst
    from activity_log x where x.event = 'view' and (p_user is null or x.user_id = p_user)
    union all
    select (created_at at time zone 'Asia/Ho_Chi_Minh')::date, x.user_id, 0, 1, case when is_correct then 1 else 0 end, x.lesson_id, 0
    from attempts x where p_user is null or x.user_id = p_user
    union all
    select (finished_at at time zone 'Asia/Ho_Chi_Minh')::date, x.user_id, 0, 0, 0, null, 1
    from phase_test_runs x where p_user is null or x.user_id = p_user
  )
  select ev.d, ev.u, round(sum(ev.mins), 1), sum(ev.ans), sum(ev.ok),
         count(distinct ev.lesson), sum(ev.tst)
  from ev
  where ev.d between p_from and p_to
  group by ev.d, ev.u
  order by ev.d, ev.u;
end $$;

-- 3. Thoi gian theo man hinh (bai / chu diem / bai kiem tra) --------------------------------
create or replace function admin_view_time(p_from date, p_to date, p_user uuid default null)
returns table (view_kind text, ref_id text, topic_code text, minutes numeric, visits bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_admin();
  return query
  select y.view_kind, y.ref_id, y.topic_code, round(sum(y.duration_ms) / 60000.0, 1), count(*)
  from activity_log y
  where y.event = 'view'
    and (y.created_at at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to
    and (p_user is null or y.user_id = p_user)
  group by y.view_kind, y.ref_id, y.topic_code
  order by sum(y.duration_ms) desc;
end $$;

-- 4. Theo chu diem: de thay diem yeu --------------------------------------------------------
create or replace function admin_topic_stats(p_user uuid default null)
returns table (topic_code text, name_vi text, answers bigint, correct bigint, accuracy numeric, lessons_mastered bigint, lessons_total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_admin();
  return query
  select t.topic_code, t.name_vi,
    coalesce(a.n, 0), coalesce(a.ok, 0),
    case when coalesce(a.n, 0) = 0 then null else round(100.0 * a.ok / a.n, 1) end,
    coalesce(m.mastered, 0),
    coalesce(l.total, 0)
  from topics t
  left join lateral (
    select count(*) as n, count(*) filter (where is_correct) as ok
    from attempts x where x.topic_code = t.topic_code and (p_user is null or x.user_id = p_user)
  ) a on true
  left join lateral (
    select count(*) as total from lessons s where s.topic_code = t.topic_code and s.status = 'approved'
  ) l on true
  left join lateral (
    select count(*) as mastered
    from lesson_progress lp join lessons s on s.lesson_id = lp.lesson_id
    where s.topic_code = t.topic_code and lp.status = 'mastered' and (p_user is null or lp.user_id = p_user)
  ) m on true
  where t.active
  order by t.sort_order;
end $$;

-- 5. Cau sai nhieu (phat hien cau kho hoac cau co the loi) ---------------------------------
create or replace function admin_hard_questions(p_min_attempts int default 5, p_limit int default 20, p_user uuid default null)
returns table (question_id text, topic_code text, lesson_id text, attempts bigint, wrong bigint, wrong_rate numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_admin();
  return query
  select x.question_id, max(x.topic_code), max(x.lesson_id), count(*),
         count(*) filter (where not x.is_correct),
         round(100.0 * count(*) filter (where not x.is_correct) / count(*), 1)
  from attempts x
  where p_user is null or x.user_id = p_user
  group by x.question_id
  having count(*) >= p_min_attempts
  order by 6 desc, 4 desc
  limit p_limit;
end $$;

-- 6. Lich su bai kiem tra -------------------------------------------------------------------
create or replace function admin_test_history(p_from date, p_to date, p_user uuid default null)
returns table (
  id uuid, user_id uuid, phase int, topic_code text, finished_at timestamptz,
  duration_s int, n_questions int, n_correct int, score numeric, pass_score numeric, passed boolean, comment text
)
language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_admin();
  return query
  select z.id, z.user_id, z.phase, z.topic_code, z.finished_at, z.duration_s, z.n_questions, z.n_correct,
         z.score, z.pass_score, z.passed, z.comment
  from phase_test_runs z
  where (z.finished_at at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to
    and (p_user is null or z.user_id = p_user)
  order by z.finished_at desc;
end $$;

-- Chi nguoi dang nhap duoc goi; ben trong da kiem tra is_admin().
revoke all on function assert_admin() from public;
revoke all on function admin_students_summary() from public;
revoke all on function admin_daily_activity(date, date, uuid) from public;
revoke all on function admin_view_time(date, date, uuid) from public;
revoke all on function admin_topic_stats(uuid) from public;
revoke all on function admin_hard_questions(int, int, uuid) from public;
revoke all on function admin_test_history(date, date, uuid) from public;
revoke all on function assert_admin(), admin_students_summary(), admin_daily_activity(date, date, uuid),
  admin_view_time(date, date, uuid), admin_topic_stats(uuid), admin_hard_questions(int, int, uuid),
  admin_test_history(date, date, uuid) from anon;
grant execute on function admin_students_summary() to authenticated;
grant execute on function admin_daily_activity(date, date, uuid) to authenticated;
grant execute on function admin_view_time(date, date, uuid) to authenticated;
grant execute on function admin_topic_stats(uuid) to authenticated;
grant execute on function admin_hard_questions(int, int, uuid) to authenticated;
grant execute on function admin_test_history(date, date, uuid) to authenticated;

-- ====== Kiem tra sau khi chay (thay <...> bang gia tri that) ======
-- Dang nhap bang tai khoan ADMIN trong app, mo console trinh duyet:
--   await supabase.rpc('admin_students_summary')                       -> danh sach hoc sinh
--   await supabase.rpc('admin_daily_activity', {p_from:'2026-11-01', p_to:'2026-11-30'})
-- Dang nhap bang tai khoan HOC SINH, cung lenh tren phai tra loi NOT_ADMIN (ma 42501).
