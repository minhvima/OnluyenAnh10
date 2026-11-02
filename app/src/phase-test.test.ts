import { describe, expect, it } from 'vitest';
import { allocateByTopic, blueprint, feedbackFor, formatDuration, gradeTest, PASS_SCORE, phaseProgress, pickTestQuestions, remainingSeconds, summarize, type PhaseLesson } from './phase-test';
import type { Level, Question } from './types';

const seeded = (seed = 11) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const levels: Level[] = ['Recognition', 'Comprehension', 'Application'];
const q = (id: string, topic: string, tag: string, level: Level = 'Recognition'): Question => ({
  question_id: id, topic_code: topic, cognitive_level: level, question_type: 'multiple_choice', prompt: id,
  options: [{ id: 'A', text: 'a' }, { id: 'B', text: 'b' }], correct_answer: 'A', accepted_answers: [], explanation: '', hint: null, tags: [tag],
});

/** topics x lessons, each lesson with `perLesson` questions. */
function world(topics: string[], lessonsPerTopic: number, perLesson: number) {
  const lessons: PhaseLesson[] = [];
  const pools = new Map<string, Question[]>();
  for (const t of topics) {
    for (let i = 1; i <= lessonsPerTopic; i++) {
      const id = `L_${t}_${i}`;
      lessons.push({ lesson_id: id, topic_code: t, ord: i, title: `Lesson ${i}`, tags: [`${t}${i}`] });
      pools.set(id, Array.from({ length: perLesson }, (_, k) => q(`${id}_Q${k}`, t, `${t}${i}`, levels[k % 3])));
    }
  }
  return { lessons, pools };
}

describe('blueprint', () => {
  it('uses about one question per lesson, between 20 and 40, one minute each', () => {
    expect(blueprint(30)).toEqual({ questions: 30, timeLimitS: 1800, passScore: PASS_SCORE });
    expect(blueprint(50).questions).toBe(40);
    expect(blueprint(50).timeLimitS).toBe(2400);
    expect(blueprint(10).questions).toBe(20);
    expect(blueprint(10).timeLimitS).toBe(1200);
  });
});

describe('phaseProgress', () => {
  const ids = ['a', 'b', 'c'];
  it('stays locked until every lesson has been practised at least once', () => {
    expect(phaseProgress(ids, [{ lesson_id: 'a', attempts_count: 1 }, { lesson_id: 'b', attempts_count: 3 }])).toEqual({ total: 3, practiced: 2, unlocked: false });
  });
  it('opens when all are practised, whatever the score', () => {
    expect(phaseProgress(ids, ids.map((i) => ({ lesson_id: i, attempts_count: 1 }))).unlocked).toBe(true);
  });
  it('never opens for a phase without lessons, and ignores rows with no attempt', () => {
    expect(phaseProgress([], []).unlocked).toBe(false);
    expect(phaseProgress(ids, [{ lesson_id: 'a', attempts_count: 0 }]).practiced).toBe(0);
  });
});

describe('allocateByTopic', () => {
  it('always sums to the total and splits equal topics evenly', () => {
    expect(allocateByTopic({ A: 10, B: 10, C: 10, D: 10, E: 10 }, 40)).toEqual({ A: 8, B: 8, C: 8, D: 8, E: 8 });
    const odd = allocateByTopic({ A: 10, B: 10, C: 10 }, 20);
    expect(Object.values(odd).reduce((a, b) => a + b, 0)).toBe(20);
    expect(Math.max(...Object.values(odd)) - Math.min(...Object.values(odd))).toBeLessThanOrEqual(1);
  });
  it('is proportional to lesson counts', () => {
    expect(allocateByTopic({ A: 30, B: 10 }, 20)).toEqual({ A: 15, B: 5 });
  });
});

describe('pickTestQuestions', () => {
  it('phase with 3 topics x 10 lessons: 30 distinct questions, exactly one per lesson', () => {
    const { lessons, pools } = world(['T1', 'T2', 'T3'], 10, 12);
    const out = pickTestQuestions({ lessons, pools, weakLessonIds: new Set(), seenIds: new Set(), total: 30 }, seeded());
    expect(out).toHaveLength(30);
    expect(new Set(out.map((x) => x.question_id)).size).toBe(30);
    const lessonsHit = new Set(out.map((x) => x.tags?.[0]));
    expect(lessonsHit.size).toBe(30);
  });
  it('phase with 5 topics x 10 lessons: 40 questions, 8 per topic, never two from one lesson', () => {
    const { lessons, pools } = world(['A', 'B', 'C', 'D', 'E'], 10, 15);
    const out = pickTestQuestions({ lessons, pools, weakLessonIds: new Set(), seenIds: new Set(), total: 40 }, seeded(5));
    expect(out).toHaveLength(40);
    for (const t of ['A', 'B', 'C', 'D', 'E']) expect(out.filter((x) => x.topic_code === t)).toHaveLength(8);
    expect(new Set(out.map((x) => x.tags?.[0])).size).toBe(40);
  });
  it('when lessons must be left out, the weak ones are always asked', () => {
    const { lessons, pools } = world(['A', 'B', 'C', 'D', 'E'], 10, 15);
    const weak = new Set(['L_A_3', 'L_A_7', 'L_B_1']);
    for (let s = 1; s <= 20; s++) {
      const out = pickTestQuestions({ lessons, pools, weakLessonIds: weak, seenIds: new Set(), total: 40 }, seeded(s));
      const lessonsHit = new Set(out.map((x) => x.tags?.[0]));
      for (const id of ['A3', 'A7', 'B1']) expect(lessonsHit.has(id)).toBe(true);
    }
  });
  it('two consecutive attempts together cover every lesson (the lessons left out first time are asked next)', () => {
    const { lessons, pools } = world(['A', 'B', 'C', 'D', 'E'], 10, 15);
    for (let s = 1; s <= 10; s++) {
      const first = pickTestQuestions({ lessons, pools, weakLessonIds: new Set(), seenIds: new Set(), total: 40 }, seeded(s * 13 + 1));
      const seen = new Set(first.map((x) => x.question_id));
      const second = pickTestQuestions({ lessons, pools, weakLessonIds: new Set(), seenIds: seen, total: 40 }, seeded(s * 17 + 5));
      const covered = new Set([...first, ...second].map((x) => x.tags?.[0]));
      expect(covered.size).toBe(50);
    }
  });
  it('prefers questions not seen in earlier attempts', () => {
    const { lessons, pools } = world(['A', 'B', 'C'], 10, 4);
    const first = pickTestQuestions({ lessons, pools, weakLessonIds: new Set(), seenIds: new Set(), total: 30 }, seeded(2));
    const seen = new Set(first.map((x) => x.question_id));
    const second = pickTestQuestions({ lessons, pools, weakLessonIds: new Set(), seenIds: seen, total: 30 }, seeded(3));
    expect(second.filter((x) => seen.has(x.question_id))).toHaveLength(0);
  });
  it('still fills the test when every question was seen before', () => {
    const { lessons, pools } = world(['A', 'B', 'C'], 10, 2);
    const all = new Set([...pools.values()].flat().map((x) => x.question_id));
    expect(pickTestQuestions({ lessons, pools, weakLessonIds: new Set(), seenIds: all, total: 30 }, seeded(4))).toHaveLength(30);
  });
  it('tops up from sibling lessons when one lesson has a tiny bank, and returns fewer only if the topic is exhausted', () => {
    const { lessons, pools } = world(['A'], 10, 1);
    pools.set('L_A_1', []); // lesson 1 has no questions
    expect(pickTestQuestions({ lessons, pools, weakLessonIds: new Set(), seenIds: new Set(), total: 10 }, seeded(6))).toHaveLength(9);
    const rich = world(['A'], 10, 5);
    rich.pools.set('L_A_1', []);
    expect(pickTestQuestions({ lessons: rich.lessons, pools: rich.pools, weakLessonIds: new Set(), seenIds: new Set(), total: 10 }, seeded(6))).toHaveLength(10);
  });
  it('follows the 50/30/20 level mix', () => {
    const { lessons, pools } = world(['A', 'B', 'C', 'D', 'E'], 10, 15);
    const out = pickTestQuestions({ lessons, pools, weakLessonIds: new Set(), seenIds: new Set(), total: 40 }, seeded(9));
    const n = (l: Level) => out.filter((x) => x.cognitive_level === l).length;
    expect(n('Recognition')).toBeGreaterThanOrEqual(14);
    expect(n('Application')).toBeGreaterThanOrEqual(5);
  });
  it('mixes topics instead of keeping them in blocks', () => {
    const { lessons, pools } = world(['A', 'B', 'C'], 10, 12);
    const out = pickTestQuestions({ lessons, pools, weakLessonIds: new Set(), seenIds: new Set(), total: 30 }, seeded(8));
    const switches = out.slice(1).filter((x, i) => x.topic_code !== out[i].topic_code).length;
    expect(switches).toBeGreaterThan(10);
  });
});

describe('scoring', () => {
  const { lessons, pools } = world(['T1', 'T2'], 5, 3);
  const qs = [pools.get('L_T1_1')![0], pools.get('L_T1_2')![0], pools.get('L_T2_1')![0], pools.get('L_T2_2')![0]];
  it('grades unanswered as wrong and scores out of 10 with one decimal', () => {
    const g = gradeTest(qs, { [qs[0].question_id]: 'A', [qs[1].question_id]: 'B' });
    expect(g.map((x) => x.correct)).toEqual([true, false, false, false]);
    expect(summarize(g, lessons).score).toBe(2.5);
    const seven = gradeTest(Array.from({ length: 3 }, (_, i) => q(`x${i}`, 'T1', 'T11')), { x0: 'A', x1: 'A', x2: 'B' });
    expect(summarize(seven, lessons).score).toBe(6.7);
  });
  it('passes at exactly 7.0 and not below', () => {
    const ten = Array.from({ length: 10 }, (_, i) => q(`p${i}`, 'T1', 'T11'));
    const ans = (k: number) => Object.fromEntries(ten.map((x, i) => [x.question_id, i < k ? 'A' : 'B']));
    expect(summarize(gradeTest(ten, ans(7)), lessons).passed).toBe(true);
    expect(summarize(gradeTest(ten, ans(6)), lessons).passed).toBe(false);
  });
  it('scores each topic and finds weak topics and the lessons behind wrong answers (even when passed)', () => {
    const many: Question[] = [];
    for (let i = 0; i < 8; i++) many.push(q(`a${i}`, 'T1', `T1${(i % 5) + 1}`));
    for (let i = 0; i < 4; i++) many.push(q(`b${i}`, 'T2', `T2${(i % 5) + 1}`));
    const answers: Record<string, string> = {};
    many.forEach((x) => (answers[x.question_id] = x.topic_code === 'T1' ? 'A' : x.question_id === 'b0' || x.question_id === 'b1' ? 'B' : 'A'));
    const r = summarize(gradeTest(many, answers), lessons);
    expect(r.score).toBe(8.3);
    expect(r.passed).toBe(true);
    expect(r.topics.find((t) => t.topic_code === 'T2')).toEqual({ topic_code: 'T2', correct: 2, total: 4 });
    expect(r.weakTopics).toEqual(['T2']);
    expect(r.weakLessons.map((w) => w.lesson_id).sort()).toEqual(['L_T2_1', 'L_T2_2']);
  });
});

describe('feedbackFor', () => {
  const name = (c: string) => (c === 'T1' ? 'Các thì' : c);
  const base = { total: 30, correct: 27, score: 9, passed: true, topics: [], weakTopics: [], weakLessons: [] };
  it('praises and sends on when everything is solid', () => {
    const f = feedbackFor(base, name, null);
    expect(f.headline).toBe('Xuất sắc!');
    expect(f.advice).toContain('giai đoạn tiếp theo');
  });
  it('even when passed, names the weak lessons and advises studying them and retaking', () => {
    const f = feedbackFor({ ...base, score: 7.5, correct: 22, weakTopics: ['T1'], weakLessons: [{ lesson_id: 'L1', title: 'Hiện tại hoàn thành', ord: 6, topic_code: 'T1', missed: 2, of: 2 }] }, name, null);
    expect(f.headline).toBe('Đạt rồi, giỏi lắm!');
    expect(f.advice).toContain('Dù đã đạt');
    expect(f.advice).toContain('Bài 6 · Hiện tại hoàn thành (Các thì)');
    expect(f.advice).toContain('làm lại bài kiểm tra');
    expect(f.short).toBe('Cần ôn: Các thì');
  });
  it('encourages gently when not passed and compares with the previous attempt', () => {
    const f = feedbackFor({ ...base, score: 4.2, correct: 13, passed: false }, name, 5.2);
    expect(f.headline).toContain('Không sao');
    expect(f.praise).toContain('thấp hơn lần trước 1 điểm');
    expect(feedbackFor({ ...base, score: 8, passed: true }, name, 6).praise).toContain('cao hơn lần trước 2 điểm');
  });
  it('never uses judging words', () => {
    const f = feedbackFor({ ...base, score: 2, correct: 6, passed: false }, name, null);
    expect(`${f.headline} ${f.praise} ${f.advice}`).not.toMatch(/kém|dốt|tệ|thất bại/i);
  });
});

describe('time helpers', () => {
  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 giây');
    expect(formatDuration(1425)).toBe('23 phút 45 giây');
    expect(formatDuration(1800)).toBe('30 phút 00 giây');
  });
  it('counts down from an absolute deadline and never goes below zero', () => {
    expect(remainingSeconds(10_000, 4_000)).toBe(6);
    expect(remainingSeconds(10_000, 10_500)).toBe(0);
  });
});

describe('topicBlueprint', () => {
  it('asks two questions per lesson, at least 20, at most 40, one minute each', async () => {
    const { topicBlueprint } = await import('./phase-test');
    expect(topicBlueprint(10)).toMatchObject({ questions: 20, timeLimitS: 1200, passScore: 7 });
    expect(topicBlueprint(5).questions).toBe(20);
    expect(topicBlueprint(15).questions).toBe(30);
    expect(topicBlueprint(30).questions).toBe(40);
  });
});
