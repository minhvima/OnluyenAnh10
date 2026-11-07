import { describe, expect, it } from 'vitest';
import { applyReview, peekLapse, countBook, daysOverdue, isDue, mistakeAlerts, pickDue, recordWrong, statusLabel, vnDate, type MistakeRow } from './mistake-book';

const NOW = new Date('2026-11-10T03:00:00Z'); // 10:00 on 10 Nov in Vietnam
const row = (o: Partial<MistakeRow> = {}): MistakeRow => ({
  question_id: 'Q_TENSES_001', topic_code: 'TENSES', wrong_count: 1, stage: 0, next_review_at: '2026-11-10T03:00:00Z', mastered: false,
  last_wrong_at: '2026-11-09T03:00:00Z', reviews_count: 0, last_reviewed_at: null, ...o,
});

describe('vnDate', () => {
  it('uses the Vietnam calendar day, not UTC', () => {
    expect(vnDate('2026-11-09T20:00:00Z')).toBe('2026-11-10'); // 03:00 next day in Vietnam
    expect(vnDate('2026-11-09T16:59:00Z')).toBe('2026-11-09');
  });
});

describe('recordWrong', () => {
  it('adds a new question at stage 0, due in 1 day', () => {
    const r = recordWrong(undefined, { question_id: 'Q_A_001', topic_code: 'A' }, NOW);
    expect(r).toMatchObject({ question_id: 'Q_A_001', topic_code: 'A', wrong_count: 1, stage: 0, mastered: false, reviews_count: 0 });
    expect(vnDate(r.next_review_at)).toBe('2026-11-11');
  });
  it('sends an existing or mastered question back to stage 0 and counts the miss', () => {
    const r = recordWrong(row({ stage: 3, mastered: true, wrong_count: 2, reviews_count: 3 }), { question_id: 'Q_TENSES_001', topic_code: 'TENSES' }, NOW);
    expect(r).toMatchObject({ stage: 0, mastered: false, wrong_count: 3, reviews_count: 3 });
    expect(vnDate(r.next_review_at)).toBe('2026-11-11');
  });
});

describe('isDue / daysOverdue', () => {
  it('is due on its review day whatever the time of day', () => {
    expect(isDue(row({ next_review_at: '2026-11-10T16:00:00Z' }), NOW)).toBe(true); // 23:00 on 10 Nov is still 10 Nov in Vietnam
  });
  it('is not due before its day and never due when mastered', () => {
    expect(isDue(row({ next_review_at: '2026-11-11T03:00:00Z' }), NOW)).toBe(false);
    expect(isDue(row({ mastered: true, next_review_at: '2026-11-01T03:00:00Z' }), NOW)).toBe(false);
  });
  it('counts whole late days', () => {
    expect(daysOverdue(row({ next_review_at: '2026-11-07T03:00:00Z' }), NOW)).toBe(3);
    expect(daysOverdue(row({ next_review_at: '2026-11-12T03:00:00Z' }), NOW)).toBe(0);
  });
});

describe('applyReview', () => {
  it('moves 0 -> 1 -> 2 -> mastered with 3 and 7 day gaps', () => {
    const a = applyReview(row({ stage: 0 }), true, NOW);
    expect(a).toMatchObject({ stage: 1, mastered: false, reviews_count: 1 });
    expect(vnDate(a.next_review_at)).toBe('2026-11-13');
    const b = applyReview(a, true, NOW);
    expect(b.stage).toBe(2);
    expect(vnDate(b.next_review_at)).toBe('2026-11-17');
    const c = applyReview(b, true, NOW);
    expect(c).toMatchObject({ stage: 3, mastered: true, reviews_count: 3 });
    expect(c.next_review_at).toBe(b.next_review_at); // mastered rows keep their old date
  });
  it('a miss starts over and counts', () => {
    const r = applyReview(row({ stage: 2, wrong_count: 1 }), false, NOW);
    expect(r).toMatchObject({ stage: 0, mastered: false, wrong_count: 2, reviews_count: 1 });
    expect(vnDate(r.next_review_at)).toBe('2026-11-11');
  });
  it('does not change the input row', () => {
    const input = row();
    applyReview(input, true, NOW);
    expect(input.stage).toBe(0);
  });
});

describe('peekLapse', () => {
  it('sends the question back to stage 0, due tomorrow, without counting a miss or a review', () => {
    const r = peekLapse(row({ stage: 2, wrong_count: 2, reviews_count: 2, next_review_at: '2026-11-09T03:00:00Z' }), NOW);
    expect(r).toMatchObject({ stage: 0, mastered: false, wrong_count: 2, reviews_count: 2 });
    expect(vnDate(r.next_review_at)).toBe('2026-11-11');
    expect(isDue(r, NOW)).toBe(false);
  });
});

describe('pickDue', () => {
  const mk = (id: string, day: string, wrong = 1): MistakeRow => row({ question_id: id, next_review_at: `${day}T03:00:00Z`, wrong_count: wrong });
  it('keeps only due questions, longest overdue first, then most missed', () => {
    const rows = [mk('A', '2026-11-10'), mk('B', '2026-11-05'), mk('C', '2026-11-10', 4), mk('D', '2026-11-20'), row({ question_id: 'E', mastered: true, next_review_at: '2026-11-01T03:00:00Z' })];
    expect(pickDue(rows, NOW).map((r) => r.question_id)).toEqual(['B', 'C', 'A']);
  });
  it('caps one session at 20 questions', () => {
    const rows = Array.from({ length: 35 }, (_, i) => mk(`Q${String(i).padStart(2, '0')}`, '2026-11-09'));
    expect(pickDue(rows, NOW)).toHaveLength(20);
    expect(pickDue(rows, NOW, 5)).toHaveLength(5);
  });
});

describe('countBook / statusLabel', () => {
  it('counts open, due and mastered', () => {
    const rows = [row({ question_id: 'A' }), row({ question_id: 'B', next_review_at: '2026-11-15T03:00:00Z' }), row({ question_id: 'C', mastered: true })];
    expect(countBook(rows, NOW)).toEqual({ open: 2, due: 1, mastered: 1 });
  });
  it('labels each state in Vietnamese', () => {
    expect(statusLabel(row({ mastered: true }), NOW)).toBe('✓ Đã nắm');
    expect(statusLabel(row(), NOW)).toBe('Cần ôn hôm nay');
    expect(statusLabel(row({ next_review_at: '2026-11-08T03:00:00Z' }), NOW)).toBe('Cần ôn (trễ 2 ngày)');
    expect(statusLabel(row({ next_review_at: '2026-11-13T03:00:00Z' }), NOW)).toBe('Ôn lại ngày 13/11');
  });
});

describe('mistakeAlerts', () => {
  it('warns only about students with overdue questions', () => {
    const s = (id: string, overdue: number) => ({ user_id: id, open_count: 5, due_count: overdue, overdue_count: overdue, mastered_count: 0, last_reviewed_at: null });
    const out = mistakeAlerts([s('u1', 0), s('u2', 7)], (id) => (id === 'u2' ? 'Lan' : 'Minh'));
    expect(out).toHaveLength(1);
    expect(out[0].text).toContain('Lan');
    expect(out[0].text).toContain('7 câu');
  });
});
