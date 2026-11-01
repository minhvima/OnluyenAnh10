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

/**
 * Runs one practice session: one question at a time, instant feedback, locked options.
 * Returns a cleanup function that removes the keyboard handler.
 */
export function mountPractice(host: HTMLElement, questions: Question[], onDone: (records: AnswerRecord[]) => void): () => void {
  const records: AnswerRecord[] = [];
  let index = 0;
  let cur: Prepared;
  let answered = false;
  let startedAt = 0;
  let submit: (() => void) | null = null;
  let next: HTMLButtonElement | null = null;

  function advance(): void {
    if (index + 1 >= questions.length) {
      onDone(records);
      return;
    }
    index++;
    show();
  }

  function feedback(ok: boolean): HTMLElement {
    const q = cur.q;
    return h('div', { class: `fb ${ok ? 'ok' : 'bad'}` },
      h('h3', {}, ok ? '✓ Chuẩn rồi!' : '✗ Chưa đúng, không sao đâu!'),
      // matching shows the right partner on each wrong row instead, which is shorter
      !ok && q.question_type !== 'matching' ? h('p', {}, h('b', {}, 'Đáp án đúng: '), h('span', { 'data-lk': 'en' }, correctText(q))) : null,
      h('p', { 'data-lk': 'mixed' }, q.explanation));
  }

  function finish(answer: Answer, fbHost: HTMLElement): boolean {
    answered = true;
    const ok = gradeAnswer(cur.q, answer);
    records.push({ question_id: cur.q.question_id, answer: serialize(answer), correct: ok, time_ms: Math.round(performance.now() - startedAt) });
    fbHost.replaceChildren(feedback(ok));
    void makeLookable(fbHost);
    if (next) {
      next.hidden = false;
      next.focus();
    }
    submit = null;
    return ok;
  }

  function show(): void {
    cur = prepare(questions[index]);
    answered = false;
    startedAt = performance.now();
    clear(host);
    const right = records.filter((r) => r.correct).length;
    const fbHost = h('div', { role: 'status', 'aria-live': 'polite' });
    let extra: HTMLElement | null = null; // matching: the Kiểm tra button shares the bottom row with Câu tiếp theo
    next = h('button', { class: 'btn', type: 'button', hidden: true, onclick: advance },
      index + 1 >= questions.length ? 'Xem kết quả ' : 'Câu tiếp theo ', h('kbd', {}, 'Enter')) as HTMLButtonElement;

    host.append(
      h('div', { class: 'prog' },
        h('span', {}, `Câu ${index + 1}/${questions.length}`),
        h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(questions.length), 'aria-valuenow': String(index), 'aria-label': 'Tiến độ bài' },
          h('i', { style: `width:${(index / questions.length) * 100}%` })),
        h('span', {}, `Đúng ${right}/${records.length}`)),
      promptEl(cur.q));

    if (cur.kind === 'choice') {
      const box = h('div', { class: 'opts', role: 'group', 'aria-labelledby': 'q-text' });
      for (const c of cur.choices) {
        const btn = h('button', { class: 'opt', type: 'button', 'data-k': c.letter, 'data-id': c.id },
          h('span', { class: 'key' }, c.letter), h('span', { 'data-lk': 'en' }, c.text)) as HTMLButtonElement;
        btn.addEventListener('click', () => choose(c.id));
        box.append(btn);
      }
      host.append(box);
    } else if (cur.kind === 'fill') {
      const input = h('input', { type: 'text', 'aria-label': 'Câu trả lời của em', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Gõ đáp án…' }) as HTMLInputElement;
      const check = h('button', { class: 'btn', type: 'submit' }, 'Kiểm tra');
      const form = h('form', { class: 'fill' }, input, check);
      const run = (): void => {
        if (answered || input.value.trim() === '') return;
        const ok = finish(input.value, fbHost);
        input.disabled = true;
        input.classList.add(ok ? 'right' : 'wrong');
        (check as HTMLButtonElement).disabled = true;
      };
      form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
      host.append(form);
      submit = run;
      queueMicrotask(() => input.focus());
    } else {
      const m = cur;
      const rows = m.lefts.map((left) => {
        const sel = h('select', { 'aria-label': `Ghép với: ${left}` }, h('option', { value: '' }, '— chọn —'),
          ...m.rights.map((r) => h('option', { value: String(r.index) }, r.text))) as HTMLSelectElement;
        const mark = h('span', { class: 'mark' });
        return { sel, mark, row: h('div', { class: 'pair' }, h('span', { 'data-lk': 'en' }, left), sel, mark) };
      });
      const note = h('p', { class: 'hint', role: 'status' });
      const check = h('button', { class: 'btn', type: 'button' }, 'Kiểm tra') as HTMLButtonElement;
      const run = (): void => {
        if (answered) return;
        if (rows.some((r) => r.sel.value === '')) { note.textContent = 'Em ghép đủ các cặp rồi bấm Kiểm tra nhé.'; return; }
        const answer = rows.map((r) => Number(r.sel.value));
        finish(answer, fbHost);
        const key = parseMatchingKey(m.q.correct_answer);
        rows.forEach((r, i) => {
          const ok = answer[i] === key[i];
          r.row.classList.add(ok ? 'right' : 'wrong');
          r.mark.textContent = ok ? '✓' : '✗';
          if (!ok) r.row.append(h('span', { class: 'fix', 'data-lk': 'en' }, `Đúng: ${(m.q.options as MatchPair[])[key[i]]?.right ?? ''}`));
          r.sel.disabled = true;
        });
        check.hidden = true;
      };
      check.addEventListener('click', run);
      host.append(h('div', { class: 'pairs' }, ...rows.map((r) => r.row)), note);
      extra = check;
      submit = run;
    }

    host.append(fbHost, h('div', { class: 'row' }, next, extra,
      h('span', { class: 'hint' }, cur.kind === 'choice'
        ? 'Phím tắt: A–D hoặc 1–4 chọn · Enter câu tiếp · T tra từ'
        : 'Enter: kiểm tra, rồi câu tiếp · T tra từ')));
    void makeLookable(host);
  }

  function choose(id: string): void {
    if (answered || cur.kind !== 'choice') return;
    const ok = finish(id, host.querySelector('[role=status]') as HTMLElement);
    for (const b of host.querySelectorAll<HTMLButtonElement>('.opt')) {
      b.disabled = true;
      const isRight = b.dataset.id === cur.q.correct_answer;
      if (isRight) {
        b.classList.add('right');
        b.append(h('span', { class: 'mark' }, '✓ Đúng'));
      } else if (b.dataset.id === id && !ok) {
        b.classList.add('wrong');
        b.append(h('span', { class: 'mark' }, '✗ Chưa đúng'));
      }
    }
  }

  function onKey(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement;
    if (t.closest('input,select,textarea')) return;
    if (document.getElementById('pop')?.hidden === false) return;
    if (!answered && cur.kind === 'choice') {
      const id = choiceForKey(e.key, cur.choices);
      if (id) { e.preventDefault(); choose(id); return; }
    }
    if (e.key === 'Enter' && !t.closest('button,a')) {
      e.preventDefault();
      if (answered) advance();
      else if (submit) submit();
    }
  }

  document.addEventListener('keydown', onKey);
  show();
  return () => document.removeEventListener('keydown', onKey);
}
