import { describe, expect, it } from 'vitest';
import { whyWrong } from './quiz';
import type { Question } from './types';

const base: Question = {
  question_id: 'Q1', topic_code: 'TENSES', cognitive_level: 'Recognition', question_type: 'multiple_choice', prompt: 'Hoa ______ like spicy food.',
  options: [{ id: 'A', text: "isn't" }, { id: 'B', text: "don't" }, { id: 'C', text: 'not' }, { id: 'D', text: "doesn't" }],
  correct_answer: 'D', accepted_answers: [], explanation: 'e', hint: null,
  why_wrong: { A: "'isn't' đi với tính từ hoặc V-ing.", B: "'don't' dùng với I/you/we/they, không dùng với Hoa.", C: "'not' đứng một mình không tạo phủ định.", D: 'không dùng cho đáp án đúng' },
};

describe('whyWrong', () => {
  it('returns the saved reason for the chosen wrong option (choice types)', () => {
    expect(whyWrong(base, 'B')).toBe("'don't' dùng với I/you/we/they, không dùng với Hoa.");
    expect(whyWrong(base, 'C')).toBe("'not' đứng một mình không tạo phủ định.");
  });
  it('works for every choice-type question', () => {
    for (const t of ['error_identification', 'sentence_transformation', 'sentence_combination'] as const) {
      expect(whyWrong({ ...base, question_type: t }, 'A')).toContain("'isn't'");
    }
  });
  it('returns null when there is no reason, or it is the unsure marker or blank', () => {
    expect(whyWrong({ ...base, why_wrong: undefined }, 'B')).toBeNull();
    expect(whyWrong({ ...base, why_wrong: { B: '??' } }, 'B')).toBeNull();
    expect(whyWrong({ ...base, why_wrong: { B: '   ' } }, 'B')).toBeNull();
    expect(whyWrong(base, 'Z')).toBeNull();
  });
  it('fill-in: matches the typed wrong answer the way the grader does (case, spaces, apostrophes, final dot)', () => {
    const fill: Question = { ...base, question_type: 'fill_in_blank', options: [], correct_answer: "doesn't", why_wrong: { "don't": 'Hoa là ngôi thứ ba số ít.', 'is liking': "'like' là động từ chỉ trạng thái." } };
    expect(whyWrong(fill, "Don’t.")).toBe('Hoa là ngôi thứ ba số ít.');
    expect(whyWrong(fill, '  IS   liking ')).toBe("'like' là động từ chỉ trạng thái.");
    expect(whyWrong(fill, 'something else')).toBeNull();
  });
  it('matching and malformed answers give nothing', () => {
    expect(whyWrong({ ...base, question_type: 'matching' }, [0, 1])).toBeNull();
    expect(whyWrong(base, [1, 2])).toBeNull();
  });
});
