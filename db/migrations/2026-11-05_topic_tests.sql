-- Bai kiem tra cuoi moi chu diem: dung chung bang phase_test_runs, them cot topic_code.
-- Dong co topic_code la bai kiem tra chu diem; dong khong co la bai kiem tra giai doan.
-- Chay 1 lan trong Supabase SQL Editor (sau 2026-11-04_phase_tests.sql).
alter table phase_test_runs add column if not exists topic_code text;
create index if not exists phase_test_runs_topic_idx on phase_test_runs (user_id, topic_code, finished_at desc);
