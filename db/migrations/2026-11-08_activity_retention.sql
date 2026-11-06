-- (1) Don nhat ky hoat dong cu hon 3 thang (toi thieu hoa du lieu cua hoc sinh vi thanh nien).
--     Chi xoa activity_log. Ket qua hoc (attempts, lesson_progress, phase_test_runs) giu nguyen.
-- (2) Ham liet ke bai "mo ra nhung chua lam bai tap" cho trang quan tri.
-- Chay sau 2026-11-07_admin_stats.sql, trong Supabase SQL Editor.

-- Ham don that su: KHONG ai goi duoc tu app (chi pg_cron / SQL Editor chay bang quyen postgres).
create or replace function purge_activity_log(p_months int default 3) returns bigint
language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  delete from activity_log where created_at < now() - make_interval(months => p_months);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function purge_activity_log(int) from public, anon, authenticated;

-- Nut "Don log cu" cua admin trong tab Thong ke.
create or replace function admin_purge_activity_log() returns bigint
language plpgsql security definer set search_path = public as $$
begin
  perform assert_admin();
  return purge_activity_log(3);
end $$;
revoke all on function admin_purge_activity_log() from public, anon;
grant execute on function admin_purge_activity_log() to authenticated;

-- Tu dong moi ngay 03:30 gio Viet Nam (20:30 UTC) neu pg_cron dung duoc.
-- Neu Supabase chua bat pg_cron thi chi bao thong bao; dung nut "Don log cu" trong app thay the.
do $do$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('purge-activity-log', '30 20 * * *', $q$select public.purge_activity_log(3)$q$);
exception when others then
  raise notice 'Chua lap lich tu dong (pg_cron): %. Dung nut Don log cu trong trang quan tri.', sqlerrm;
end $do$;

-- Bai hoc co xem tu 1 phut tro len nhung KHONG co cau tra loi nao cung ngay (bo do hoac chi doc ly thuyet).
create or replace function admin_abandoned_lessons(p_from date, p_to date, p_user uuid default null)
returns table (user_id uuid, lesson_id text, day date, minutes numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  perform assert_admin();
  return query
  select v.uid, v.lid, v.d, round(v.ms / 60000.0, 1)
  from (
    select y.user_id as uid, y.ref_id as lid,
           (y.created_at at time zone 'Asia/Ho_Chi_Minh')::date as d,
           sum(y.duration_ms) as ms
    from activity_log y
    where y.event = 'view' and y.view_kind = 'lesson' and y.ref_id is not null
      and (y.created_at at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to
      and (p_user is null or y.user_id = p_user)
    group by y.user_id, y.ref_id, (y.created_at at time zone 'Asia/Ho_Chi_Minh')::date
  ) v
  where v.ms >= 60000
    and not exists (
      select 1 from attempts a
      where a.user_id = v.uid and a.lesson_id = v.lid
        and (a.created_at at time zone 'Asia/Ho_Chi_Minh')::date = v.d)
  order by v.d desc, v.ms desc;
end $$;
revoke all on function admin_abandoned_lessons(date, date, uuid) from public, anon;
grant execute on function admin_abandoned_lessons(date, date, uuid) to authenticated;
