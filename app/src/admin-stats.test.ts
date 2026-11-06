import { describe, expect, it } from 'vitest';
import { addDays, bucketDaily, bucketKey, buildAlerts, fmtMinutes, num, percent, toCsv, todayVN, type DailyRow, type StudentSummary, type TopicStat } from './admin-stats';

const row = (day: string, o: Partial<DailyRow> = {}): DailyRow => ({ day, user_id: 'u1', minutes: 0, answers: 0, correct: 0, lessons_practiced: 0, tests: 0, ...o });

describe('dates', () => {
  it('adds days across month ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('uses Vietnam time for today', () => {
    expect(todayVN(new Date('2026-11-06T18:30:00Z'))).toBe('2026-11-07'); // 01:30 next day in Vietnam
  });
  it('buckets weeks from Monday', () => {
    expect(bucketKey('2026-11-08', 'week')).toBe('2026-11-02'); // Sunday -> Monday before
    expect(bucketKey('2026-11-02', 'week')).toBe('2026-11-02');
    expect(bucketKey('2026-11-20', 'month')).toBe('2026-11');
  });
});

describe('bucketDaily', () => {
  it('fills empty days and sums students on the same day', () => {
    const rows = [row('2026-11-02', { minutes: 10, answers: 5, correct: 4 }), row('2026-11-02', { user_id: 'u2', minutes: 5, answers: 5, correct: 1 }), row('2026-11-04', { minutes: 20 })];
    const s = bucketDaily(rows, '2026-11-01', '2026-11-04', 'day');
    expect(s.map((b) => b.key)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']);
    expect(s[1]).toMatchObject({ minutes: 15, answers: 10, correct: 5 });
    expect(s[2].minutes).toBe(0);
  });
  it('groups by week and month', () => {
    const rows = [row('2026-11-02', { answers: 1 }), row('2026-11-08', { answers: 2 }), row('2026-11-09', { answers: 4 })];
    const w = bucketDaily(rows, '2026-11-02', '2026-11-15', 'week');
    expect(w.map((b) => b.answers)).toEqual([3, 4]);
    expect(bucketDaily(rows, '2026-11-01', '2026-11-30', 'month')).toHaveLength(1);
  });
  it('ignores rows outside the range and accepts numeric strings', () => {
    const rows = [row('2026-10-01', { answers: 9 }), { ...row('2026-11-01'), answers: '3' as unknown as number }];
    expect(bucketDaily(rows, '2026-11-01', '2026-11-01', 'day')[0].answers).toBe(3);
  });
});

describe('formatting', () => {
  it('computes percent and minutes', () => {
    expect(percent(4, 5)).toBe(80);
    expect(percent(0, 0)).toBeNull();
    expect(fmtMinutes(45)).toBe('45 phút');
    expect(fmtMinutes(125)).toBe('2 giờ 05 phút');
    expect(num('x')).toBe(0);
  });
});

describe('buildAlerts', () => {
  const stu = (o: Partial<StudentSummary>): StudentSummary => ({ user_id: 'u1', email: 'a@x.vn', display_name: 'An', last_active: '2026-11-01T00:00:00Z', idle_days: 0, minutes_7d: 0, active_days_7d: 0, answers_total: 0, correct_total: 0, lessons_mastered: 0, lessons_started: 0, tests_taken: 0, ...o });
  const top = (o: Partial<TopicStat>): TopicStat => ({ topic_code: 'TENSES', name_vi: 'Các thì', answers: 20, correct: 10, accuracy: 50, lessons_mastered: 0, lessons_total: 5, ...o });
  it('flags idle students and never-started students', () => {
    expect(buildAlerts([stu({ idle_days: 2 })], [], 0.8)).toHaveLength(0);
    expect(buildAlerts([stu({ idle_days: 3 })], [], 0.8)[0].text).toContain('3 ngày');
    expect(buildAlerts([stu({ last_active: null, idle_days: null })], [], 0.8)[0].text).toContain('chưa học');
  });
  it('flags weak topics only with enough answers', () => {
    expect(buildAlerts([], [top({})], 0.8)).toHaveLength(1);
    expect(buildAlerts([], [top({ answers: 4 })], 0.8)).toHaveLength(0);
    expect(buildAlerts([], [top({ accuracy: 85 })], 0.8)).toHaveLength(0);
    expect(buildAlerts([], [top({ accuracy: null, answers: 0 })], 0.8)).toHaveLength(0);
  });
});

describe('toCsv', () => {
  it('quotes commas and quotes, and neutralises formulas', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['=1+1', -5]])).toBe('a,b\r\n"x,y","say ""hi"""\r\n\'=1+1,-5');
  });
  it('writes null as empty', () => {
    expect(toCsv(['a'], [[null]])).toBe('a\r\n');
  });
});
