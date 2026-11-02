import { gradeAnswer, parseMatchingKey } from '../grading';
import type { AnswerRecord } from '../api';
import { clear, h } from '../lib/dom';
import { makeLookable } from '../lib/lookup';
import { choiceForKey, correctText, prepare, type Prepared } from '../quiz';
import { parseUnderline } from '../text';
import type { Answer, MatchPair, Question } from '../types';

function promptEl(q: Question): HTMLElement {
  const p = h('p', { class: 'q', id: 'q-text', 'data-lk': 'en' });
  for (const seg of parseUnderline(q.prompt)) {
    const parts = seg.text.split(/(_{3,})/);
    const holder = seg.underline ? h('u', {}) : p;
    for (const part of parts) {
      if (/^_{3,}$/.test(part)) holder.append(h('span', { class: 'blank', 'aria-label': 'chỗ trống' }));
      else if (part) holder.append(part);
    }
    if (seg.underline) p.append(holder);
  }
  return p;
}

const serialize = (a: Answer): string => (Array.isArray(a) ? JSON.stringify(a) : a);

interface Entry { answer: Answer; ok: boolean }

/**
 * Runs one practice session: one question at a time, instant feedback, locked options.
 * Answered questions can be opened again (chips above the question, or the arrow keys) to see
 * what was chosen and the explanation; the live question keeps its place.
 * Returns a cleanup function that removes the keyboard handler.
 */
export function mountPractice(host: HTMLElement, questions: Question[], onDone: (records: AnswerRecord[]) => void): () => void {
  const records: AnswerRecord[] = [];
  const history: Entry[] = []; // history[i] exists once question i has been answered
  const preps: Prepared[] = []; // fixed per question so the shuffled order never changes while reviewing
  const startedAt: number[] = [];
  let index = 0; // the live question
  let viewing: number | null = null; // an earlier question opened for review
  let submit: (() => void) | null = null;
  let live = true; // the live question accepts answers right now

  const prepFor = (i: number): Prepared => (preps[i] ??= prepare(questions[i]));
  const shownIndex = (): number => viewing ?? index;

  function go(target: number): void {
    viewing = target === index ? null : target;
    render();
  }

  function advance(): void {
    if (index + 1 >= questions.length) {
      onDone(records);
      return;
    }
    index++;
    viewing = null;
    render();
  }

  function feedback(q: Question, ok: boolean): HTMLElement {
    return h('div', { class: `fb ${ok ? 'ok' : 'bad'}` },
      h('h3', {}, ok ? '✓ Chuẩn rồi!' : '✗ Chưa đúng, không sao đâu!'),
      // matching shows the right partner on each wrong row instead, which is shorter
      !ok && q.question_type !== 'matching' ? h('p', {}, h('b', {}, 'Đáp án đúng: '), h('span', { 'data-lk': 'en' }, correctText(q))) : null,
      h('p', { 'data-lk': 'mixed' }, q.explanation));
  }

  function finish(answer: Answer): void {
    const q = questions[index];
    const ok = gradeAnswer(q, answer);
    records.push({ question_id: q.question_id, answer: serialize(answer), correct: ok, time_ms: Math.round(performance.now() - (startedAt[index] ?? performance.now())) });
    history[index] = { answer, ok };
    render();
  }

  /** Row of numbered chips: answered ones can be opened again, the others are just markers. */
  function chips(shown: number): HTMLElement {
    const nav = h('div', { class: 'chips', role: 'group', 'aria-label': 'Các câu trong bài' });
    questions.forEach((_, i) => {
      const e = history[i];
      const label = e ? `${i + 1}${e.ok ? '✓' : '✗'}` : String(i + 1);
      const cls = `chip ${e ? (e.ok ? 'ok' : 'bad') : i === index ? 'cur' : 'todo'}`;
      const aria = e ? `Câu ${i + 1}, đã làm, ${e.ok ? 'đúng' : 'sai'}. Bấm để xem lại` : i === index ? `Câu ${i + 1}, đang làm` : `Câu ${i + 1}, chưa làm`;
      const clickable = Boolean(e) || i === index;
      const el = clickable
        ? h('button', { class: cls, type: 'button', 'aria-label': aria, onclick: () => go(i) }, label)
        : h('span', { class: cls, 'aria-label': aria }, label);
      if (i === shown) el.setAttribute('aria-current', 'step');
      nav.append(el);
    });
    return nav;
  }

  function render(): void {
    clear(host);
    submit = null;
    const shown = shownIndex();
    const prep = prepFor(shown);
    const entry = history[shown] ?? null;
    const isCurrent = shown === index;
    live = entry === null && isCurrent;
    if (live && startedAt[index] === undefined) startedAt[index] = performance.now();
    const fbHost = h('div', { role: 'status', 'aria-live': 'polite' });
    let extra: HTMLElement | null = null; // matching: the Kiểm tra button shares the bottom row

    host.append(
      h('div', { class: 'prog' },
        h('span', {}, `Câu ${shown + 1}/${questions.length}`), chips(shown)),
      promptEl(prep.q));

    if (prep.kind === 'choice') {
      const box = h('div', { class: 'opts', role: 'group', 'aria-labelledby': 'q-text' });
      for (const c of prep.choices) {
        const btn = h('button', { class: 'opt', type: 'button', 'data-k': c.letter, 'data-id': c.id },
          h('span', { class: 'key' }, c.letter), h('span', { 'data-lk': 'en' }, c.text)) as HTMLButtonElement;
        if (entry) {
          btn.disabled = true;
          if (c.id === prep.q.correct_answer) {
            btn.classList.add('right');
            btn.append(h('span', { class: 'mark' }, '✓ Đúng'));
          } else if (c.id === entry.answer) {
            btn.classList.add('wrong');
            btn.append(h('span', { class: 'mark' }, '✗ Chưa đúng'));
          }
        } else btn.addEventListener('click', () => choose(c.id));
        box.append(btn);
      }
      host.append(box);
    } else if (prep.kind === 'fill') {
      const input = h('input', { type: 'text', 'aria-label': 'Câu trả lời của em', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Gõ đáp án…' }) as HTMLInputElement;
      const check = h('button', { class: 'btn', type: 'submit' }, 'Kiểm tra') as HTMLButtonElement;
      const form = h('form', { class: 'fill' }, input, check);
      if (entry) {
        input.value = String(entry.answer);
        input.disabled = true;
        input.classList.add(entry.ok ? 'right' : 'wrong');
        check.hidden = true;
      } else {
        form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
        submit = run;
        queueMicrotask(() => input.focus());
      }
      function run(): void {
        if (!live || input.value.trim() === '') return;
        finish(input.value);
      }
      host.append(form);
    } else {
      const m = prep;
      const key = parseMatchingKey(m.q.correct_answer);
      const rows = m.lefts.map((left, i) => {
        const sel = h('select', { 'aria-label': `Ghép với: ${left}` }, h('option', { value: '' }, '— chọn —'),
          ...m.rights.map((r) => h('option', { value: String(r.index) }, r.text))) as HTMLSelectElement;
        const mark = h('span', { class: 'mark' });
        const row = h('div', { class: 'pair' }, h('span', { 'data-lk': 'en' }, left), sel, mark);
        if (entry) {
          const given = (entry.answer as number[])[i];
          sel.value = String(given);
          sel.disabled = true;
          const ok = given === key[i];
          row.classList.add(ok ? 'right' : 'wrong');
          mark.textContent = ok ? '✓' : '✗';
          if (!ok) row.append(h('span', { class: 'fix', 'data-lk': 'en' }, `Đúng: ${(m.q.options as MatchPair[])[key[i]]?.right ?? ''}`));
        }
        return { sel, row };
      });
      const note = h('p', { class: 'hint', role: 'status' });
      host.append(h('div', { class: 'pairs' }, ...rows.map((r) => r.row)), note);
      if (!entry) {
        const check = h('button', { class: 'btn', type: 'button' }, 'Kiểm tra') as HTMLButtonElement;
        function run(): void {
          if (!live) return;
          if (rows.some((r) => r.sel.value === '')) { note.textContent = 'Em ghép đủ các cặp rồi bấm Kiểm tra nhé.'; return; }
          finish(rows.map((r) => Number(r.sel.value)));
        }
        check.addEventListener('click', run);
        extra = check;
        submit = run;
      }
    }

    let action: HTMLElement | null = null;
    if (entry) {
      fbHost.append(feedback(prep.q, entry.ok));
      if (isCurrent) {
        action = h('button', { class: 'btn', type: 'button', onclick: advance }, index + 1 >= questions.length ? 'Xem kết quả ' : 'Câu tiếp theo ', h('kbd', {}, 'Enter'));
      } else {
        action = h('button', { class: 'btn', type: 'button', onclick: () => go(index) }, 'Về câu đang làm ', h('kbd', {}, 'Enter'));
      }
    }
    host.append(fbHost, h('div', { class: 'row' }, action, extra,
      h('span', { class: 'hint' }, live
        ? (prep.kind === 'choice' ? 'Phím tắt: A–D hoặc 1–4 chọn · ←/→ xem lại · T tra từ' : 'Enter: kiểm tra · ←/→ xem lại · T tra từ')
        : 'Phím tắt: Enter tiếp tục · ←/→ xem câu khác · T tra từ')));
    void makeLookable(host);
    if (entry && action) queueMicrotask(() => action?.focus());
  }

  function choose(id: string): void {
    if (!live || prepFor(index).kind !== 'choice') return;
    finish(id);
  }

  function onKey(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement;
    if (t.closest?.('input,select,textarea')) return;
    if (document.getElementById('pop')?.hidden === false) return;
    const shown = shownIndex();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const target = shown + (e.key === 'ArrowLeft' ? -1 : 1);
      const reachable = target >= 0 && target <= index && (history[target] !== undefined || target === index);
      if (reachable) { e.preventDefault(); go(target); }
      return;
    }
    const prep = prepFor(shown);
    if (live && prep.kind === 'choice') {
      const id = choiceForKey(e.key, prep.choices);
      if (id) { e.preventDefault(); choose(id); return; }
    }
    if (e.key === 'Enter' && !t.closest?.('button,a')) {
      e.preventDefault();
      if (live) submit?.();
      else if (shown === index) advance();
      else go(index);
    }
  }

  document.addEventListener('keydown', onKey);
  render();
  return () => document.removeEventListener('keydown', onKey);
}
