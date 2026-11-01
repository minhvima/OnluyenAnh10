import { describe, expect, it } from 'vitest';
import { gradeAnswer, isMastered, nextReview, normalizeText, parseMatchingKey, shuffle } from './grading';
import type { Question } from './types';

const base: Question = {
  question_id: 'Q_T_001', topic_code: 'TENSES', cognitive_level: 'Recognition',
  question_type: 'multiple_choice', prompt: 'x', options: [], correct_answer: 'B',
  accepted_answers: [], explanation: 'e', hint: null,
};

describe('gradeAnswer', () => {
  it('grades option-id types', () => {
    for (const t of ['multiple_choice', 'error_identification', 'sentence_transformation', 'sentence_combination'] as const) {
      const q = { ...base, question_type: t };
      expect(gradeAnswer(q, 'B')).toBe(true);
      expect(gradeAnswer(q, 'A')).toBe(false);
      expect(gradeAnswer(q, [1])).toBe(false);
    }
  });
  it('grades fill_in_blank with normalization and accepted answers', () => {
    const q = { ...base, question_type: 'fill_in_blank' as const, correct_answer: 'has / is having', accepted_answers: ['is going'] };
    expect(gradeAnswer(q, 'Has/Is  having.')).toBe(true);
    expect(gradeAnswer(q, 'is going')).toBe(true);
    expect(gradeAnswer(q, '')).toBe(false);
    expect(gradeAnswer(q, 'has')).toBe(false);
  });
  it('treats curly apostrophes as straight', () => {
    const q = { ...base, question_type: 'fill_in_blank' as const, correct_answer: "didn't go" };
    expect(gradeAnswer(q, 'didn’t go')).toBe(true);
  });
  it('grades matching by right-index per left item', () => {
    const q = { ...base, question_type: 'matching' as const, correct_answer: 'Left 1 -> Right 2 | Left 2 -> Right 1' };
    expect(gradeAnswer(q, [1, 0])).toBe(true);
    expect(gradeAnswer(q, [0, 1])).toBe(false);
    expect(gradeAnswer(q, [1])).toBe(false);
    expect(gradeAnswer(q, 'B')).toBe(false);
  });
});

describe('helpers', () => {
  it('normalizeText', () => expect(normalizeText('  We usually   have lunch. ')).toBe('we usually have lunch'));
  it('parseMatchingKey', () =>
    expect(parseMatchingKey('Left 1 -> Right 3 | Left 2 -> Right 1 | Left 3 -> Right 2')).toEqual([2, 0, 1]));
  it('shuffle keeps elements and does not mutate', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, () => 0.3);
    expect([...out].sort()).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });
  it('isMastered uses >= threshold', () => {
    expect(isMastered(8, 10)).toBe(true);
    expect(isMastered(7, 10)).toBe(false);
    expect(isMastered(0, 0)).toBe(false);
  });
  it('nextReview follows 1/3/7 days and resets on a miss', () => {
    expect(nextReview(0, false)).toEqual({ stage: 0, days: 1, mastered: false });
    expect(nextReview(0, true)).toEqual({ stage: 1, days: 3, mastered: false });
    expect(nextReview(1, true)).toEqual({ stage: 2, days: 7, mastered: false });
    expect(nextReview(2, true)).toEqual({ stage: 3, days: null, mastered: true });
    expect(nextReview(2, false).stage).toBe(0);
  });
});
