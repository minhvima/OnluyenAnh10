import { describe, expect, it } from 'vitest';
import { shouldRerender } from './auth-events';
import { gradeAnswer } from './grading';
import { orderOf, prepare, prepareWithOrder } from './quiz';
import { clearSession, loadSession, MAX_AGE_MS, saveSession, sessionKey } from './session-store';
import type { Question } from './types';

const seeded = (seed = 7) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const mcq: Question = {
  question_id: 'Q1', topic_code: 'TENSES', cognitive_level: 'Recognition', question_type: 'multiple_choice', prompt: 'x ______',
  options: [{ id: 'A', text: 'a' }, { id: 'B', text: 'b' }, { id: 'C', text: 'c' }, { id: 'D', text: 'd' }],
  correct_answer: 'B', accepted_answers: [], explanation: 'e', hint: null,
};
const match: Question = {
  ...mcq, question_id: 'Q2', question_type: 'matching', correct_answer: 'Left 1 -> Right 1 | Left 2 -> Right 2 | Left 3 -> Right 3',
  options: [{ left: 'l1', right: 'r1' }, { left: 'l2', right: 'r2' }, { left: 'l3', right: 'r3' }],
};

/** In-memory stand-in for localStorage. */
const memory = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
};

describe('shouldRerender (the lost-lesson bug)', () => {
  it('does NOT rebuild when SIGNED_IN is re-emitted for the same person (tab became visible again)', () => {
    expect(shouldRerender('SIGNED_IN', 'u1', 'u1')).toBe(false);
  });
  it('ignores token refreshes and user updates', () => {
    expect(shouldRerender('TOKEN_REFRESHED', 'u1', 'u1')).toBe(false);
    expect(shouldRerender('USER_UPDATED', 'u1', 'u1')).toBe(false);
  });
  it('rebuilds on a real sign-in, a different person, or sign-out', () => {
    expect(shouldRerender('SIGNED_IN', 'u1', null)).toBe(true);
    expect(shouldRerender('SIGNED_IN', 'u2', 'u1')).toBe(true);
    expect(shouldRerender('INITIAL_SESSION', 'u1', null)).toBe(true);
    expect(shouldRerender('SIGNED_OUT', null, 'u1')).toBe(true);
  });
  it('does not rebuild a login screen that is already showing when signed out is reported', () => {
    expect(shouldRerender('SIGNED_OUT', null, null)).toBe(false);
  });
});

describe('display order survives a reload', () => {
  it('rebuilds the same shuffled choices', () => {
    const a = prepare(mcq, seeded(3));
    const b = prepareWithOrder(mcq, orderOf(a));
    expect(b.kind === 'choice' && a.kind === 'choice' && b.choices).toEqual(a.kind === 'choice' && a.choices);
  });
  it('rebuilds the same matching order and still grades correctly', () => {
    const a = prepare(match, seeded(5));
    const b = prepareWithOrder(match, orderOf(a));
    if (a.kind !== 'match' || b.kind !== 'match') throw new Error('expected match');
    expect(b.rights).toEqual(a.rights);
    const answer = b.lefts.map((_, i) => b.rights.find((r) => r.text === `r${i + 1}`)?.index ?? -1);
    expect(gradeAnswer(match, answer)).toBe(true);
  });
  it('ignores an order that does not fit the question (shuffles afresh instead of breaking)', () => {
    expect(prepareWithOrder(mcq, ['A', 'A', 'B', 'C']).kind).toBe('choice');
    expect(prepareWithOrder(mcq, ['A', 'B']).kind).toBe('choice');
    expect(prepareWithOrder(match, [0, 0, 1]).kind).toBe('match');
    expect(prepareWithOrder(mcq, null).kind).toBe('choice');
  });
});

describe('session store', () => {
  const key = sessionKey('u1', 'L1');
  const base = { qids: ['Q1', 'Q2', 'Q3'], index: 1, orders: [['B', 'A', 'C', 'D'], null, null] as (string[] | number[] | null)[], answers: [{ answer: 'B', ok: true, time_ms: 1200 }] };

  it('saves and loads an unfinished session exactly', () => {
    const store = memory();
    saveSession(store, key, base, 1000);
    expect(loadSession(store, key, 2000)).toEqual({ ...base, v: 1, ts: 1000 });
  });
  it('accepts the state right after the live question was answered (answers = index + 1)', () => {
    const store = memory();
    saveSession(store, key, { ...base, answers: [...base.answers, { answer: 'x', ok: false, time_ms: 900 }] }, 1000);
    expect(loadSession(store, key, 2000)?.answers).toHaveLength(2);
  });
  it('is per person and per lesson', () => {
    const store = memory();
    saveSession(store, key, base, 1000);
    expect(loadSession(store, sessionKey('u2', 'L1'), 2000)).toBeNull();
    expect(loadSession(store, sessionKey('u1', 'L2'), 2000)).toBeNull();
  });
  it('drops sessions older than a day and removes them', () => {
    const store = memory();
    saveSession(store, key, base, 1000);
    expect(loadSession(store, key, 1000 + MAX_AGE_MS + 1)).toBeNull();
    expect(store.getItem(key)).toBeNull();
  });
  it('rejects corrupt or inconsistent data instead of crashing', () => {
    const store = memory();
    store.setItem(key, '{not json');
    expect(loadSession(store, key, 2000)).toBeNull();
    store.setItem(key, JSON.stringify({ v: 1, ts: 1000, qids: ['Q1'], index: 5, orders: [], answers: [] }));
    expect(loadSession(store, key, 2000)).toBeNull();
    store.setItem(key, JSON.stringify({ v: 1, ts: 1000, qids: ['Q1', 'Q2'], index: 1, orders: [], answers: [] }));
    expect(loadSession(store, key, 2000)).toBeNull(); // index 1 needs 1 or 2 answers
  });
  it('clearSession removes it', () => {
    const store = memory();
    saveSession(store, key, base, 1000);
    clearSession(store, key);
    expect(loadSession(store, key, 2000)).toBeNull();
  });
  it('tolerates blocked or missing storage', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(() => saveSession(broken, key, base)).not.toThrow();
    expect(loadSession(broken, key)).toBeNull();
    expect(() => clearSession(broken, key)).not.toThrow();
    expect(loadSession(null, key)).toBeNull();
  });
});
