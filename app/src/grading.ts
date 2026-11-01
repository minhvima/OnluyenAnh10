import type { Answer, Question } from './types';

/** Lowercase, unify quotes, collapse spaces, drop trailing . ! ? */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .trim()
    .replace(/[.!?]+$/, '')
    .trim();
}

/** Parse "Left 1 -> Right 2 | Left 2 -> Right 1" into a 0-based right-index per left item. */
export function parseMatchingKey(key: string): number[] {
  const out: number[] = [];
  for (const m of key.matchAll(/Left\s*(\d+)\s*->\s*Right\s*(\d+)/gi)) {
    out[Number(m[1]) - 1] = Number(m[2]) - 1;
  }
  return out;
}

/** Pure grading function. Returns false for a malformed answer. */
export function gradeAnswer(q: Question, answer: Answer): boolean {
  if (q.question_type === 'matching') {
    if (!Array.isArray(answer)) return false;
    const key = parseMatchingKey(q.correct_answer);
    return key.length > 0 && key.length === answer.length && key.every((r, i) => answer[i] === r);
  }
  if (typeof answer !== 'string') return false;
  if (q.question_type === 'fill_in_blank') {
    const given = normalizeText(answer);
    if (given === '') return false;
    return [q.correct_answer, ...q.accepted_answers].some((a) => normalizeText(a) === given);
  }
  return answer === q.correct_answer;
}

/** Fisher-Yates shuffle; pass a seeded rng for tests. Does not mutate the input. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Mastery: share of correct answers meets the threshold (default 0.8). */
export function isMastered(correct: number, total: number, threshold = 0.8): boolean {
  return total > 0 && correct / total >= threshold;
}

/** Spaced repetition for the mistake book: stage 0/1/2 -> review after 1/3/7 days. */
export const REVIEW_DAYS = [1, 3, 7] as const;

export function nextReview(
  stage: number,
  wasCorrect: boolean,
): { stage: number; days: number | null; mastered: boolean } {
  if (!wasCorrect) return { stage: 0, days: REVIEW_DAYS[0], mastered: false };
  const next = stage + 1;
  if (next >= REVIEW_DAYS.length) return { stage: REVIEW_DAYS.length, days: null, mastered: true };
  return { stage: next, days: REVIEW_DAYS[next], mastered: false };
}
