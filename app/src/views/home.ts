import { h } from '../lib/dom';
import { supabase } from '../lib/supabase';

interface TopicRow { topic_code: string; name_vi: string; name_en: string; sort_order: number; phase: number }

/** Placeholder home: lists topics read through RLS. The learn/practice screen arrives in Sprint 2. */
export async function homeView(): Promise<HTMLElement> {
  const list = h('ol', { class: 'topic-list' });
  const root = h('main', { class: 'page' }, h('h1', {}, 'Chủ điểm'), h('p', { class: 'note' }, 'Màn học và luyện sẽ có ở Sprint 2.'), list);
  if (!supabase) return root;
  const { data, error } = await supabase.from('topics').select('topic_code,name_vi,name_en,sort_order,phase').order('sort_order');
  if (error) {
    root.append(h('p', { class: 'error', role: 'alert' }, 'Không tải được danh sách chủ điểm.'));
    return root;
  }
  const rows = (data ?? []) as TopicRow[];
  if (rows.length === 0) root.append(h('p', { class: 'note' }, 'Chưa có chủ điểm nào.'));
  for (const t of rows) list.append(h('li', {}, `${t.name_vi} (${t.name_en}) — giai đoạn ${t.phase}`));
  return root;
}
