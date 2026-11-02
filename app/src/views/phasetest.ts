import { saveRun, type PhaseRun } from '../api';
import { clear, h } from '../lib/dom';
import { lookupBar, makeLookable } from '../lib/lookup';
import { buildTest, loadBank, loadPhase, loadTopicTest, type PhaseData } from '../phase-data';
import { PASS_SCORE, feedbackFor, formatDuration, gradeTest, remainingSeconds, summarize, type TestResult } from '../phase-test';
import { PHASES } from '../phases';
import { choiceForKey, correctText, givenText, orderOf, prepareWithOrder, whyWrong, type Prepared } from '../quiz';
import { browserStore } from '../session-store';
import { clearTest, loadTest, saveTest, testKey, topicTestKey, type SavedTest } from '../test-store';
import type { Answer, Question } from '../types';
import { promptEl } from './practice';

let stopTest: (() => void) | null = null;

/** Called by the router when leaving the test screen (the test itself stays saved in the browser). */
export function leavePhaseTest(): void {
  stopTest?.();
  stopTest = null;
}

function stateView(title: string, text: string, href = '#/'): HTMLElement {
  return h('main', { class: 'state' }, h('h1', {}, title), h('p', {}, text), h('a', { class: 'btn', href }, 'Quay lại'));
}

const mmss = (s: number): string => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

interface RunCfg {
  host: HTMLElement;
  phase: number;
  heading: string;
  questions: Question[];
  startedAt: number;
  limitS: number;
  resume?: SavedTest;
  persist: (s: Omit<SavedTest, 'v' | 'ts'>) => void;
  onFinish: (answers: Record<string, Answer>, elapsedS: number, auto: boolean) => void;
}

/**
 * The test itself: one question at a time, free to move back and forth and change answers, no right/wrong
 * feedback until the paper is handed in. The clock runs against an absolute deadline, so switching tabs or
 * reloading never gives extra time or loses the work.
 */
function runTest(cfg: RunCfg): () => void {
  const { host, phase, heading, questions, startedAt, limitS } = cfg;
  const deadline = startedAt + limitS * 1000;
  const preps: Prepared[] = [];
  const answers: Record<string, Answer> = { ...(cfg.resume?.answers ?? {}) };
  let index = cfg.resume?.index ?? 0;
  let confirming = false;
  let finished = false;
  let announced5 = false;
  let announced1 = false;
  cfg.resume?.orders.forEach((o, i) => { if (o && i < questions.length) preps[i] = prepareWithOrder(questions[i], o); });

  const prepFor = (i: number): Prepared => (preps[i] ??= prepareWithOrder(questions[i], null));
  const isAnswered = (i: number): boolean => {
    const a = answers[questions[i].question_id];
    return Array.isArray(a) ? a.length > 0 && a.every((x) => x >= 0) : typeof a === 'string' && a.trim() !== '';
  };
  const answeredCount = (): number => questions.filter((_, i) => isAnswered(i)).length;

  let chipEls: HTMLElement[] = [];
  let timerEl: HTMLElement | null = null;
  let liveEl: HTMLElement | null = null;
  let countEl: HTMLElement | null = null;

  const persist = (): void =>
    cfg.persist({ phase, startedAt, limitS, qids: questions.map((q) => q.question_id), orders: questions.map((_, i) => (preps[i] ? orderOf(preps[i]) : null)), answers, index });

  function refreshChips(): void {
    chipEls.forEach((el, i) => {
      el.classList.toggle('done', isAnswered(i));
      if (i === index) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
    if (countEl) countEl.textContent = `Đã trả lời ${answeredCount()}/${questions.length}`;
  }

  function go(i: number): void {
    index = Math.max(0, Math.min(questions.length - 1, i));
    confirming = false;
    render();
  }

  function submit(auto: boolean): void {
    if (finished) return;
    finished = true;
    cleanup();
    cfg.onFinish(answers, Math.min(limitS, Math.round((Date.now() - startedAt) / 1000)), auto);
  }

  function tick(): void {
    if (finished) return;
    const rem = remainingSeconds(deadline, Date.now());
    if (timerEl) {
      timerEl.textContent = mmss(rem);
      timerEl.classList.toggle('warn', rem <= 300);
      timerEl.classList.toggle('urgent', rem <= 60);
    }
    if (liveEl && rem <= 300 && !announced5 && limitS > 360) { announced5 = true; liveEl.textContent = 'Còn 5 phút.'; }
    if (liveEl && rem <= 60 && !announced1) { announced1 = true; liveEl.textContent = 'Còn 1 phút.'; }
    if (rem === 0) submit(true);
  }

  function render(): void {
    clear(host);
    const prep = prepFor(index);
    const q = prep.q;
    timerEl = h('span', { class: 'timer', role: 'timer', 'aria-label': 'Thời gian còn lại' });
    liveEl = h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    countEl = h('span', {});
    chipEls = questions.map((_, i) => h('button', { class: 'chip', type: 'button', 'aria-label': `Câu ${i + 1}`, onclick: () => go(i) }, String(i + 1)));

    host.append(
      h('div', { class: 'test-head' }, h('h2', {}, heading), timerEl),
      liveEl,
      h('div', { class: 'prog' }, h('span', {}, `Câu ${index + 1}/${questions.length}`), countEl),
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Các câu trong bài kiểm tra' }, ...chipEls),
      promptEl(q));

    const save = (a: Answer | undefined): void => {
      if (a === undefined || a === '') delete answers[q.question_id];
      else answers[q.question_id] = a;
      persist();
      refreshChips();
    };

    if (prep.kind === 'choice') {
      const box = h('div', { class: 'opts', role: 'group', 'aria-labelledby': 'q-text' });
      for (const c of prep.choices) {
        const picked = answers[q.question_id] === c.id;
        const btn = h('button', { class: picked ? 'opt picked' : 'opt', type: 'button', 'data-k': c.letter, 'aria-pressed': String(picked) },
          h('span', { class: 'key' }, c.letter), h('span', { 'data-lk': 'en' }, c.text));
        btn.addEventListener('click', () => { save(c.id); render(); });
        box.append(btn);
      }
      host.append(box);
    } else if (prep.kind === 'fill') {
      const input = h('input', { type: 'text', class: 'test-input', 'aria-label': 'Câu trả lời của em', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Gõ đáp án…' }) as HTMLInputElement;
      input.value = typeof answers[q.question_id] === 'string' ? (answers[q.question_id] as string) : '';
      input.addEventListener('input', () => save(input.value));
      host.append(h('div', { class: 'fill' }, input));
    } else {
      const m = prep;
      const current = Array.isArray(answers[q.question_id]) ? (answers[q.question_id] as number[]) : m.lefts.map(() => -1);
      const rows = m.lefts.map((left, i) => {
        const sel = h('select', { 'aria-label': `Ghép với: ${left}` }, h('option', { value: '' }, '— chọn —'),
          ...m.rights.map((r) => h('option', { value: String(r.index) }, r.text))) as HTMLSelectElement;
        sel.value = current[i] >= 0 ? String(current[i]) : '';
        sel.addEventListener('change', () => {
          const next = rows.map((r) => (r.sel.value === '' ? -1 : Number(r.sel.value)));
          if (next.every((x) => x < 0)) delete answers[q.question_id];
          else answers[q.question_id] = next; // partial picks are kept, but count as answered only when every pair is chosen
          persist();
          refreshChips();
        });
        return { sel, row: h('div', { class: 'pair' }, h('span', { 'data-lk': 'en' }, left), sel, h('span', {})) };
      });
      host.append(h('div', { class: 'pairs' }, ...rows.map((r) => r.row)));
    }

    const unanswered = questions.length - answeredCount();
    if (confirming) {
      host.append(h('div', { class: 'confirm', role: 'alertdialog', 'aria-label': 'Xác nhận nộp bài' },
        h('p', {}, unanswered > 0 ? `Em còn ${unanswered} câu chưa trả lời. Câu bỏ trống sẽ tính là chưa đúng.` : 'Em đã trả lời hết các câu. Nộp bài nhé?'),
        h('div', { class: 'row' },
          h('button', { class: 'btn', type: 'button', onclick: () => submit(false) }, 'Nộp bài'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => { confirming = false; render(); } }, 'Làm tiếp'))));
    } else {
      host.append(h('div', { class: 'row test-foot' },
        h('button', { class: 'btn ghost', type: 'button', disabled: index === 0, onclick: () => go(index - 1) }, '‹ Câu trước'),
        h('button', { class: 'btn ghost', type: 'button', disabled: index === questions.length - 1, onclick: () => go(index + 1) }, 'Câu sau ›'),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn', type: 'button', onclick: () => { confirming = true; render(); } }, 'Nộp bài')));
      host.append(h('p', { class: 'hint' }, 'Phím tắt: A–D hoặc 1–4 chọn · ←/→ đổi câu · T tra từ. Em có thể quay lại sửa đáp án trước khi nộp.'));
    }
    refreshChips();
    persist(); // also remembers the current question and the shuffled option orders
    tick();
    void makeLookable(host);
  }

  function onKey(e: KeyboardEvent): void {
    if (finished || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement;
    if (t.closest?.('input,select,textarea')) return;
    if (document.getElementById('pop')?.hidden === false) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); return; }
    if (e.key === 'ArrowRight' || (e.key === 'Enter' && !t.closest?.('button,a') && !confirming)) { e.preventDefault(); go(index + 1); return; }
    const prep = prepFor(index);
    if (prep.kind === 'choice') {
      const id = choiceForKey(e.key, prep.choices);
      if (id) { e.preventDefault(); answers[prep.q.question_id] = id; persist(); render(); }
    }
  }

  const timerId = window.setInterval(tick, 1000);
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', tick);
  function cleanup(): void {
    window.clearInterval(timerId);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', tick);
  }
  render();
  return cleanup;
}

function plain(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/_{3,}/g, '____');
}

/** The result page: score, praise, weak spots, advice and a review of every question. */
function resultView(data: PhaseData, graded: ReturnType<typeof gradeTest>, result: TestResult, run: PhaseRun, saveFailed: boolean, auto: boolean): HTMLElement {
  const prev = data.runs[0]?.score ?? null;
  const fb = feedbackFor(result, data.topicName, prev, data.unit);
  const root = h('main', { class: 'page result' });

  root.append(
    h('section', { class: 'panel' },
      h('h1', {}, fb.headline),
      h('div', { class: 'scoreline' },
        h('div', { class: `score ${result.passed ? 'ok' : 'low'}`, 'aria-label': `Điểm ${result.score.toFixed(1)} trên 10` }, `${result.score.toFixed(1)}/10`),
        h('span', { class: result.passed ? 'pill done' : 'pill warn' }, result.passed ? '✓ Đạt' : `Chưa đạt (cần từ ${PASS_SCORE}/10)`)),
      h('p', { class: 'hint' }, `Đúng ${result.correct}/${result.total} câu · làm trong ${formatDuration(run.duration_s)} (tối đa ${formatDuration(run.time_limit_s)})${auto ? ' · hết giờ nên bài được nộp tự động' : ''}`),
      saveFailed ? h('p', { class: 'error', role: 'alert' }, 'Chưa lưu được kết quả vào lịch sử (có thể do mạng hoặc cơ sở dữ liệu chưa cập nhật). Lần làm này chưa được ghi lại.') : null,
      h('p', { class: 'praise' }, fb.praise)));

  const bars = h('div', { class: 'topic-bars' });
  for (const t of data.topics) {
    const s = result.topics.find((x) => x.topic_code === t.topic_code) ?? { topic_code: t.topic_code, correct: 0, total: 0 };
    const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
    const weak = result.weakTopics.includes(t.topic_code);
    bars.append(h('div', { class: 'tbar' },
      h('span', { class: 't' }, t.name_vi),
      h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': t.name_vi }, h('i', { style: `width:${pct}%` })),
      h('span', { class: 'n' }, `${s.correct}/${s.total}`),
      weak ? h('span', { class: 'pill warn' }, '! Cần ôn') : null));
  }
  if (!data.topicCode) root.append(h('section', { class: 'panel' }, h('h2', {}, 'Em làm thế nào ở từng chủ điểm?'), bars));

  const advice = h('section', { class: 'panel' }, h('h2', {}, 'Lời khuyên cho em'), h('p', {}, fb.advice));
  if (result.weakLessons.length > 0) {
    advice.append(h('ul', { class: 'weak-list' }, ...result.weakLessons.map((w) =>
      h('li', {}, h('a', { href: `#/lesson/${w.lesson_id}` }, `Bài ${w.ord} · ${w.title}`), ` (${data.topicName(w.topic_code)}) · sai ${w.missed}/${w.of} câu`))));
  }
  advice.append(h('div', { class: 'row' },
    h('a', { class: 'btn', href: data.testHref }, 'Làm lại bài kiểm tra'),
    h('a', { class: 'btn ghost', href: data.overviewHref }, 'Xem các lần làm trước'),
    h('a', { class: 'btn ghost', href: '#/' }, 'Về trang chủ')));
  root.append(advice);

  const review = h('section', { class: 'panel' }, h('h2', {}, 'Xem lại từng câu'));
  graded.forEach((g, i) => {
    const q = g.question;
    const reason = !g.correct && typeof g.answer === 'string' ? whyWrong(q, g.answer) : null;
    review.append(h('details', { class: `rv ${g.correct ? 'ok' : 'bad'}` },
      h('summary', {}, h('b', {}, `${g.correct ? '✓' : '✗'} Câu ${i + 1}. `), plain(q.prompt).slice(0, 90)),
      h('div', { class: 'rv-body' },
        h('p', {}, h('b', {}, 'Em chọn: '), h('span', { 'data-lk': 'en' }, givenText(q, g.answer))),
        g.correct ? null : h('p', {}, h('b', {}, 'Đáp án đúng: '), h('span', { 'data-lk': 'en' }, correctText(q))),
        reason ? h('p', {}, h('b', {}, 'Vì sao chưa đúng: '), h('span', { 'data-lk': 'mixed' }, reason)) : null,
        h('p', { 'data-lk': 'mixed' }, q.explanation))));
  });
  root.append(review);
  void makeLookable(root);
  return root;
}

export async function phaseTestView(phase: number, userId: string): Promise<HTMLElement> {
  leavePhaseTest();
  if (!PHASES[phase]) return stateView('Không có giai đoạn này', 'Em quay lại trang chủ nhé.');
  let data: PhaseData;
  try {
    data = await loadPhase(phase);
  } catch {
    return stateView('Không tải được bài kiểm tra', 'Em kiểm tra mạng rồi tải lại trang nhé.', `#/phase/${phase}`);
  }
  return testView(data, userId, testKey(userId, phase), `Kiểm tra ${data.title}`);
}

/** End-of-topic test: same engine and rules as the phase test, over the lessons of one topic. */
export async function topicTestView(topicCode: string, userId: string): Promise<HTMLElement> {
  leavePhaseTest();
  let data: PhaseData;
  try {
    data = await loadTopicTest(topicCode);
  } catch {
    return stateView('Không tải được bài kiểm tra', 'Em kiểm tra mạng rồi tải lại trang nhé.', `#/topic/${topicCode}`);
  }
  return testView(data, userId, topicTestKey(userId, topicCode), `Kiểm tra cuối chủ điểm · ${data.title}`);
}

async function testView(data: PhaseData, userId: string, key: string, heading: string): Promise<HTMLElement> {
  const { phase } = data;
  const store = browserStore();
  const saved = loadTest(store, key);
  if (!data.progress.unlocked && !saved) {
    return stateView('Bài kiểm tra chưa mở', `Em cần luyện mỗi bài trong ${data.unit} này ít nhất một lần (còn ${data.unpractised.length} bài).`, data.overviewHref);
  }

  let bank;
  try {
    bank = await loadBank(data.topics);
  } catch {
    return stateView('Không tải được câu hỏi', 'Em kiểm tra mạng rồi tải lại trang nhé.', data.overviewHref);
  }
  const byId = new Map([...bank.values()].flat().map((q) => [q.question_id, q] as const));

  let questions: Question[] | null = null;
  let resume: SavedTest | undefined;
  if (saved) {
    const qs = saved.qids.map((id) => byId.get(id));
    if (qs.every((q): q is Question => q !== undefined)) {
      questions = qs;
      resume = saved;
    } else clearTest(store, key);
  }
  if (!questions) {
    questions = await buildTest(data, bank);
    if (questions.length === 0) return stateView('Chưa có câu hỏi', `${data.unit === 'chủ điểm' ? 'Chủ điểm' : 'Giai đoạn'} này chưa có đủ câu hỏi để kiểm tra.`, data.overviewHref);
  }
  const startedAt = resume?.startedAt ?? Date.now();
  const limitS = resume?.limitS ?? Math.min(data.plan.timeLimitS, questions.length * 60);
  const finalQuestions = questions;

  const root = h('main', { class: 'test-wrap' });
  const panel = h('section', { class: 'panel test-panel', 'aria-label': 'Bài kiểm tra' });
  const host = h('div', { class: 'test-host' });
  panel.append(lookupBar(), host);
  root.append(panel);

  const onFinish = async (answers: Record<string, Answer>, elapsedS: number, auto: boolean): Promise<void> => {
    clearTest(store, key);
    const graded = gradeTest(finalQuestions, answers);
    const result = summarize(graded, data.lessons);
    const fb = feedbackFor(result, data.topicName, data.runs[0]?.score ?? null, data.unit);
    const finishedAt = new Date();
    const run: PhaseRun = {
      phase, ...(data.topicCode ? { topic_code: data.topicCode } : {}), started_at: new Date(startedAt).toISOString(), finished_at: finishedAt.toISOString(), duration_s: elapsedS, time_limit_s: limitS,
      n_questions: result.total, n_correct: result.correct, score: result.score, pass_score: PASS_SCORE, passed: result.passed,
      topic_scores: result.topics, weak_lessons: result.weakLessons, comment: fb.short,
      answers: graded.map((g) => ({ question_id: g.question.question_id, correct: g.correct })),
    };
    let saveFailed = false;
    try {
      await saveRun(userId, run);
    } catch {
      saveFailed = true;
    }
    const view = resultView(data, graded, result, run, saveFailed, auto);
    root.replaceChildren(view);
    window.scrollTo({ top: 0 });
  };

  stopTest = runTest({
    host, phase, heading, questions: finalQuestions, startedAt, limitS, resume,
    persist: (s) => saveTest(store, key, s),
    onFinish: (a, e, auto) => void onFinish(a, e, auto),
  });
  return root;
}
