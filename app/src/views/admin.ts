import { clear, h } from '../lib/dom';
import { supabase } from '../lib/supabase';

import { statsTab } from './admin-stats';

type Tab = 'stats' | 'allowlist' | 'questions' | 'lessons';
const PAGE = 25;

interface Allowed { email: string; role: string; active: boolean; note: string | null }
interface QRow {
  question_id: string; topic_code: string; question_type: string; prompt: string;
  options: unknown; correct_answer: string; explanation: string; status: string;
}
interface LRow { lesson_id: string; topic_code: string; ord: number; title: string; status: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function adminView(): HTMLElement {
  const body = h('div', { class: 'admin-body' });
  const tabs = h('nav', { class: 'tabs', 'aria-label': 'Quản trị' });
  const root = h('main', { class: 'page' }, h('h1', {}, 'Quản trị'), tabs, body);

  const show = (tab: Tab): void => {
    clear(tabs);
    for (const [id, label] of [['stats', 'Thống kê'], ['allowlist', 'Danh sách cho phép'], ['questions', 'Câu hỏi'], ['lessons', 'Bài học']] as const) {
      tabs.append(h('button', { class: id === tab ? 'tab active' : 'tab', 'data-tab': id, onclick: () => show(id) }, label));
    }
    clear(body);
    const view = tab === 'stats' ? statsTab() : tab === 'allowlist' ? allowlistTab() : tab === 'questions' ? questionsTab() : lessonsTab();
    void view.then((el) => { if (tabs.querySelector('.tab.active')?.getAttribute('data-tab') === tab) body.append(el); });
  };
  show('stats');
  return root;
}

function errorBox(msg: string): HTMLElement {
  return h('p', { class: 'error', role: 'alert' }, msg);
}

async function allowlistTab(): Promise<HTMLElement> {
  const db = supabase;
  const root = h('section', {});
  if (!db) return root;
  const msg = h('p', { class: 'note', role: 'status' });
  const list = h('ul', { class: 'rows' });

  const reload = async (): Promise<void> => {
    const { data, error } = await db.from('allowed_emails').select('*').order('created_at');
    clear(list);
    if (error) { msg.textContent = 'Không tải được danh sách.'; return; }
    for (const r of (data ?? []) as Allowed[]) {
      list.append(
        h('li', {},
          h('span', {}, `${r.email} · ${r.role}${r.active ? '' : ' · đã khóa'}`),
          h('button', {
            class: 'btn btn-small',
            onclick: async () => {
              const { error: e } = await db.from('allowed_emails').update({ active: !r.active }).eq('email', r.email);
              msg.textContent = e ? 'Không cập nhật được.' : '';
              await reload();
            },
          }, r.active ? 'Khóa' : 'Mở lại')),
      );
    }
  };

  const input = h('input', { type: 'email', placeholder: 'email@gmail.com', 'aria-label': 'Email', required: true });
  const form = h('form', {
    class: 'inline-form',
    onsubmit: async (e: Event) => {
      e.preventDefault();
      const email = (input as HTMLInputElement).value.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) { msg.textContent = 'Email chưa hợp lệ.'; return; }
      const { error } = await db.from('allowed_emails').insert({ email, role: 'student' });
      msg.textContent = error ? 'Không thêm được (có thể email đã có).' : 'Đã thêm.';
      if (!error) (input as HTMLInputElement).value = '';
      await reload();
    },
  }, input, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Thêm học sinh'));

  root.append(form, msg, list);
  await reload();
  return root;
}

async function questionsTab(): Promise<HTMLElement> {
  const db = supabase;
  const root = h('section', {});
  if (!db) return root;
  let page = 0;
  const status = h('select', { 'aria-label': 'Trạng thái' },
    ...['approved', 'draft', 'needs_teacher', 'rejected'].map((s) => h('option', { value: s }, s)));
  const topic = h('select', { 'aria-label': 'Chủ điểm' }, h('option', { value: '' }, 'Tất cả chủ điểm'));
  const list = h('div', { class: 'cards' });
  const pager = h('p', { class: 'note', role: 'status' });

  const reload = async (): Promise<void> => {
    let q = db.from('questions')
      .select('question_id,topic_code,question_type,prompt,options,correct_answer,explanation,status', { count: 'exact' })
      .eq('status', (status as HTMLSelectElement).value)
      .order('question_id')
      .range(page * PAGE, page * PAGE + PAGE - 1);
    const t = (topic as HTMLSelectElement).value;
    if (t) q = q.eq('topic_code', t);
    const { data, error, count } = await q;
    clear(list);
    if (error) { list.append(errorBox('Không tải được câu hỏi.')); return; }
    const rows = (data ?? []) as QRow[];
    if (rows.length === 0) list.append(h('p', { class: 'note' }, 'Không có câu nào.'));
    for (const r of rows) {
      list.append(h('article', { class: 'card' },
        h('h3', {}, `${r.question_id} · ${r.question_type}`),
        h('p', {}, r.prompt),
        h('pre', {}, JSON.stringify(r.options, null, 1)),
        h('p', {}, `Đáp án: ${r.correct_answer}`),
        h('p', { class: 'note' }, r.explanation),
        h('div', { class: 'actions' },
          ...(['approved', 'needs_teacher', 'rejected'] as const).filter((s) => s !== r.status).map((s) =>
            h('button', {
              class: 'btn btn-small',
              onclick: async () => {
                const { error: e } = await db.from('questions').update({ status: s }).eq('question_id', r.question_id);
                if (e) pager.textContent = 'Không cập nhật được.';
                else await reload();
              },
            }, s === 'approved' ? 'Duyệt' : s === 'rejected' ? 'Loại' : 'Cần giáo viên')))));
    }
    const total = count ?? 0;
    pager.textContent = `Trang ${page + 1}/${Math.max(1, Math.ceil(total / PAGE))} · ${total} câu`;
  };

  const rerun = (): void => { page = 0; void reload(); };
  status.addEventListener('change', rerun);
  topic.addEventListener('change', rerun);
  const { data: topics } = await db.from('topics').select('topic_code').order('sort_order');
  for (const t of (topics ?? []) as { topic_code: string }[]) topic.append(h('option', { value: t.topic_code }, t.topic_code));

  const nav = h('div', { class: 'actions' },
    h('button', { class: 'btn btn-small', onclick: () => { if (page > 0) { page--; void reload(); } } }, 'Trang trước'),
    h('button', { class: 'btn btn-small', onclick: () => { page++; void reload(); } }, 'Trang sau'));
  root.append(h('div', { class: 'inline-form' }, topic, status), pager, nav, list);
  await reload();
  return root;
}

async function lessonsTab(): Promise<HTMLElement> {
  const db = supabase;
  const root = h('section', {});
  if (!db) return root;
  const msg = h('p', { class: 'note', role: 'status' });
  const list = h('ul', { class: 'rows' });

  const reload = async (): Promise<void> => {
    const { data, error } = await db.from('lessons').select('lesson_id,topic_code,ord,title,status').order('topic_code').order('ord');
    clear(list);
    if (error) { msg.textContent = 'Không tải được bài học.'; return; }
    for (const r of (data ?? []) as LRow[]) {
      list.append(h('li', {},
        h('span', {}, `${r.lesson_id} · ${r.title} · ${r.status}`),
        h('button', {
          class: 'btn btn-small',
          onclick: async () => {
            const next = r.status === 'approved' ? 'draft' : 'approved';
            const { error: e } = await db.from('lessons').update({ status: next }).eq('lesson_id', r.lesson_id);
            msg.textContent = e ? 'Không cập nhật được.' : '';
            await reload();
          },
        }, r.status === 'approved' ? 'Ẩn' : 'Duyệt')));
    }
  };
  root.append(msg, list);
  await reload();
  return root;
}
