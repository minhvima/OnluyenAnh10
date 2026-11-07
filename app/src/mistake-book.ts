import { nextReview } from './grading';

/** Pure logic of the mistake book (no network, no DOM) so it can be unit tested. */

export interface MistakeRow {
  question_id: string;
  topic_code: string;
  wrong_count: number;
  /** 0/1/2 = waiting for the review after 1/3/7 days; 3 = mastered. */
  stage: number;
  next_review_at: string;
  mastered: boolean;
  last_wrong_at: string;
  reviews_count: number;
  last_reviewed_at: string | null;
}

/** Most questions offered in one review session. */
export const REVIEW_SESSION_MAX = 20;

const DAY_MS = 86_400_000;

/** Calendar day (yyyy-mm-dd) in Vietnam time, so "due today" matches the student's own day. */
export function vnDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

const addDays = (now: Date, days: number): string => new Date(now.getTime() + days * DAY_MS).toISOString();

/** A question is due once its review day (Vietnam time) has come; the time of day does not matter. */
export function isDue(row: MistakeRow, now: Date): boolean {
  return !row.mastered && vnDate(row.next_review_at) <= vnDate(now);
}

/** Whole days a due question is late (0 when it is due today). */
export function daysOverdue(row: MistakeRow, now: Date): number {
  const a = Date.parse(vnDate(now) + 'T00:00:00Z');
  const b = Date.parse(vnDate(row.next_review_at) + 'T00:00:00Z');
  return Math.max(0, Math.round((a - b) / DAY_MS));
}

/** Due questions for one review session: latest overdue first, then the ones missed most often. */
export function pickDue(rows: MistakeRow[], now: Date, limit = REVIEW_SESSION_MAX): MistakeRow[] {
  return rows
    .filter((r) => isDue(r, now))
    .sort((a, b) => daysOverdue(b, now) - daysOverdue(a, now) || b.wrong_count - a.wrong_count || a.question_id.localeCompare(b.question_id))
    .slice(0, limit);
}

/** A wrong answer (anywhere in the app) puts the question in the book, or sends it back to stage 0. */
export function recordWrong(existing: MistakeRow | undefined, q: { question_id: string; topic_code: string }, now: Date): MistakeRow {
  const next = addDays(now, 1);
  if (!existing) {
    return { question_id: q.question_id, topic_code: q.topic_code, wrong_count: 1, stage: 0, next_review_at: next, mastered: false, last_wrong_at: now.toISOString(), reviews_count: 0, last_reviewed_at: null };
  }
  return { ...existing, wrong_count: existing.wrong_count + 1, stage: 0, next_review_at: next, mastered: false, last_wrong_at: now.toISOString() };
}

/** Result of one review answer: correct moves to the next stage (1 -> 3 -> 7 days, then mastered), wrong starts over. */
export function applyReview(row: MistakeRow, correct: boolean, now: Date): MistakeRow {
  const r = nextReview(row.stage, correct);
  return {
    ...row,
    stage: r.stage,
    mastered: r.mastered,
    next_review_at: r.days === null ? row.next_review_at : addDays(now, r.days),
    wrong_count: correct ? row.wrong_count : row.wrong_count + 1,
    last_wrong_at: correct ? row.last_wrong_at : now.toISOString(),
    reviews_count: row.reviews_count + 1,
    last_reviewed_at: now.toISOString(),
  };
}

export interface BookCounts { open: number; due: number; mastered: number }

export function countBook(rows: MistakeRow[], now: Date): BookCounts {
  return {
    open: rows.filter((r) => !r.mastered).length,
    due: rows.filter((r) => isDue(r, now)).length,
    mastered: rows.filter((r) => r.mastered).length,
  };
}

/** Short Vietnamese label for where a question stands, for the list in the book. */
export function statusLabel(row: MistakeRow, now: Date): string {
  if (row.mastered) return '✓ Đã nắm';
  if (isDue(row, now)) {
    const late = daysOverdue(row, now);
    return late > 0 ? `Cần ôn (trễ ${late} ngày)` : 'Cần ôn hôm nay';
  }
  const d = vnDate(row.next_review_at);
  return `Ôn lại ngày ${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

/** Warning for the parent about one student: questions that stayed unreviewed for 3 days or more. */
export interface MistakeSummary {
  user_id: string;
  open_count: number;
  due_count: number;
  overdue_count: number;
  mastered_count: number;
  last_reviewed_at: string | null;
}

export const MISTAKE_OVERDUE_DAYS = 3;

export function mistakeAlerts(rows: MistakeSummary[], nameOf: (id: string) => string): { userId: string; text: string }[] {
  return rows
    .filter((r) => r.overdue_count > 0)
    .map((r) => ({ userId: r.user_id, text: `${nameOf(r.user_id)} có ${r.overdue_count} câu trong sổ lỗi sai quá hạn ôn từ ${MISTAKE_OVERDUE_DAYS} ngày trở lên.` }));
}
