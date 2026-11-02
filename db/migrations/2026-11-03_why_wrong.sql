-- Ly do vi sao tung dap an sai la sai (hien khi hoc sinh chon sai).
-- Dang chon dap an: { "C": "ly do", "D": "ly do" }  (khoa = id dap an)
-- Dang dien tu:     { "don't": "ly do" }              (khoa = dap an sai hay gap, chu thuong)
-- Chay 1 lan trong Supabase SQL Editor. App van chay neu cot chua co (chi khong hien ly do sai).
alter table questions add column if not exists why_wrong jsonb not null default '{}'::jsonb;
