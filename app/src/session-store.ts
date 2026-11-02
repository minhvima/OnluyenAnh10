import type { Answer } from './types';

/** An unfinished practice session, saved in the browser so a reload or a discarded tab never loses it. */
export interface SavedSession {
  v: 1;
  ts: number;
  qids: string[];
  index: number;
  orders: (string[] | number[] | null)[];
  answers: { answer: Answer; ok: boolean; time_ms: number }[];
}

export const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const sessionKey = (userId: string, lessonId: string): string => `gv10:practice:${userId}:${lessonId}`;

function isValid(x: unknown): x is SavedSession {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Partial<SavedSession>;
  return (
    s.v === 1 && typeof s.ts === 'number' && Array.isArray(s.qids) && s.qids.length > 0 && s.qids.every((q) => typeof q === 'string') &&
    Number.isInteger(s.index) && (s.index as number) >= 0 && (s.index as number) < s.qids.length &&
    Array.isArray(s.orders) && Array.isArray(s.answers) &&
    (s.answers.length === s.index || s.answers.length === (s.index as number) + 1) &&
    s.answers.every((a) => typeof a === 'object' && a !== null && typeof a.ok === 'boolean' && typeof a.time_ms === 'number' && 'answer' in a)
  );
}

/** Storage can be blocked or full (private windows, cleared site data): every call tolerates failure. */
export function saveSession(store: Store | null, key: string, s: Omit<SavedSession, 'v' | 'ts'>, now = Date.now()): void {
  try {
    store?.setItem(key, JSON.stringify({ ...s, v: 1, ts: now }));
  } catch {
    /* ignore: the app still works, it just cannot resume */
  }
}

export function loadSession(store: Store | null, key: string, now = Date.now()): SavedSession | null {
  try {
    const raw = store?.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed) || now - parsed.ts > MAX_AGE_MS || now < parsed.ts - 60_000) {
      store?.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession(store: Store | null, key: string): void {
  try {
    store?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function browserStore(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
