/**
 * Local preview only (vite.preview.config.ts aliases lib/supabase to this file).
 * Serves the real lessons and questions from data_bank/ through the same query API the app uses,
 * keeps progress in memory, and pretends to be a signed-in admin. Never part of the production build.
 */
type Row = Record<string, unknown>;
type Mod = { default: Row[] };

const lessonFiles = import.meta.glob('../../data_bank/lessons/topic_*.json', { eager: true }) as Record<string, Mod>;
const questionFiles = import.meta.glob('../../data_bank/json/topic_*.json', { eager: true }) as Record<string, Mod>;

const LESSON_META = new Set(['lesson_id', 'topic_code', 'order', 'title', 'estimated_minutes', 'status']);
const lessons: Row[] = Object.values(lessonFiles).flatMap((m) =>
  m.default.map((l) => ({
    lesson_id: l.lesson_id, topic_code: l.topic_code, ord: l.order, title: l.title, estimated_minutes: l.estimated_minutes, status: 'approved',
    content: Object.fromEntries(Object.entries(l).filter(([k]) => !LESSON_META.has(k))),
  })));
const questions: Row[] = Object.values(questionFiles).flatMap((m) => m.default);

const T: [string, string, string, number, number, string[]][] = [
  ['TENSES', 'Các thì', 'Tenses', 1, 1, []], ['SENTENCE_STRUCTURES', 'Cấu trúc & kết hợp câu', 'Sentence structures', 2, 1, []],
  ['MODALS_QUANTIFIERS', 'Động từ khuyết thiếu & lượng từ', 'Modals & quantifiers', 3, 1, []], ['ARTICLES_PRONOUNS', 'Mạo từ & đại từ', 'Articles & pronouns', 4, 2, []],
  ['PREPOSITIONS_CONJUNCTIONS', 'Giới từ & liên từ', 'Prepositions & conjunctions', 5, 2, []], ['COMPARISONS', 'So sánh', 'Comparisons', 6, 2, []],
  ['GERUNDS_INFINITIVES', 'V-ing / to-V / bare V', 'Gerunds & infinitives', 7, 2, []], ['WORD_FORMS', 'Cấu tạo từ', 'Word forms', 8, 2, []],
  ['PASSIVE_VOICE', 'Câu bị động', 'Passive voice', 9, 3, []], ['CONDITIONALS', 'Câu điều kiện', 'Conditionals', 10, 3, []],
  ['WISH_SENTENCES', 'Câu ước', 'Wish sentences', 11, 3, []], ['REPORTED_SPEECH', 'Câu tường thuật', 'Reported speech', 12, 3, []],
  ['RELATIVE_CLAUSES', 'Mệnh đề quan hệ', 'Relative clauses', 13, 3, []], ['PHRASAL_VERBS_COLLOCATIONS', 'Cụm động từ & collocation', 'Phrasal verbs & collocations', 14, 4, []],
];
const topics: Row[] = T.map(([topic_code, name_vi, name_en, sort_order, phase, prereqs]) => ({ topic_code, name_vi, name_en, sort_order, phase, prereqs, active: true }));

const progress: Row[] = [];
const tables: Record<string, Row[]> = {
  topics, lessons, questions, lesson_progress: progress, attempts: [], phase_test_runs: [], activity_log: [], mistake_book: [],
  app_settings: [{ key: 'mastery_threshold', value: 0.8 }], profiles: [{ display_name: 'Minh' }],
};

class Query implements PromiseLike<{ data: unknown; error: null; count: number }> {
  private rows: Row[];
  private single = false;
  constructor(private table: string) { this.rows = [...(tables[table] ?? [])]; }
  select(): this { return this; }
  eq(k: string, v: unknown): this { this.rows = this.rows.filter((r) => r[k] === v); return this; }
  in(k: string, arr: unknown[]): this { this.rows = this.rows.filter((r) => arr.includes(r[k])); return this; }
  overlaps(k: string, arr: string[]): this { this.rows = this.rows.filter((r) => ((r[k] as string[]) ?? []).some((x) => arr.includes(x))); return this; }
  order(k: string, opts?: { ascending?: boolean }): this { const d = opts?.ascending === false ? -1 : 1; this.rows.sort((a, b) => d * ((a[k] as number | string) < (b[k] as number | string) ? -1 : (a[k] as number | string) > (b[k] as number | string) ? 1 : 0)); return this; }
  range(): this { return this; }
  maybeSingle(): this { this.single = true; return this; }
  insert(rows: Row | Row[]): this { tables[this.table].push(...(Array.isArray(rows) ? rows : [rows]).map((r) => ({ id: `run-${tables[this.table].length + 1}`, ...r }))); console.info('[preview] insert', this.table); return this; }
  upsert(input: Row | Row[]): this {
    for (const row of Array.isArray(input) ? input : [input]) {
      const same = this.table === 'mistake_book' ? (r: Row) => r.question_id === row.question_id : (r: Row) => r.lesson_id === row.lesson_id;
      const i = tables[this.table].findIndex(same);
      if (i >= 0) tables[this.table][i] = row; else tables[this.table].push(row);
      console.info('[preview] upsert', this.table, row);
    }
    return this;
  }
  update(): this { return this; }
  then<R1, R2>(ok?: (v: { data: unknown; error: null; count: number }) => R1 | PromiseLike<R1>, bad?: (e: unknown) => R2 | PromiseLike<R2>): PromiseLike<R1 | R2> {
    return Promise.resolve({ data: this.single ? (this.rows[0] ?? null) : this.rows, error: null, count: this.rows.length }).then(ok, bad);
  }
}

/** Fake admin statistics for visual QA only (two students; "Lan" stopped studying 4 days ago). */
function mockRpc(name: string, a: Record<string, string | null>): unknown {
  const day = (offset: number): string => new Date(Date.now() + 7 * 3600_000 - offset * 86_400_000).toISOString().slice(0, 10);
  if (name === 'admin_students_summary') {
    return [
      { user_id: 'u-minh', email: 'minh@example.com', display_name: 'Minh', last_active: new Date().toISOString(), idle_days: 0, minutes_7d: 142.5, active_days_7d: 5, answers_total: 410, correct_total: 318, lessons_mastered: 9, lessons_started: 14, tests_taken: 3 },
      { user_id: 'u-lan', email: 'lan@example.com', display_name: null, last_active: new Date(Date.now() - 4 * 86_400_000).toISOString(), idle_days: 4, minutes_7d: 20, active_days_7d: 1, answers_total: 60, correct_total: 33, lessons_mastered: 1, lessons_started: 4, tests_taken: 0 },
    ];
  }
  if (name === 'admin_daily_activity') {
    const out: unknown[] = [];
    for (let i = 0; i < 90; i++) {
      for (const u of ['u-minh', 'u-lan']) {
        if (a.p_user && a.p_user !== u) continue;
        if ((i * (u === 'u-minh' ? 3 : 7) + i) % (u === 'u-minh' ? 4 : 5) === 0) continue; // some rest days
        if (u === 'u-lan' && i < 4) continue;
        const n = 10 + ((i * 7) % 25);
        out.push({ day: day(i), user_id: u, minutes: 8 + ((i * 5) % 30), answers: n, correct: Math.round(n * (u === 'u-minh' ? 0.8 : 0.55)), lessons_practiced: 1 + (i % 2), tests: i % 11 === 0 ? 1 : 0 });
      }
    }
    return out;
  }
  if (name === 'admin_topic_stats') {
    return [['TENSES', 'Các thì', 120, 105, 5, 6], ['PASSIVE_VOICE', 'Câu bị động', 80, 52, 2, 5], ['CONDITIONALS', 'Câu điều kiện', 14, 6, 0, 4], ['RELATIVE_CLAUSES', 'Mệnh đề quan hệ', 0, 0, 0, 4]]
      .map(([c, n, an, ok, m, t]) => ({ topic_code: c, name_vi: n, answers: an, correct: ok, accuracy: an ? Math.round(((ok as number) / (an as number)) * 1000) / 10 : null, lessons_mastered: m, lessons_total: t }));
  }
  if (name === 'admin_view_time') {
    return [{ view_kind: 'lesson', ref_id: 'L_TENSES_01', topic_code: 'TENSES', minutes: 38.5, visits: 6 }, { view_kind: 'topic_test', ref_id: 'PASSIVE_VOICE', topic_code: 'PASSIVE_VOICE', minutes: 12, visits: 2 }, { view_kind: 'home', ref_id: null, topic_code: null, minutes: 5, visits: 20 }];
  }
  if (name === 'admin_hard_questions') return [{ question_id: 'Q_PASSIVE_VOICE_014', topic_code: 'PASSIVE_VOICE', lesson_id: 'L_PASSIVE_VOICE_02', attempts: 9, wrong: 7, wrong_rate: 77.8 }];
  if (name === 'admin_test_history') {
    return [{ id: 't1', user_id: 'u-minh', phase: 1, topic_code: null, finished_at: new Date(Date.now() - 2 * 86_400_000).toISOString(), duration_s: 1260, n_questions: 20, n_correct: 15, score: 7.5, pass_score: 7, passed: true, comment: '' },
      { id: 't2', user_id: 'u-minh', phase: 1, topic_code: 'TENSES', finished_at: new Date(Date.now() - 9 * 86_400_000).toISOString(), duration_s: 300, n_questions: 10, n_correct: 6, score: 6, pass_score: 7, passed: false, comment: '' }];
  }
  if (name === 'admin_abandoned_lessons') return [{ user_id: 'u-lan', lesson_id: 'L_TENSES_03', day: day(1), minutes: 4.5 }, { user_id: 'u-minh', lesson_id: 'L_PASSIVE_VOICE_02', day: day(3), minutes: 1.2 }];
  if (name === 'admin_purge_activity_log') return 12;
  if (name === 'admin_mistake_summary') {
    return [{ user_id: 'u-minh', open_count: 18, due_count: 6, overdue_count: 0, mastered_count: 9, last_reviewed_at: new Date(Date.now() - 86_400_000).toISOString() },
      { user_id: 'u-lan', open_count: 31, due_count: 31, overdue_count: 12, mastered_count: 0, last_reviewed_at: null }];
  }
  return 'admin';
}

export const configured = true;
export type Role = 'student' | 'admin';
export const supabase = {
  from: (t: string) => new Query(t),
  rpc: async (name: string, args: Record<string, string | null> = {}) => ({ data: mockRpc(name, args), error: null }),
  auth: {
    getSession: async () => ({ data: { session: { user: { id: 'preview-user', email: 'minh@example.com' } } } }),
    // Like the real client, which re-emits SIGNED_IN whenever the tab becomes visible again.
    // Tests can trigger it with window.__emitAuth('SIGNED_IN').
    onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
      (window as unknown as { __emitAuth: (e: string) => void }).__emitAuth = (e) => cb(e, e === 'SIGNED_OUT' ? null : { user: { id: 'preview-user', email: 'minh@example.com' } });
      return { data: { subscription: { unsubscribe() {} } } };
    },
    signOut: async () => {},
    signInWithOAuth: async () => ({ error: null }),
  },
};
export async function fetchAccess(): Promise<Role> { return 'admin'; }
export function readAuthErrorFromUrl(): string | null { return null; }

(window as unknown as Record<string, unknown>).__mockTables = tables;
// Test helpers for the preview: mark lessons of a phase as practised (or clear everything).
(window as unknown as Record<string, unknown>).__unlockPhase = (phase: number, upTo?: number) => {
  const codes = new Set(topics.filter((t) => t.phase === phase).map((t) => t.topic_code));
  const todo = lessons.filter((l) => codes.has(l.topic_code as string));
  todo.slice(0, upTo ?? todo.length).forEach((l) => {
    if (!progress.some((p) => p.lesson_id === l.lesson_id)) progress.push({ user_id: 'preview-user', lesson_id: l.lesson_id, status: 'in_progress', best_score: 60, last_score: 60, attempts_count: 1, mastered_at: null });
  });
  return `${todo.length} lessons in phase ${phase}`;
};
(window as unknown as Record<string, unknown>).__clearProgress = () => { progress.length = 0; (tables.phase_test_runs as Row[]).length = 0; };

// Preview helper: fill the mistake book with real questions, some due today, some later, some mastered.
(window as unknown as Record<string, unknown>).__seedMistakes = (n = 25) => {
  const day = (offset: number): string => new Date(Date.now() + offset * 86_400_000).toISOString();
  (tables.mistake_book as Row[]).length = 0;
  questions.slice(0, n).forEach((q, i) => {
    const mastered = i % 7 === 6;
    (tables.mistake_book as Row[]).push({
      user_id: 'preview-user', question_id: q.question_id, topic_code: q.topic_code, wrong_count: 1 + (i % 3), stage: mastered ? 3 : i % 3,
      next_review_at: mastered ? day(-9) : i % 4 === 3 ? day(2 + (i % 5)) : day(-(i % 4)), mastered, last_wrong_at: day(-10), reviews_count: mastered ? 3 : i % 3, last_reviewed_at: null,
    });
  });
  return `${(tables.mistake_book as Row[]).length} rows`;
};
