/** Pure helpers for the admin statistics tab (no DOM, no network) so they can be unit tested. */

export type Granularity = 'day' | 'week' | 'month';

export interface StudentSummary {
  user_id: string; email: string; display_name: string | null;
  last_active: string | null; idle_days: number | null;
  minutes_7d: number; active_days_7d: number;
  answers_total: number; correct_total: number;
  lessons_mastered: number; lessons_started: number; tests_taken: number;
}
export interface DailyRow { day: string; user_id: string; minutes: number; answers: number; correct: number; lessons_practiced: number; tests: number }
export interface TopicStat { topic_code: string; name_vi: string; answers: number; correct: number; accuracy: number | null; lessons_mastered: number; lessons_total: number }
export interface Bucket { key: string; label: string; minutes: number; answers: number; correct: number; lessons: number; tests: number }

export const IDLE_ALERT_DAYS = 3;
export const WEAK_MIN_ANSWERS = 10;

/** PostgREST may return bigint/numeric as strings; coerce defensively. */
export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

const DAY_MS = 86_400_000;
const parse = (iso: string): number => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const fmt = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  return fmt(parse(iso) + n * DAY_MS);
}

/** Today's date (YYYY-MM-DD) in Vietnam, independent of the browser's time zone. */
export function todayVN(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Start of the bucket (Monday for weeks, the 1st for months) that a day belongs to. */
export function bucketKey(day: string, g: Granularity): string {
  if (g === 'day') return day;
  if (g === 'month') return day.slice(0, 7);
  const dow = (new Date(parse(day)).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -dow);
}

function bucketLabel(key: string, g: Granularity): string {
  if (g === 'month') return `${key.slice(5, 7)}/${key.slice(0, 4)}`;
  const d = `${key.slice(8, 10)}/${key.slice(5, 7)}`;
  return g === 'week' ? `Tuần ${d}` : d;
}

/** Sum per-student daily rows into one series per day/week/month, including empty buckets so gaps are visible. */
export function bucketDaily(rows: DailyRow[], from: string, to: string, g: Granularity): Bucket[] {
  const out = new Map<string, Bucket>();
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const key = bucketKey(d, g);
    if (!out.has(key)) out.set(key, { key, label: bucketLabel(key, g), minutes: 0, answers: 0, correct: 0, lessons: 0, tests: 0 });
  }
  for (const r of rows) {
    if (r.day < from || r.day > to) continue;
    const b = out.get(bucketKey(r.day, g));
    if (!b) continue;
    b.minutes += num(r.minutes);
    b.answers += num(r.answers);
    b.correct += num(r.correct);
    b.lessons += num(r.lessons_practiced); // sum of per-student distinct lessons per day
    b.tests += num(r.tests);
  }
  return [...out.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function percent(correct: number, total: number): number | null {
  return total > 0 ? Math.round((correct / total) * 1000) / 10 : null;
}

export function fmtMinutes(m: number): string {
  const total = Math.round(m);
  if (total < 60) return `${total} phút`;
  return `${Math.floor(total / 60)} giờ ${String(total % 60).padStart(2, '0')} phút`;
}

export interface Alert { kind: 'idle' | 'weak'; text: string; userId?: string }

/** Warnings for the parent: students who stopped studying, and topics under the mastery threshold. */
export function buildAlerts(students: StudentSummary[], topics: TopicStat[], threshold: number): Alert[] {
  const alerts: Alert[] = [];
  for (const s of students) {
    const name = s.display_name || s.email;
    if (s.last_active === null) alerts.push({ kind: 'idle', userId: s.user_id, text: `${name} chưa học lần nào.` });
    else if ((s.idle_days ?? 0) >= IDLE_ALERT_DAYS) alerts.push({ kind: 'idle', userId: s.user_id, text: `${name} đã ${s.idle_days} ngày chưa học.` });
  }
  for (const t of topics) {
    if (t.accuracy !== null && t.answers >= WEAK_MIN_ANSWERS && t.accuracy < threshold * 100) {
      alerts.push({ kind: 'weak', text: `Chủ điểm ${t.name_vi} mới đúng ${t.accuracy}% (${t.answers} câu), dưới mức đạt ${Math.round(threshold * 100)}%.` });
    }
  }
  return alerts;
}

/** Excel opens a cell starting with = + - @ as a formula; prefix an apostrophe so student-supplied text stays text. */
function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
