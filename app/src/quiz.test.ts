import { describe, expect, it } from 'vitest';
import { gradeAnswer } from './grading';
import { choiceForKey, pickQuestions, prepare } from './quiz';
import { lookupWord, parseGlossary } from './glossary';
import { parseUnderline, splitWords } from './text';
import type { Level, Question } from './types';

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const mcq = (id: string, level: Level = 'Recognition'): Question => ({
  question_id: id, topic_code: 'TENSES', cognitive_level: level, question_type: 'multiple_choice',
  prompt: 'x ______', options: [{ id: 'A', text: 'a' }, { id: 'B', text: 'b' }, { id: 'C', text: 'c' }, { id: 'D', text: 'd' }],
  correct_answer: 'B', accepted_answers: [], explanation: 'e', hint: null,
});

describe('prepare', () => {
  it('shuffles multiple choice but the correct option is still graded right', () => {
    for (let s = 1; s < 30; s++) {
      const p = prepare(mcq('Q1'), seeded(s));
      if (p.kind !== 'choice') throw new Error('expected choice');
      expect(p.choices.map((c) => c.letter)).toEqual(['A', 'B', 'C', 'D']);
      const shown = p.choices.find((c) => c.text === 'b');
      expect(shown).toBeDefined();
      expect(gradeAnswer(p.q, (shown as { id: string }).id)).toBe(true);
    }
  });

  it('actually changes the order for some seeds', () => {
    const orders = new Set<string>();
    for (let s = 1; s < 20; s++) {
      const p = prepare(mcq('Q1'), seeded(s));
      if (p.kind === 'choice') orders.add(p.choices.map((c) => c.id).join(''));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('keeps error_identification options in order (labels live inside the prompt)', () => {
    const q: Question = { ...mcq('Q2'), question_type: 'error_identification' };
    for (let s = 1; s < 10; s++) {
      const p = prepare(q, seeded(s));
      if (p.kind === 'choice') expect(p.choices.map((c) => c.id).join('')).toBe('ABCD');
    }
  });

  it('shuffles matching rights and maps back to original indices', () => {
    const q: Question = {
      ...mcq('Q3'), question_type: 'matching', correct_answer: 'Left 1 -> Right 1 | Left 2 -> Right 2 | Left 3 -> Right 3',
      options: [{ left: 'l1', right: 'r1' }, { left: 'l2', right: 'r2' }, { left: 'l3', right: 'r3' }],
    };
    const p = prepare(q, seeded(4));
    if (p.kind !== 'match') throw new Error('expected match');
    expect(p.lefts).toEqual(['l1', 'l2', 'l3']);
    const answer = p.lefts.map((_, i) => p.rights.find((r) => r.text === `r${i + 1}`)?.index ?? -1);
    expect(gradeAnswer(q, answer)).toBe(true);
  });

  it('fill_in_blank passes through', () => {
    expect(prepare({ ...mcq('Q4'), question_type: 'fill_in_blank' }).kind).toBe('fill');
  });
});

describe('choiceForKey', () => {
  const p = prepare(mcq('Q1'), seeded(3));
  const choices = p.kind === 'choice' ? p.choices : [];
  it('maps letters and digits to the displayed position', () => {
    expect(choiceForKey('a', choices)).toBe(choices[0].id);
    expect(choiceForKey('D', choices)).toBe(choices[3].id);
    expect(choiceForKey('2', choices)).toBe(choices[1].id);
  });
  it('ignores other keys', () => {
    expect(choiceForKey('x', choices)).toBeNull();
    expect(choiceForKey('Enter', choices)).toBeNull();
    expect(choiceForKey('5', choices)).toBeNull();
  });
});

describe('pickQuestions', () => {
  const pool = [
    ...Array.from({ length: 12 }, (_, i) => mcq(`R${i}`, 'Recognition')),
    ...Array.from({ length: 6 }, (_, i) => mcq(`C${i}`, 'Comprehension')),
    ...Array.from({ length: 4 }, (_, i) => mcq(`A${i}`, 'Application')),
  ];
  it('returns n distinct questions ordered easy to hard with roughly 5/3/2', () => {
    const out = pickQuestions(pool, 10, seeded(2));
    expect(out).toHaveLength(10);
    expect(new Set(out.map((q) => q.question_id)).size).toBe(10);
    const count = (l: Level) => out.filter((q) => q.cognitive_level === l).length;
    expect([count('Recognition'), count('Comprehension'), count('Application')]).toEqual([5, 3, 2]);
    const order = out.map((q) => ['Recognition', 'Comprehension', 'Application'].indexOf(q.cognitive_level));
    expect(order).toEqual([...order].sort());
  });
  it('tops up from other levels when one level is short', () => {
    const out = pickQuestions(pool.filter((q) => q.cognitive_level !== 'Application'), 10, seeded(5));
    expect(out).toHaveLength(10);
  });
  it('returns fewer when the pool is small', () => {
    expect(pickQuestions(pool.slice(0, 3), 10, seeded(1))).toHaveLength(3);
  });
});

describe('text helpers', () => {
  it('parseUnderline keeps only <u> markup and drops other tags', () => {
    expect(parseUnderline('Find: <u>(A) He</u> <b>go</b> <u>(B) home</u>.')).toEqual([
      { text: 'Find: ', underline: false },
      { text: '(A) He', underline: true },
      { text: ' go ', underline: false },
      { text: '(B) home', underline: true },
      { text: '.', underline: false },
    ]);
    expect(parseUnderline('<script>alert(1)</script>hi').map((s) => s.text).join('')).toBe('alert(1)hi');
  });
  it('splitWords separates words, contractions and punctuation', () => {
    const p = splitWords("She doesn't like fish, OK?");
    expect(p.filter((x) => x.word).map((x) => x.text)).toEqual(['She', "doesn't", 'like', 'fish', 'OK']);
    expect(p.map((x) => x.text).join('')).toBe("She doesn't like fish, OK?");
  });
});

describe('glossary lookup', () => {
  const g = parseGlossary({ makes: ['make', 'động từ', '/meɪks/', 'làm', 'She makes tea.', 'Cô ấy pha trà.', 'dạng -s của make'], mother: ['mother', 'danh từ', '/ˈmʌðə(r)/', 'mẹ', '', '', ''] });
  it('finds exact forms case-insensitively', () => expect(lookupWord(g, 'Makes')?.lemma).toBe('make'));
  it('falls back from possessive', () => expect(lookupWord(g, "mother's")?.vi).toBe('mẹ'));
  it('returns null for unknown words', () => expect(lookupWord(g, 'zzz')).toBeNull());
});
