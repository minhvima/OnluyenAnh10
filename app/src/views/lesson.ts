import { fetchLesson, fetchLessonRefs, fetchPool, fetchThreshold, saveSession, type AnswerRecord, type LessonRef } from '../api';
import { clear, h } from '../lib/dom';
import { lookupBar, makeLookable } from '../lib/lookup';
import { recordMistakes } from '../mistake-api';
import { correctText, pickQuestions } from '../quiz';
import type { Lesson, Question } from '../types';
import { browserStore, clearSession, loadSession, saveSession as saveProgress, sessionKey } from '../session-store';
import { mountPractice, type Progress } from './practice';
import { renderTheory } from './theory';

const SESSION_SIZE = 10;
let stopPractice: (() => void) | null = null;

function stateView(title: string, text: string): HTMLElement {
  return h('main', { class: 'state' }, h('h1', {}, title), h('p', {}, text), h('a', { class: 'btn', href: '#/' }, 'Về trang chủ'));
}

/** Learn + practice screen for one lesson: theory on the left, questions on the right. */
export async function lessonView(lessonId: string, userId: string): Promise<HTMLElement> {
  stopPractice?.();
  stopPractice = null;
  let loaded: [Lesson | null, LessonRef[], number];
  try {
    loaded = await Promise.all([fetchLesson(lessonId), fetchLessonRefs(), fetchThreshold()]);
  } catch {
    return stateView('Không tải được bài học', 'Em kiểm tra mạng rồi tải lại trang nhé.');
  }
  const [lessonRow, refs, threshold] = loaded;
  if (!lessonRow) return stateView('Chưa có bài này', 'Bài học chưa được mở hoặc không tồn tại.');
  const lesson: Lesson = lessonRow;

  let pool: Question[];
  try {
    pool = await fetchPool(lesson.topic_code, lesson.content.practice_tags ?? []);
  } catch {
    return stateView('Không tải được câu hỏi', 'Em kiểm tra mạng rồi tải lại trang nhé.');
  }

  const siblings = refs.filter((r) => r.topic_code === lesson.topic_code).sort((a, b) => a.ord - b.ord);
  const nextLesson = siblings.find((r) => r.ord > lesson.ord) ?? null;

  const theory = renderTheory(lesson);
  const practice = h('section', { class: 'panel practice', 'aria-label': 'Bài tập' });
  const host = h('div', {});
  practice.append(lookupBar(), host);

  // An unfinished session is kept in the browser: switching tabs, a reload or a discarded tab must not lose it.
  const store = browserStore();
  const key = sessionKey(userId, lesson.lesson_id);

  // Wrong answers go to the mistake book the moment they are given, so leaving halfway loses nothing.
  let bookFailed = false;
  const begin = (picked: Question[], resume?: Progress): void => {
    stopPractice?.();
    const qids = picked.map((q) => q.question_id);
    let booked = resume?.answers.length ?? 0;
    stopPractice = mountPractice(host, picked, (records) => { clearSession(store, key); void finished(records, picked); }, {
      resume,
      onChange: (p) => {
        saveProgress(store, key, { qids, ...p });
        while (booked < p.answers.length) {
          const q = picked[booked];
          const ok = p.answers[booked].ok;
          booked++;
          if (!ok) void recordMistakes(userId, [{ question_id: q.question_id, topic_code: q.topic_code }]).then((done) => { if (!done) bookFailed = true; });
        }
      },
    });
  };

  /** Pick questions again (first visit, or "Luyện thêm"). */
  const start = (): void => {
    stopPractice?.();
    clearSession(store, key);
    const picked = pickQuestions(pool, SESSION_SIZE);
    if (picked.length === 0) {
      host.replaceChildren(h('p', { class: 'hint' }, 'Bài này chưa có câu luyện tập. Em xem lý thuyết trước nhé.'));
      return;
    }
    begin(picked);
  };

  /** Carry on with a saved session when every saved question is still available. */
  const resumeOrStart = (): void => {
    const saved = loadSession(store, key);
    if (saved) {
      const byId = new Map(pool.map((q) => [q.question_id, q] as const));
      const qs = saved.qids.map((id) => byId.get(id));
      if (qs.every((q): q is Question => q !== undefined)) {
        begin(qs, saved);
        return;
      }
    }
    start();
  };

  async function finished(records: AnswerRecord[], picked: Question[]): Promise<void> {
    stopPractice?.();
    stopPractice = null;
    const correct = records.filter((r) => r.correct).length;
    const local = Math.round((correct / records.length) * 1000) / 10;
    let score = local;
    let mastered = local >= threshold * 100;
    let saveError = false;
    try {
      const saved = await saveSession(userId, lesson, records, threshold as number);
      score = saved.score;
      mastered = saved.mastered;
    } catch {
      saveError = true;
    }
    const missed = records.filter((r) => !r.correct).map((r) => picked.find((q) => q.question_id === r.question_id)).filter((q): q is Question => Boolean(q));
    clear(host);
    host.append(
      h('div', { class: 'summary' },
        h('h2', {}, mastered ? 'Giỏi lắm, em đạt rồi!' : 'Gần được rồi, luyện thêm chút nhé'),
        h('div', { class: `score ${score >= threshold * 100 ? 'ok' : 'low'}`, 'aria-label': `Điểm ${score} phần trăm` }, `${Math.round(score)}%`),
        h('p', {}, `Đúng ${correct}/${records.length} câu. Bài đạt khi đúng từ ${Math.round(threshold * 100)}% trở lên.`),
        mastered ? null : h('p', { class: 'hint' }, 'Em xem lại lý thuyết ở cột bên trái rồi luyện thêm. Bài sau vẫn mở, nhưng nắm chắc bài này trước sẽ dễ hơn.'),
        saveError ? h('p', { class: 'error', role: 'alert' }, 'Chưa lưu được kết quả (có thể do mạng). Kết quả lần này chưa được ghi lại.') : null,
        bookFailed ? h('p', { class: 'error', role: 'alert' }, 'Chưa ghi được các câu sai vào sổ lỗi sai (có thể do mạng). Nhờ phụ huynh báo lại nếu lỗi này cứ lặp lại.') : null,
        missed.length
          ? h('div', {}, h('h3', {}, 'Những câu cần xem lại'),
              h('ul', { class: 'missed' }, ...missed.map((q) => h('li', {}, h('span', { 'data-lk': 'en' }, q.prompt.replace(/<[^>]*>/g, '').replace(/_{3,}/g, '____')), h('br'), h('b', {}, 'Đáp án: '), h('span', { 'data-lk': 'en' }, correctText(q))))))
          : null,
        h('div', { class: 'row' },
          h('button', { class: 'btn', type: 'button', onclick: start }, 'Luyện thêm'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => theory.scrollTo({ top: 0, behavior: 'smooth' }) }, 'Xem lại lý thuyết'),
          nextLesson ? h('a', { class: 'btn ghost', href: `#/lesson/${nextLesson.lesson_id}` }, 'Bài tiếp theo') : h('a', { class: 'btn ghost', href: '#/' }, 'Về trang chủ'))));
    void makeLookable(host);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const root = h('div', {},
    h('div', { class: 'crumbbar' }, h('a', { class: 'back', href: `#/topic/${lesson.topic_code}` }, '‹ Về danh sách bài'), ` · Bài ${lesson.ord}/${siblings.length} · khoảng ${lesson.estimated_minutes} phút lý thuyết`),
    h('div', { class: 'lesson-wrap' }, theory, practice));
  void makeLookable(theory);
  resumeOrStart();
  return root;
}

/** Called by the router when leaving a lesson. */
export function leaveLesson(): void {
  stopPractice?.();
  stopPractice = null;
}
