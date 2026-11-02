import { normalizeText, shuffle } from './grading';
import type { Answer, ChoiceOption, Level, MatchPair, Question } from './types';

export const LETTERS = ['A', 'B', 'C', 'D'] as const;

export interface Choice { id: string; text: string; letter: string }
export type Prepared =
  | { kind: 'choice'; q: Question; choices: Choice[] }
  | { kind: 'fill'; q: Question }
  | { kind: 'match'; q: Question; lefts: string[]; rights: { text: string; index: number }[] };

/** error_identification options are labelled (A)-(D) inside the prompt, so they must keep their order. */
const SHUFFLEABLE = new Set(['multiple_choice', 'sentence_transformation', 'sentence_combination']);

/** Turn a stored question into what the screen shows: shuffled options with display letters. */
export function prepare(q: Question, rng: () => number = Math.random): Prepared {
  if (q.question_type === 'fill_in_blank') return { kind: 'fill', q };
  if (q.question_type === 'matching') {
    const pairs = q.options as MatchPair[];
    const rights = shuffle(pairs.map((p, i) => ({ text: p.right, index: i })), rng);
    return { kind: 'match', q, lefts: pairs.map((p) => p.left), rights };
  }
  const opts = q.options as ChoiceOption[];
  const ordered = SHUFFLEABLE.has(q.question_type) ? shuffle(opts, rng) : opts;
  return { kind: 'choice', q, choices: ordered.map((o, i) => ({ id: o.id, text: o.text, letter: LETTERS[i] ?? String(i + 1) })) };
}

/** The display order of a prepared question, so it can be saved and rebuilt exactly. */
export function orderOf(p: Prepared): string[] | number[] | null {
  if (p.kind === 'choice') return p.choices.map((c) => c.id);
  if (p.kind === 'match') return p.rights.map((r) => r.index);
  return null;
}

/** Rebuild a question with a saved display order; falls back to a fresh shuffle if the order does not fit. */
export function prepareWithOrder(q: Question, order: string[] | number[] | null): Prepared {
  if (q.question_type === 'matching' && order) {
    const pairs = q.options as MatchPair[];
    const idx = order as number[];
    const valid = idx.length === pairs.length && [...idx].sort((a, b) => a - b).every((v, i) => v === i);
    if (valid) return { kind: 'match', q, lefts: pairs.map((p) => p.left), rights: idx.map((i) => ({ text: pairs[i].right, index: i })) };
  }
  if (q.question_type !== 'matching' && q.question_type !== 'fill_in_blank' && order) {
    const opts = q.options as ChoiceOption[];
    const ids = order as string[];
    const ordered = ids.map((id) => opts.find((o) => o.id === id));
    if (ids.length === opts.length && ordered.every((o): o is ChoiceOption => Boolean(o)) && new Set(ids).size === ids.length) {
      return { kind: 'choice', q, choices: ordered.map((o, i) => ({ id: o.id, text: o.text, letter: LETTERS[i] ?? String(i + 1) })) };
    }
  }
  return prepare(q);
}

/** Option id for a pressed key: A-D or 1-4 (display position), or null. */
export function choiceForKey(key: string, choices: Choice[]): string | null {
  if (key.length !== 1) return null; // Enter, Escape, Tab... must never select an answer
  const k = key.toLowerCase();
  const pos = 'abcd'.indexOf(k) >= 0 ? 'abcd'.indexOf(k) : '1234'.indexOf(k);
  return pos >= 0 && pos < choices.length ? choices[pos].id : null;
}

/**
 * The saved reason why the given WRONG answer is wrong, or null when there is none.
 * Choice types look it up by option id; fill-in by the typed text (compared like the grader does).
 */
export function whyWrong(q: Question, answer: Answer): string | null {
  const why = q.why_wrong;
  if (!why || q.question_type === 'matching') return null;
  if (q.question_type === 'fill_in_blank') {
    if (typeof answer !== 'string') return null;
    const typed = normalizeText(answer);
    const hit = Object.keys(why).find((k) => normalizeText(k) === typed);
    return hit && why[hit].trim() && why[hit] !== '??' ? why[hit] : null;
  }
  if (typeof answer !== 'string') return null;
  const reason = why[answer];
  return reason && reason.trim() && reason !== '??' ? reason : null;
}

/** Plain-text correct answer, shown after a wrong answer. */
export function correctText(q: Question): string {
  if (q.question_type === 'fill_in_blank') return q.correct_answer;
  if (q.question_type === 'matching') return (q.options as MatchPair[]).map((p) => `${p.left} → ${p.right}`).join(' · ');
  const opt = (q.options as ChoiceOption[]).find((o) => o.id === q.correct_answer);
  return opt ? opt.text : q.correct_answer;
}

/** Plain-text version of what the student answered, for the review list. */
export function givenText(q: Question, answer: Answer | undefined): string {
  if (answer === undefined || answer === '') return '(chưa trả lời)';
  if (q.question_type === 'fill_in_blank') return typeof answer === 'string' ? answer : '';
  if (q.question_type === 'matching') {
    if (!Array.isArray(answer)) return '';
    const pairs = q.options as MatchPair[];
    return pairs.map((p, i) => `${p.left} → ${answer[i] >= 0 && pairs[answer[i]] ? pairs[answer[i]].right : '…'}`).join(' · ');
  }
  const opt = (q.options as ChoiceOption[]).find((o) => o.id === answer);
  return opt ? opt.text : String(answer);
}

const LEVEL_ORDER: Level[] = ['Recognition', 'Comprehension', 'Application'];

/**
 * Pick n questions for one lesson, aiming at ~50/30/20 Recognition/Comprehension/Application,
 * topping up from whatever is left when a level is short. Output goes easy -> hard.
 */
export function pickQuestions(pool: Question[], n: number, rng: () => number = Math.random): Question[] {
  const byLevel = new Map<Level, Question[]>(LEVEL_ORDER.map((l) => [l, shuffle(pool.filter((q) => q.cognitive_level === l), rng)]));
  const want: Record<Level, number> = {
    Recognition: Math.round(n * 0.5),
    Comprehension: Math.round(n * 0.3),
    Application: n - Math.round(n * 0.5) - Math.round(n * 0.3),
  };
  const chosen: Question[] = [];
  for (const l of LEVEL_ORDER) chosen.push(...(byLevel.get(l) ?? []).splice(0, want[l]));
  const rest = shuffle(LEVEL_ORDER.flatMap((l) => byLevel.get(l) ?? []), rng);
  while (chosen.length < n && rest.length > 0) chosen.push(rest.shift() as Question);
  return chosen.slice(0, n).sort((a, b) => LEVEL_ORDER.indexOf(a.cognitive_level) - LEVEL_ORDER.indexOf(b.cognitive_level));
}
