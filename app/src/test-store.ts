import type { Answer } from './types';

/** A phase test in progress, kept in the browser so a reload, a tab switch or a discarded tab never loses it. */
export interface SavedTest {
  v: 1;
  ts: number;
  phase: number;
  startedAt: number; // ms since epoch; the deadline is startedAt + limitS
  limitS: number;
  qids: string[];
  orders: (string[] | number[] | null)[];
  answers: Record<string, Answer>;
  index: number;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const testKey = (userId: string, phase: number): string => `gv10:phasetest:${userId}:${phase}`;
export const topicTestKey = (userId: string, topicCode: string): string => `gv10:topictest:${userId}:${topicCode}`;

function isValid(x: unknown): x is SavedTest {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Partial<SavedTest>;
  return (
    s.v === 1 && typeof s.ts === 'number' && Number.isInteger(s.phase) && typeof s.startedAt === 'number' && typeof s.limitS === 'number' && s.limitS > 0 &&
    Array.isArray(s.qids) && s.qids.length > 0 && s.qids.every((q) => typeof q === 'string') &&
    Array.isArray(s.orders) && typeof s.answers === 'object' && s.answers !== null && !Array.isArray(s.answers) &&
    Number.isInteger(s.index) && (s.index as number) >= 0 && (s.index as number) < s.qids.length
  );
}

export function saveTest(store: Store | null, key: string, s: Omit<SavedTest, 'v' | 'ts'>, now = Date.now()): void {
  try {
    store?.setItem(key, JSON.stringify({ ...s, v: 1, ts: now }));
  } catch {
    /* blocked or full: the test still works, it just cannot resume */
  }
}

/** A test whose deadline passed long ago is dropped; one that ended recently is still returned so it can be submitted. */
export function loadTest(store: Store | null, key: string, now = Date.now()): SavedTest | null {
  try {
    const raw = store?.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed) || now - (parsed.startedAt + parsed.limitS * 1000) > MAX_AGE_MS || now < parsed.startedAt - 60_000) {
      store?.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearTest(store: Store | null, key: string): void {
  try {
    store?.removeItem(key);
  } catch {
    /* ignore */
  }
}
