import { fetchLessonRefs, fetchProgress, fetchRuns, fetchTopics, type LessonRef, type PhaseRun, type Progress } from '../api';
import { h } from '../lib/dom';
import { supabase } from '../lib/supabase';
import { phaseSummaries, type PhaseSummary } from '../phase-data';
import { PASS_SCORE } from '../phase-test';
import { PHASES } from '../phases';
import type { Topic } from '../types';

// One colour per topic; none is the green/red used for right/wrong.
const COLORS: [string, string][] = [
  ['#4f46e5', '#e0e7ff'], ['#0e7490', '#cffafe'], ['#a21caf', '#fae8ff'], ['#b45309', '#fef3c7'], ['#be185d', '#fce7f3'],
  ['#0f766e', '#ccfbf1'], ['#6d28d9', '#ede9fe'], ['#9a3412', '#ffedd5'], ['#1d4ed8', '#dbeafe'], ['#7e22ce', '#f3e8ff'],
  ['#c2410c', '#ffedd5'], ['#0369a1', '#e0f2fe'], ['#4d7c0f', '#ecfccb'], ['#be123c', '#ffe4e6'],
];

export interface TopicStats { total: number; mastered: number; started: number }

export function topicStats(refs: LessonRef[], progress: Progress[], code: string): TopicStats {
  const ids = refs.filter((r) => r.topic_code === code).map((r) => r.lesson_id);
  const mine = progress.filter((p) => ids.includes(p.lesson_id));
  return { total: ids.length, mastered: mine.filter((p) => p.status === 'mastered').length, started: mine.length };
}

/** First lesson (in learning order) that is not mastered yet. */
export function nextLesson(topics: Topic[], refs: LessonRef[], progress: Progress[]): LessonRef | null {
  const done = new Set(progress.filter((p) => p.status === 'mastered').map((p) => p.lesson_id));
  for (const t of [...topics].sort((a, b) => a.sort_order - b.sort_order)) {
    const first = refs.filter((r) => r.topic_code === t.topic_code).sort((a, b) => a.ord - b.ord).find((r) => !done.has(r.lesson_id));
    if (first) return first;
  }
  return null;
}

function pillFor(s: TopicStats): HTMLElement {
  if (s.total === 0) return h('span', { class: 'pill todo' }, 'Sắp có');
  if (s.mastered === s.total) return h('span', { class: 'pill done' }, '✓ Đã đạt');
  if (s.started > 0) return h('span', { class: 'pill doing' }, 'Đang học');
  return h('span', { class: 'pill todo' }, 'Chưa học');
}

/** Card under each phase: the phase test, disabled until every lesson of the phase was practised once. */
function phaseTestCard(s: PhaseSummary): HTMLElement {
  if (s.total === 0) return h('div', {});
  const minutes = Math.round(s.plan.timeLimitS / 60);
  const meta = `${s.plan.questions} câu · ${minutes} phút · đạt từ ${PASS_SCORE}/10`;
  const status = s.attempts > 0
    ? `Cao nhất ${(s.best ?? 0).toFixed(1)}/10 · ${s.attempts} lần làm${s.passed ? ' · ✓ Đã đạt' : ''}`
    : s.unlocked ? 'Em đã sẵn sàng làm bài kiểm tra.' : `Mở khi em luyện hết các bài (${s.practiced}/${s.total} bài đã luyện).`;
  return h('section', { class: s.unlocked ? 'ptest open' : 'ptest locked', 'aria-label': `Bài kiểm tra giai đoạn ${s.phase}` },
    h('div', {}, h('h3', {}, `Bài kiểm tra ${PHASES[s.phase].title.split(' · ')[0]}`), h('p', { class: 'meta' }, meta), h('p', { class: 'st' }, status)),
    h('div', { class: 'actions' },
      s.unlocked
        ? h('a', { class: 'btn', href: `#/phase/${s.phase}` }, s.attempts > 0 ? 'Xem / làm lại' : 'Làm bài kiểm tra')
        : h('button', { class: 'btn', type: 'button', disabled: true, 'aria-disabled': 'true', title: 'Luyện hết các bài trong giai đoạn để mở' }, 'Chưa mở'),
      s.unlocked ? null : h('a', { class: 'link', href: `#/phase/${s.phase}` }, 'Xem còn thiếu bài nào')));
}

export async function homeView(email: string): Promise<HTMLElement> {
  const root = h('main', { class: 'page' });
  try {
    const [topics, refs, progress] = await Promise.all([fetchTopics(), fetchLessonRefs(), fetchProgress()]);
    let runs: PhaseRun[] = [];
    try {
      runs = await fetchRuns(); // fine if the history table does not exist yet
    } catch {
      runs = [];
    }
    const summaries = phaseSummaries(topics, refs, progress, runs, [1, 2, 3, 4]);
    let name = email.split('@')[0];
    if (supabase) {
      const { data } = await supabase.from('profiles').select('display_name').maybeSingle();
      if (data?.display_name) name = String(data.display_name);
    }
    const next = nextLesson(topics, refs, progress);
    root.append(h('section', { class: 'hello' },
      h('div', {}, h('h1', {}, `Chào ${name}, hôm nay học tiếp nhé!`),
        next ? h('p', {}, `Bài gợi ý: ${next.title} · khoảng ${next.estimated_minutes} phút`) : h('p', {}, 'Chưa có bài nào được mở. Nhờ phụ huynh duyệt bài học trong mục Quản trị nhé.')),
      next ? h('a', { class: 'btn', href: `#/lesson/${next.lesson_id}` }, 'Học tiếp') : null));

    if (topics.length === 0) root.append(h('p', { class: 'hint' }, 'Chưa có chủ điểm nào.'));
    for (const phase of [1, 2, 3, 4]) {
      const inPhase = topics.filter((t) => t.phase === phase);
      if (inPhase.length === 0) continue;
      root.append(h('div', { class: 'phase' }, h('h2', {}, PHASES[phase].title), h('span', {}, PHASES[phase].weeks)));
      const grid = h('div', { class: 'grid' });
      for (const t of inPhase) {
        const s = topicStats(refs, progress, t.topic_code);
        const [c, cb] = COLORS[(t.sort_order - 1) % COLORS.length];
        const pct = s.total ? Math.round((s.mastered / s.total) * 100) : 0;
        grid.append(h('a', { class: 'tcard', href: `#/topic/${t.topic_code}`, style: `--c:${c};--cb:${cb}` },
          h('header', {}, h('span', { class: 'num' }, String(t.sort_order)), h('h3', {}, t.name_vi)),
          h('div', { class: 'body' },
            h('p', { class: 'en' }, t.name_en),
            h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': `Tiến độ ${t.name_vi}` }, h('i', { style: `width:${pct}%` })),
            h('div', { class: 'meta' }, h('span', {}, `${s.mastered}/${s.total} bài đạt`), pillFor(s)))));
      }
      root.append(grid);
      const sum = summaries.find((x) => x.phase === phase);
      if (sum) root.append(phaseTestCard(sum));
    }
  } catch {
    root.append(h('p', { class: 'error', role: 'alert' }, 'Không tải được danh sách chủ điểm. Em kiểm tra mạng rồi tải lại trang nhé.'));
  }
  return root;
}
