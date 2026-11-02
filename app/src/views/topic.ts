import { fetchLessonRefs, fetchProgress, fetchTopics } from '../api';
import { h } from '../lib/dom';
import { loadTopicTest } from '../phase-data';
import { browserStore } from '../session-store';
import { loadTest, topicTestKey } from '../test-store';
import { appendTestInfo } from './phase';

export async function topicView(code: string, userId: string): Promise<HTMLElement> {
  const root = h('main', { class: 'page' }, h('a', { class: 'back', href: '#/' }, '‹ Về trang chủ'));
  try {
    const [topics, refs, progress] = await Promise.all([fetchTopics(), fetchLessonRefs(), fetchProgress()]);
    const topic = topics.find((t) => t.topic_code === code);
    if (!topic) {
      root.append(h('h1', {}, 'Không tìm thấy chủ điểm'));
      return root;
    }
    root.append(h('h1', {}, topic.name_vi), h('p', { class: 'hint' }, topic.name_en));
    const lessons = refs.filter((r) => r.topic_code === code).sort((a, b) => a.ord - b.ord);
    if (lessons.length === 0) {
      root.append(h('p', { class: 'hint' }, 'Chủ điểm này chưa có bài nào được mở.'));
      return root;
    }
    const byId = new Map(progress.map((p) => [p.lesson_id, p]));
    const list = h('ol', { class: 'lesson-list' });
    for (const l of lessons) {
      const p = byId.get(l.lesson_id);
      const pill = p?.status === 'mastered' ? h('span', { class: 'pill done' }, '✓ Đã đạt')
        : p ? h('span', { class: 'pill doing' }, `Đang học · cao nhất ${Math.round(p.best_score ?? 0)}%`)
        : h('span', { class: 'pill todo' }, 'Chưa học');
      list.append(h('li', {}, h('a', { href: `#/lesson/${l.lesson_id}` }, h('span', { class: 'n' }, String(l.ord)), h('span', { class: 't' }, l.title), pill)));
    }
    root.append(list);
    try {
      const data = await loadTopicTest(code);
      root.append(h('h2', { class: 'test-title' }, `Bài kiểm tra cuối chủ điểm "${topic.name_vi}"`));
      appendTestInfo(root, data, loadTest(browserStore(), topicTestKey(userId, code)) !== null);
    } catch {
      root.append(h('p', { class: 'hint' }, 'Chưa tải được bài kiểm tra cuối chủ điểm. Em tải lại trang nhé.'));
    }
  } catch {
    root.append(h('p', { class: 'error', role: 'alert' }, 'Không tải được danh sách bài. Em kiểm tra mạng rồi tải lại trang nhé.'));
  }
  return root;
}
