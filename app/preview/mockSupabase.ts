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
  topics, lessons, questions, lesson_progress: progress, attempts: [],
  app_settings: [{ key: 'mastery_threshold', value: 0.8 }], profiles: [{ display_name: 'Minh' }],
};

class Query implements PromiseLike<{ data: unknown; error: null; count: number }> {
  private rows: Row[];
  private single = false;
  constructor(private table: string) { this.rows = [...(tables[table] ?? [])]; }
  select(): this { return this; }
  eq(k: string, v: unknown): this { this.rows = this.rows.filter((r) => r[k] === v); return this; }
  overlaps(k: string, arr: string[]): this { this.rows = this.rows.filter((r) => ((r[k] as string[]) ?? []).some((x) => arr.includes(x))); return this; }
  order(k: string): this { this.rows.sort((a, b) => (a[k] as number | string) < (b[k] as number | string) ? -1 : (a[k] as number | string) > (b[k] as number | string) ? 1 : 0); return this; }
  range(): this { return this; }
  maybeSingle(): this { this.single = true; return this; }
  insert(rows: Row | Row[]): this { tables[this.table].push(...(Array.isArray(rows) ? rows : [rows])); console.info('[preview] insert', this.table, rows); return this; }
  upsert(row: Row): this {
    const i = tables[this.table].findIndex((r) => r.lesson_id === row.lesson_id);
    if (i >= 0) tables[this.table][i] = row; else tables[this.table].push(row);
    console.info('[preview] upsert', this.table, row);
    return this;
  }
  update(): this { return this; }
  then<R1, R2>(ok?: (v: { data: unknown; error: null; count: number }) => R1 | PromiseLike<R1>, bad?: (e: unknown) => R2 | PromiseLike<R2>): PromiseLike<R1 | R2> {
    return Promise.resolve({ data: this.single ? (this.rows[0] ?? null) : this.rows, error: null, count: this.rows.length }).then(ok, bad);
  }
}

export const configured = true;
export type Role = 'student' | 'admin';
export const supabase = {
  from: (t: string) => new Query(t),
  rpc: async () => ({ data: 'admin', error: null }),
  auth: {
    getSession: async () => ({ data: { session: { user: { id: 'preview-user', email: 'minh@example.com' } } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => {},
    signInWithOAuth: async () => ({ error: null }),
  },
};
export async function fetchAccess(): Promise<Role> { return 'admin'; }
export function readAuthErrorFromUrl(): string | null { return null; }
