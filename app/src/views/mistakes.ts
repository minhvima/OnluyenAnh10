import { fetchTopics } from '../api';
import { clear, h } from '../lib/dom';
import { lookupBar, makeLookable } from '../lib/lookup';
import { fetchMistakes, fetchQuestionsByIds, saveLapse, saveReviewAnswer } from '../mistake-api';
import { REVIEW_SESSION_MAX, countBook, daysOverdue, isDue, peekLapse, pickDue, statusLabel, type MistakeRow } from '../mistake-book';
import { correctText } from '../quiz';
import type { Question, Topic } from '../types';
import { mountPractice } from './practice';

let stopReview: (() => void) | null = null;
const PAGE = 30;

/** Called by the router when leaving this screen. */
export function leaveMistakes(): void {
  stopReview?.();
  stopReview = null;
}

const plain = (s: string): string => s.replace(/<[^>]*>/g, '').replace(/_{3,}/g, '____');
const short = (s: string, n = 90): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function stat(value: number, label: string, cls = ''): HTMLElement {
  return h('div', { class: `mb-stat ${cls}` }, h('b', {}, String(value)), h('span', {}, label));
}

/** The student's mistake book: counts, a button to review what is due, and the full list. */
export async function mistakesView(userId: string, autoStart = false): Promise<HTMLElement> {
  leaveMistakes();
  const root = h('main', { class: 'page mb' });
  let topics: Topic[];
  let rows: MistakeRow[];
  try {
    [topics, rows] = await Promise.all([fetchTopics(), fetchMistakes()]);
  } catch {
    root.append(h('a', { class: 'back', href: '#/' }, '‹ Về trang chủ'), h('h1', {}, 'Sổ lỗi sai'),
      h('p', { class: 'error', role: 'alert' }, 'Chưa tải được sổ lỗi sai. Em kiểm tra mạng rồi tải lại trang nhé.'));
    return root;
  }
  const topicName = new Map(topics.map((t) => [t.topic_code, t.name_vi] as const));
  const byId = new Map(rows.map((r) => [r.question_id, r] as const));
  const qCache = new Map<string, Question>();

  let filter = '';
  let showMastered = false;
  const revealed = new Set<string>(); // answers the student chose to look at in this visit
  let shown = PAGE;

  /** Show the list screen (also used when coming back from a review). */
  function showList(): void {
    leaveMistakes();
    clear(root);
    const now = new Date();
    const all = [...byId.values()];
    const c = countBook(all, now);
    const batch = Math.min(c.due, REVIEW_SESSION_MAX);
    root.append(
      h('a', { class: 'back', href: '#/' }, '‹ Về trang chủ'),
      h('h1', {}, 'Sổ lỗi sai'),
      h('p', { class: 'hint' }, 'Câu nào em làm sai sẽ tự vào đây. Em làm lại sau 1 ngày, 3 ngày, 7 ngày; đúng cả ba lần là em đã nắm câu đó. Muốn nhớ lâu, em đừng xem đáp án trước: xem đáp án một câu đang đến hạn thì câu đó phải ôn lại từ đầu.'));

    if (all.length === 0) {
      root.append(h('section', { class: 'panel mb-empty' }, h('h2', {}, 'Sổ đang trống'),
        h('p', {}, 'Khi em làm sai câu nào ở bài luyện hoặc bài kiểm tra, câu đó sẽ tự vào đây để em ôn lại đúng lúc.'),
        h('a', { class: 'btn', href: '#/' }, 'Về trang chủ')));
      return;
    }

    root.append(h('section', { class: 'panel mb-top' },
      h('div', { class: 'mb-stats' }, stat(c.due, 'cần ôn hôm nay', c.due ? 'due' : ''), stat(c.open, 'đang theo dõi'), stat(c.mastered, 'đã nắm')),
      h('div', { class: 'mb-go' },
        c.due > 0
          ? h('button', { class: 'btn', type: 'button', onclick: () => void startReview() }, `Ôn ngay ${batch} câu`)
          : h('p', { class: 'hint' }, c.open > 0 ? '✓ Hôm nay không có câu nào cần ôn. Em quay lại vào hôm sau nhé.' : '✓ Em đã nắm hết các câu trong sổ.'),
        c.due > batch ? h('p', { class: 'hint' }, `Mỗi lần ôn tối đa ${REVIEW_SESSION_MAX} câu, còn ${c.due - batch} câu để lần sau.`) : null)));

    // list with filters
    const usedTopics = [...new Set(all.map((r) => r.topic_code))].sort((a, b) => (topicName.get(a) ?? a).localeCompare(topicName.get(b) ?? b, 'vi'));
    const sel = h('select', { 'aria-label': 'Lọc theo chủ điểm', onchange: () => { filter = sel.value; shown = PAGE; void renderItems(); } },
      h('option', { value: '' }, 'Tất cả chủ điểm'),
      ...usedTopics.map((t) => h('option', { value: t }, topicName.get(t) ?? t))) as HTMLSelectElement;
    sel.value = filter;
    const chk = h('input', { type: 'checkbox', id: 'mb-show-mastered', onchange: () => { showMastered = chk.checked; shown = PAGE; void renderItems(); } }) as HTMLInputElement;
    chk.checked = showMastered;
    const list = h('div', { class: 'mb-list', 'aria-live': 'polite' });
    root.append(h('h2', { class: 'mb-h2' }, 'Các câu trong sổ'),
      h('div', { class: 'mb-filters' }, sel, h('label', { for: 'mb-show-mastered', class: 'mb-check' }, chk, ' Hiện cả câu đã nắm')), list);

    async function renderItems(): Promise<void> {
      const t = new Date();
      const visible = [...byId.values()]
        .filter((r) => (filter === '' || r.topic_code === filter) && (showMastered || !r.mastered))
        .sort((a, b) => Number(a.mastered) - Number(b.mastered) || Number(isDue(b, t)) - Number(isDue(a, t)) || daysOverdue(b, t) - daysOverdue(a, t) || a.next_review_at.localeCompare(b.next_review_at));
      clear(list);
      if (visible.length === 0) { list.append(h('p', { class: 'hint' }, 'Không có câu nào trong mục này.')); return; }
      const page = visible.slice(0, shown);
      const missing = page.map((r) => r.question_id).filter((id) => !qCache.has(id));
      if (missing.length) {
        list.append(h('p', { class: 'hint' }, 'Đang tải câu hỏi…'));
        try {
          for (const q of await fetchQuestionsByIds(missing)) qCache.set(q.question_id, q);
        } catch {
          clear(list);
          list.append(h('p', { class: 'error', role: 'alert' }, 'Chưa tải được nội dung câu hỏi. Em tải lại trang nhé.'));
          return;
        }
        clear(list);
      }
      for (const r of page) {
        const q = qCache.get(r.question_id);
        const status = statusLabel(r, t);
        const pill = h('span', { class: `pill ${r.mastered ? 'done' : isDue(r, t) ? 'warn' : 'todo'}` }, status);
        if (!q) {
          list.append(h('div', { class: 'mb-item gone' }, h('span', {}, `Câu ${r.question_id} không còn trong ngân hàng.`), pill));
          continue;
        }
        const showAnswer = r.mastered || revealed.has(r.question_id);
        const due = isDue(r, t);
        const body = h('div', { class: 'mb-body' }, h('p', { 'data-lk': 'en' }, plain(q.prompt)));
        if (showAnswer) {
          body.append(h('p', {}, h('b', {}, 'Đáp án: '), h('span', { 'data-lk': 'en' }, correctText(q))), h('p', { 'data-lk': 'mixed' }, q.explanation));
        } else {
          const msg = h('p', { class: 'hint', role: 'status' }, due
            ? 'Em thử nhớ lại đáp án trước đã. Nếu xem đáp án bây giờ, câu này sẽ phải ôn lại từ đầu (hẹn lại sau 1 ngày).'
            : 'Em thử nhớ lại đáp án trước đã. Câu này chưa đến hạn ôn nên xem bây giờ không bị tính lại.');
          const btn = h('button', { class: 'btn btn-small ghost', type: 'button' }, due ? 'Vẫn xem đáp án (phải ôn lại)' : 'Xem đáp án') as HTMLButtonElement;
          btn.addEventListener('click', async () => {
            if (due) {
              btn.disabled = true;
              try {
                const next = peekLapse(r, new Date());
                await saveLapse(userId, next);
                byId.set(r.question_id, next);
              } catch {
                btn.disabled = false;
                msg.textContent = 'Chưa lưu được nên chưa hiện đáp án. Em kiểm tra mạng rồi thử lại nhé.';
                return;
              }
              revealed.add(r.question_id);
              showList(); // counts and the status label changed
            } else {
              revealed.add(r.question_id);
              void renderItems();
            }
          });
          body.append(msg, btn);
        }
        list.append(h('details', { class: 'mb-item', ...(revealed.has(r.question_id) ? { open: true } : {}) },
          h('summary', {}, h('span', { class: 'mb-q', 'data-lk': 'en' }, short(plain(q.prompt))),
            h('span', { class: 'mb-meta' }, topicName.get(r.topic_code) ?? r.topic_code, ` · sai ${r.wrong_count} lần`), pill),
          body));
      }
      if (visible.length > shown) {
        list.append(h('button', { class: 'btn ghost', type: 'button', onclick: () => { shown += PAGE; void renderItems(); } }, `Xem thêm (${visible.length - shown} câu)`));
      }
      void makeLookable(list);
    }
    void renderItems();
  }

  /** Run one review session over the questions that are due (at most 20). */
  async function startReview(): Promise<void> {
    leaveMistakes();
    clear(root);
    root.append(h('a', { class: 'back', href: '#/mistakes', onclick: (e: Event) => { e.preventDefault(); showList(); } }, '‹ Về sổ lỗi sai'),
      h('h1', {}, 'Ôn lại câu đã sai'), h('p', { class: 'hint' }, 'Đang tải câu hỏi…'));
    const due = pickDue([...byId.values()], new Date());
    let questions: Question[];
    try {
      const found = new Map((await fetchQuestionsByIds(due.map((r) => r.question_id))).map((q) => [q.question_id, q] as const));
      questions = due.map((r) => found.get(r.question_id)).filter((q): q is Question => q !== undefined);
    } catch {
      clear(root);
      root.append(h('a', { class: 'back', href: '#/' }, '‹ Về trang chủ'), h('p', { class: 'error', role: 'alert' }, 'Chưa tải được câu hỏi. Em kiểm tra mạng rồi thử lại nhé.'));
      return;
    }
    if (questions.length === 0) { showList(); return; }

    const host = h('div', {});
    const panel = h('section', { class: 'panel practice mb-review', 'aria-label': 'Ôn lại câu đã sai' });
    panel.append(lookupBar(), host);
    root.replaceChildren(h('a', { class: 'back', href: '#/mistakes', onclick: (e: Event) => { e.preventDefault(); showList(); } }, '‹ Về sổ lỗi sai'),
      h('h1', {}, 'Ôn lại câu đã sai'), panel);

    // Every answer is saved as soon as it is given, so leaving halfway keeps the progress.
    let saved = 0;
    let saveFailed = false;
    let becameMastered = 0;
    let chain: Promise<void> = Promise.resolve();
    const onChange = (p: { answers: { ok: boolean }[] }): void => {
      while (saved < p.answers.length) {
        const q = questions[saved];
        const ok = p.answers[saved].ok;
        saved++;
        chain = chain.then(async () => {
          const row = byId.get(q.question_id);
          if (!row) return;
          try {
            const next = await saveReviewAnswer(userId, row, ok);
            if (next.mastered && !row.mastered) becameMastered++;
            byId.set(q.question_id, next);
          } catch {
            saveFailed = true;
          }
        });
      }
    };

    stopReview = mountPractice(host, questions, (records) => {
      stopReview?.();
      stopReview = null;
      void chain.then(() => {
        const right = records.filter((r) => r.correct).length;
        const left = countBook([...byId.values()], new Date()).due;
        clear(host);
        host.append(h('div', { class: 'summary' },
          h('h2', {}, right === records.length ? 'Tuyệt vời, em nhớ hết rồi!' : 'Xong lượt ôn hôm nay!'),
          h('p', {}, `Em làm đúng ${right}/${records.length} câu.`),
          becameMastered > 0 ? h('p', {}, `Có ${becameMastered} câu em đã nắm hẳn, sẽ được cất khỏi danh sách cần ôn.`) : null,
          records.length > right ? h('p', { class: 'hint' }, 'Câu làm sai sẽ quay lại sau 1 ngày. Câu đúng sẽ hẹn lần ôn sau xa hơn.') : null,
          left > 0 ? h('p', { class: 'hint' }, `Vẫn còn ${left} câu đến hạn, em có thể ôn tiếp.`) : null,
          saveFailed ? h('p', { class: 'error', role: 'alert' }, 'Có câu chưa lưu được kết quả (có thể do mạng). Lần sau sổ có thể hiện lại câu đó.') : null,
          h('div', { class: 'row' },
            left > 0 ? h('button', { class: 'btn', type: 'button', onclick: () => void startReview() }, 'Ôn tiếp') : null,
            h('button', { class: `btn${left > 0 ? ' ghost' : ''}`, type: 'button', onclick: showList }, 'Về sổ lỗi sai'),
            h('a', { class: 'btn ghost', href: '#/' }, 'Về trang chủ'))));
        void makeLookable(host);
      });
    }, { onChange });
  }

  if (autoStart && pickDue([...byId.values()], new Date()).length > 0) void startReview();
  else showList();
  return root;
}
