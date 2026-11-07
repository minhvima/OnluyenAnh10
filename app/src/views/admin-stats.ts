import { addDays, bucketDaily, buildAlerts, fmtMinutes, num, percent, toCsv, todayVN, type Bucket, type DailyRow, type Granularity, type StudentSummary, type TopicStat } from '../admin-stats';
import { fetchThreshold } from '../api';
import { clear, h } from '../lib/dom';
import { mistakeAlerts, type MistakeSummary } from '../mistake-book';
import { supabase } from '../lib/supabase';

type Metric = 'minutes' | 'answers' | 'accuracy' | 'tests';
const METRICS: Record<Metric, string> = { minutes: 'Phút học', answers: 'Số câu làm', accuracy: '% đúng', tests: 'Số bài kiểm tra' };
const GRAN: Record<Granularity, string> = { day: 'Ngày', week: 'Tuần', month: 'Tháng' };
const RANGES = [[7, '7 ngày'], [30, '30 ngày'], [90, '90 ngày']] as const;

interface ViewTime { view_kind: string; ref_id: string | null; topic_code: string | null; minutes: number; visits: number }
interface HardQ { question_id: string; topic_code: string; lesson_id: string | null; attempts: number; wrong: number; wrong_rate: number }
interface Abandoned { user_id: string; lesson_id: string; day: string; minutes: number }
interface TestRow { id: string; user_id: string; phase: number; topic_code: string | null; finished_at: string; duration_s: number; n_questions: number; n_correct: number; score: number; pass_score: number; passed: boolean; comment: string }

const KIND: Record<string, string> = { home: 'Trang chủ', topic: 'Chủ điểm', lesson: 'Bài học', topic_test: 'Kiểm tra chủ điểm', phase: 'Giai đoạn', phase_test: 'Kiểm tra giai đoạn', mistakes: 'Sổ lỗi sai' };

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T[]> {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return (data ?? []) as T[];
}

const fmtDate = (iso: string): string => new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function table(headers: string[], rows: (string | number | Node | null)[][], caption: string): HTMLElement {
  return h('div', { class: 'stat-table-wrap' },
    h('table', { class: 'stat-table' },
      h('caption', { class: 'sr-only' }, caption),
      h('thead', {}, h('tr', {}, ...headers.map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, ...rows.map((r) => h('tr', {}, ...r.map((c) => h('td', {}, c === null ? '–' : typeof c === 'number' ? String(c) : c)))))));
}

function download(name: string, csv: string): void {
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Vertical bar chart in SVG. Every bar also carries its number, so colour is never the only cue. */
function barChart(buckets: Bucket[], metric: Metric): SVGElement {
  const value = (b: Bucket): number | null => (metric === 'accuracy' ? percent(b.correct, b.answers) : metric === 'minutes' ? Math.round(b.minutes) : metric === 'answers' ? b.answers : b.tests);
  const vals = buckets.map(value);
  const max = Math.max(2, ...vals.map((v) => v ?? 0), metric === 'accuracy' ? 100 : 0);
  const W = 960, H = 260, padL = 40, padB = 34, padT = 18;
  const bw = (W - padL) / buckets.length;
  const ns = 'http://www.w3.org/2000/svg';
  const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `Biểu đồ ${METRICS[metric]} theo ${GRAN_LOWER[currentGran]}. Số liệu chi tiết nằm trong bảng bên dưới.` });
  for (const f of [0, 0.5, 1]) {
    const y = padT + (H - padT - padB) * (1 - f);
    svg.append(el('line', { x1: padL, x2: W, y1: y, y2: y, class: 'grid' }));
    const t = el('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', class: 'axis' });
    t.textContent = String(Math.round(max * f));
    svg.append(t);
  }
  const every = Math.ceil(buckets.length / 14); // keep x labels readable on long ranges
  const showNumbers = buckets.length <= 31;
  buckets.forEach((b, i) => {
    const v = vals[i];
    const hgt = v === null ? 0 : ((H - padT - padB) * v) / max;
    const x = padL + i * bw + bw * 0.15;
    const w = bw * 0.7;
    const y = H - padB - hgt;
    const bar = el('rect', { x, y, width: w, height: Math.max(hgt, 0), rx: 3, class: 'chart-bar' });
    const title = el('title', {});
    title.textContent = `${b.label}: ${v === null ? 'chưa có dữ liệu' : v}${metric === 'accuracy' ? '%' : ''}`;
    bar.append(title);
    svg.append(bar);
    if (showNumbers && v) {
      const t = el('text', { x: x + w / 2, y: y - 4, 'text-anchor': 'middle', class: 'val' });
      t.textContent = String(v);
      svg.append(t);
    }
    if (i % every === 0) {
      const t = el('text', { x: x + w / 2, y: H - 12, 'text-anchor': 'middle', class: 'axis' });
      t.textContent = b.label;
      svg.append(t);
    }
  });
  return svg;
}
const GRAN_LOWER: Record<Granularity, string> = { day: 'ngày', week: 'tuần', month: 'tháng' };
let currentGran: Granularity = 'day';

export async function statsTab(): Promise<HTMLElement> {
  const root = h('section', { class: 'stats' });
  if (!supabase) return root;

  let students: StudentSummary[];
  let threshold = 0.8;
  try {
    [students, threshold] = await Promise.all([rpc<StudentSummary>('admin_students_summary'), fetchThreshold().catch(() => 0.8)]);
  } catch {
    root.append(h('p', { class: 'error', role: 'alert' }, 'Không tải được thống kê. Hãy chạy hai file migration 2026-11-06_activity_log.sql và 2026-11-07_admin_stats.sql trong Supabase, rồi tải lại trang.'));
    return root;
  }
  students = students.map((s) => ({ ...s, minutes_7d: num(s.minutes_7d), answers_total: num(s.answers_total), correct_total: num(s.correct_total), lessons_mastered: num(s.lessons_mastered), lessons_started: num(s.lessons_started), tests_taken: num(s.tests_taken), active_days_7d: num(s.active_days_7d) }));
  if (students.length === 0) {
    root.append(h('p', { class: 'note' }, 'Chưa có học sinh nào. Thêm email học sinh ở tab "Danh sách cho phép", em đăng nhập lần đầu là sẽ hiện ở đây.'));
    return root;
  }

  // ---- filters ----
  let days = 30;
  let metric: Metric = 'minutes';
  let metricTouched = false;
  currentGran = 'day';
  const who = h('select', { 'aria-label': 'Học sinh' }, h('option', { value: '' }, 'Tất cả học sinh'),
    ...students.map((s) => h('option', { value: s.user_id }, s.display_name || s.email))) as HTMLSelectElement;
  const rangeSel = h('select', { 'aria-label': 'Khoảng thời gian' }, ...RANGES.map(([d, l]) => h('option', { value: String(d), ...(d === days ? { selected: true } : {}) }, l))) as HTMLSelectElement;
  const granSel = h('select', { 'aria-label': 'Gom theo' }, ...(Object.keys(GRAN) as Granularity[]).map((g) => h('option', { value: g }, `Theo ${GRAN_LOWER[g]}`))) as HTMLSelectElement;
  const metricSel = h('select', { 'aria-label': 'Chỉ số biểu đồ' }, ...(Object.keys(METRICS) as Metric[]).map((m) => h('option', { value: m }, METRICS[m]))) as HTMLSelectElement;
  const detail = h('div', { class: 'stats-detail', 'aria-live': 'polite' });
  const alertsBox = h('div', { class: 'alerts' });

  const summaryTable = (): HTMLElement => table(
    ['Học sinh', 'Lần học cuối', '7 ngày qua', 'Số câu (% đúng)', 'Bài đạt', 'Bài kiểm tra', ''],
    students.map((s) => [
      s.display_name || s.email,
      s.last_active ? `${fmtDate(s.last_active)}${s.idle_days ? ` (${s.idle_days} ngày trước)` : ''}` : 'Chưa học',
      `${fmtMinutes(s.minutes_7d)} · ${s.active_days_7d} ngày`,
      `${s.answers_total}${s.answers_total ? ` (${percent(s.correct_total, s.answers_total)}%)` : ''}`,
      `${s.lessons_mastered}/${s.lessons_started}`,
      s.tests_taken,
      h('button', { class: 'btn btn-small', type: 'button', onclick: () => { who.value = s.user_id; void reload(); } }, 'Xem riêng'),
    ]),
    'Tóm tắt từng học sinh');

  async function reload(): Promise<void> {
    const to = todayVN();
    const from = addDays(to, -(days - 1));
    const user = who.value || null;
    clear(detail);
    detail.append(h('p', { class: 'note' }, 'Đang tải…'));
    let daily: DailyRow[], topics: TopicStat[], views: ViewTime[], hard: HardQ[], tests: TestRow[];
    let mistakes: MistakeSummary[] | null = null; // null = migration 2026-11-09 not run yet
    let abandoned: Abandoned[] | null = null; // null = migration 2026-11-08 not run yet; the section is simply hidden
    try {
      [daily, topics, views, hard, tests] = await Promise.all([
        rpc<DailyRow>('admin_daily_activity', { p_from: from, p_to: to, p_user: user }),
        rpc<TopicStat>('admin_topic_stats', { p_user: user }),
        rpc<ViewTime>('admin_view_time', { p_from: from, p_to: to, p_user: user }),
        rpc<HardQ>('admin_hard_questions', { p_min_attempts: 5, p_limit: 15, p_user: user }),
        rpc<TestRow>('admin_test_history', { p_from: from, p_to: to, p_user: user }),
      ]);
    } catch (e) {
      clear(detail);
      detail.append(h('p', { class: 'error', role: 'alert' }, `Không tải được số liệu (${e instanceof Error ? e.message : 'lỗi mạng'}). Kiểm tra mạng rồi thử lại.`));
      return;
    }
    abandoned = await rpc<Abandoned>('admin_abandoned_lessons', { p_from: from, p_to: to, p_user: user }).catch(() => null);
    mistakes = await rpc<MistakeSummary>('admin_mistake_summary').then((r) => r.map((m) => ({ ...m, open_count: num(m.open_count), due_count: num(m.due_count), overdue_count: num(m.overdue_count), mastered_count: num(m.mastered_count) })).filter((m) => !user || m.user_id === user)).catch(() => null);
    topics = topics.map((t) => ({ ...t, answers: num(t.answers), correct: num(t.correct), accuracy: t.accuracy === null ? null : num(t.accuracy), lessons_mastered: num(t.lessons_mastered), lessons_total: num(t.lessons_total) }));
    const buckets = bucketDaily(daily.map((r) => ({ ...r, day: String(r.day).slice(0, 10) })), from, to, currentGran);
    const total = buckets.reduce((a, b) => ({ minutes: a.minutes + b.minutes, answers: a.answers + b.answers, correct: a.correct + b.correct, tests: a.tests + b.tests }), { minutes: 0, answers: 0, correct: 0, tests: 0 });
    const activeDays = new Set(daily.filter((r) => num(r.answers) > 0 || num(r.minutes) > 0).map((r) => String(r.day).slice(0, 10))).size;

    const nameOfId = (id: string): string => { const s = students.find((x) => x.user_id === id); return s ? s.display_name || s.email : id.slice(0, 8); };
    const nameOf = nameOfId;
    // alerts always look at the chosen scope
    clear(alertsBox);
    const scopeStudents = user ? students.filter((s) => s.user_id === user) : students;
    const alerts = [...buildAlerts(scopeStudents, topics, threshold), ...(mistakes ? mistakeAlerts(mistakes, (id) => nameOfId(id)).map((a) => ({ kind: 'idle' as const, userId: a.userId, text: a.text })) : [])];
    alertsBox.append(h('h2', {}, 'Cần chú ý'),
      alerts.length ? h('ul', { class: 'alert-list' }, ...alerts.map((a) => h('li', { class: a.kind }, h('span', { class: 'ico', 'aria-hidden': 'true' }, '!'), a.text))) : h('p', { class: 'note' }, '✓ Chưa có cảnh báo nào.'));

    clear(detail);
    const cards = h('div', { class: 'kpis' },
      kpi('Thời gian học', fmtMinutes(total.minutes)),
      kpi('Số ngày có học', `${activeDays}/${days}`),
      kpi('Số câu đã làm', String(total.answers)),
      kpi('% đúng', total.answers ? `${percent(total.correct, total.answers)}%` : '–'),
      kpi('Bài kiểm tra', String(total.tests)));

    // Time logging only started recently: until the student has logged time, show answers so the chart is not empty.
    if (!metricTouched && total.minutes === 0 && total.answers > 0) { metric = 'answers'; metricSel.value = 'answers'; }
    const chartBox = h('div', {}, barChart(buckets, metric));
    const rows = buckets.map((b) => [b.label, Math.round(b.minutes), b.answers, percent(b.correct, b.answers), b.lessons, b.tests]);
    const timeTable = table(['Mốc', 'Phút học', 'Số câu', '% đúng', 'Bài đã luyện', 'Bài kiểm tra'], rows.map((r) => r.map((c, i) => (i === 3 && c !== null ? `${c}%` : c))), `Thống kê theo ${GRAN_LOWER[currentGran]}`);

    const topicTable = table(['Chủ điểm', 'Số câu', '% đúng', 'Bài đạt'],
      topics.map((t) => [t.name_vi, t.answers, t.accuracy === null ? 'Chưa làm' : `${t.accuracy}%${t.answers >= 10 && t.accuracy < threshold * 100 ? ' ✗ dưới mức đạt' : t.accuracy >= threshold * 100 ? ' ✓' : ''}`, `${t.lessons_mastered}/${t.lessons_total}`]), 'Kết quả theo chủ điểm');

    const lessonViews = views.filter((v) => v.view_kind !== 'home').slice(0, 12);
    const viewTable = lessonViews.length
      ? table(['Màn hình', 'Mã', 'Phút', 'Lượt vào'], lessonViews.map((v) => [KIND[v.view_kind] ?? v.view_kind, v.ref_id, num(v.minutes), num(v.visits)]), 'Thời gian theo màn hình')
      : h('p', { class: 'note' }, 'Chưa có dữ liệu thời gian (chỉ ghi từ khi bật nhật ký hoạt động).');

    const testTable = tests.length
      ? table(['Thời điểm', 'Loại', 'Điểm', 'Đúng', 'Thời gian', 'Kết quả'], tests.map((t) => [fmtDate(t.finished_at), t.topic_code ? `Cuối chủ điểm ${t.topic_code}` : `Giai đoạn ${t.phase}`, `${num(t.score)}/10`, `${t.n_correct}/${t.n_questions}`, `${Math.round(t.duration_s / 60)} phút`, t.passed ? '✓ Đạt' : '✗ Chưa đạt']), 'Lịch sử bài kiểm tra')
      : h('p', { class: 'note' }, 'Chưa có bài kiểm tra nào trong khoảng này.');

    const hardTable = hard.length
      ? table(['Câu hỏi', 'Bài', 'Lượt làm', 'Sai', '% sai'], hard.map((q) => [q.question_id, q.lesson_id, num(q.attempts), num(q.wrong), `${num(q.wrong_rate)}%`]), 'Câu sai nhiều')
      : h('p', { class: 'note' }, 'Chưa có câu nào được làm từ 5 lần trở lên.');

    const abandonedBox = abandoned === null ? '' : abandoned.length
      ? table(['Ngày', 'Học sinh', 'Bài', 'Phút xem'], abandoned.slice(0, 15).map((r) => [String(r.day).slice(8, 10) + '/' + String(r.day).slice(5, 7), nameOf(r.user_id), r.lesson_id, num(r.minutes)]), 'Bài mở nhưng chưa làm bài tập')
      : h('p', { class: 'note' }, 'Chưa có bài nào mở lâu mà chưa làm bài tập.');

    const mistakeBox = mistakes === null ? '' : mistakes.length
      ? table(['Học sinh', 'Đang theo dõi', 'Cần ôn', 'Quá hạn ≥3 ngày', 'Đã nắm', 'Lần ôn gần nhất'],
          mistakes.map((m) => [nameOf(m.user_id), m.open_count, m.due_count, m.overdue_count > 0 ? `${m.overdue_count} ✗` : 0, m.mastered_count, m.last_reviewed_at ? fmtDate(m.last_reviewed_at) : 'Chưa ôn lần nào']), 'Sổ lỗi sai của từng học sinh')
      : h('p', { class: 'note' }, 'Chưa có câu nào trong sổ lỗi sai.');

    const purgeMsg = h('p', { class: 'note', role: 'status' });
    const purgeBtn = h('button', {
      class: 'btn btn-small', type: 'button',
      onclick: async () => {
        if (!window.confirm('Xóa nhật ký hoạt động cũ hơn 3 tháng? Không thể hoàn tác. Kết quả làm bài và bài kiểm tra không bị xóa.')) return;
        try {
          const n = await rpc<number>('admin_purge_activity_log');
          purgeMsg.textContent = `Đã xóa ${String(n)} dòng nhật ký cũ.`;
        } catch (e) {
          purgeMsg.textContent = `Không dọn được (${e instanceof Error ? e.message : 'lỗi'}). Đã chạy file 2026-11-08_activity_retention.sql chưa?`;
        }
      },
    }, 'Dọn nhật ký cũ hơn 3 tháng');

    const csvBtn = (label: string, file: string, build: () => string): HTMLElement =>
      h('button', { class: 'btn btn-small', type: 'button', onclick: () => download(file, build()) }, label);
    const stamp = `${from}_${to}`;

    detail.append(
      cards,
      h('div', { class: 'chart-head' }, h('h2', {}, 'Theo thời gian'), h('div', { class: 'actions' }, granSel, metricSel)),
      chartBox,
      h('details', { class: 'data-details', open: true }, h('summary', {}, 'Bảng số liệu'), timeTable,
        csvBtn('Tải CSV (theo mốc thời gian)', `thong-ke-${stamp}.csv`, () => toCsv(['Mốc', 'Phút học', 'Số câu', 'Số câu đúng', 'Bài đã luyện', 'Bài kiểm tra'], buckets.map((b) => [b.key, Math.round(b.minutes), b.answers, b.correct, b.lessons, b.tests])))),
      h('h2', {}, 'Theo chủ điểm'), topicTable,
      csvBtn('Tải CSV (chủ điểm)', `chu-diem-${stamp}.csv`, () => toCsv(['Chủ điểm', 'Số câu', 'Số câu đúng', '% đúng', 'Bài đạt', 'Tổng bài'], topics.map((t) => [t.name_vi, t.answers, t.correct, t.accuracy, t.lessons_mastered, t.lessons_total]))),
      h('h2', {}, 'Bài kiểm tra'), testTable,
      tests.length ? csvBtn('Tải CSV (bài kiểm tra)', `bai-kiem-tra-${stamp}.csv`, () => toCsv(['Thời điểm', 'Giai đoạn', 'Chủ điểm', 'Điểm /10', 'Đúng', 'Tổng câu', 'Giây', 'Đạt'], tests.map((t) => [t.finished_at, t.phase, t.topic_code, num(t.score), t.n_correct, t.n_questions, t.duration_s, t.passed ? 'có' : 'không']))) : '',
      h('h2', {}, 'Thời gian theo bài / chủ điểm'), viewTable,
      h('h2', {}, 'Câu sai nhiều'), h('p', { class: 'note' }, 'Câu nhiều em cùng sai có thể là câu khó hoặc câu có vấn đề. Xem lại ở tab Câu hỏi.'), hardTable,
      mistakes === null ? '' : h('h2', {}, 'Sổ lỗi sai (ôn lặp lại 1/3/7 ngày)'),
      mistakes === null ? '' : h('p', { class: 'note' }, 'Cần ôn = đã đến ngày hẹn ôn lại. Quá hạn = trễ từ 3 ngày trở lên. Học sinh cần mở web để thấy nhắc.'),
      mistakeBox,
      abandoned === null ? '' : h('h2', {}, 'Mở bài nhưng chưa làm bài tập'),
      abandoned === null ? '' : h('p', { class: 'note' }, 'Bài xem từ 1 phút trở lên mà cùng ngày không có câu trả lời nào: em có thể mới đọc lý thuyết hoặc bỏ dở.'),
      abandonedBox,
      h('h2', {}, 'Dữ liệu nhật ký'),
      h('p', { class: 'note' }, 'Nhật ký hoạt động (đăng nhập, thời gian xem) tự xóa sau 3 tháng. Kết quả làm bài và bài kiểm tra được giữ lại.'),
      purgeBtn, purgeMsg);
  }

  who.addEventListener('change', () => void reload());
  rangeSel.addEventListener('change', () => { days = Number(rangeSel.value); void reload(); });
  // the chart selectors live inside `detail`, which is rebuilt, so they are kept here and re-attached each time
  granSel.addEventListener('change', () => { currentGran = granSel.value as Granularity; void reload(); });
  metricSel.addEventListener('change', () => { metric = metricSel.value as Metric; metricTouched = true; void reload(); });
  granSel.value = currentGran;

  root.append(
    h('div', { class: 'filters' }, who, rangeSel),
    alertsBox,
    h('h2', {}, 'Học sinh'), summaryTable(),
    detail);
  await reload();
  return root;
}

function kpi(label: string, value: string): HTMLElement {
  return h('div', { class: 'kpi' }, h('span', { class: 'kpi-v' }, value), h('span', { class: 'kpi-l' }, label));
}
