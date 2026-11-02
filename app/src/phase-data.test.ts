import { describe, expect, it } from 'vitest';
import type { PhaseRun, Progress } from './api';
import { phaseSummaries } from './phase-data';
import type { Topic } from './types';

const topic = (code: string, phase: number): Topic => ({ topic_code: code, name_vi: code, name_en: code, sort_order: 1, phase, prereqs: [] });
const topics = [topic('A', 1), topic('B', 1), topic('C', 2)];
const refs = [
  ...[1, 2, 3].map((i) => ({ lesson_id: `A${i}`, topic_code: 'A' })),
  ...[1, 2].map((i) => ({ lesson_id: `B${i}`, topic_code: 'B' })),
  { lesson_id: 'C1', topic_code: 'C' },
];
const prog = (id: string, n = 1): Progress => ({ lesson_id: id, status: 'in_progress', best_score: 50, last_score: 50, attempts_count: n });
const run = (phase: number, score: number, finished: string): PhaseRun => ({
  phase, started_at: finished, finished_at: finished, duration_s: 600, time_limit_s: 1800, n_questions: 20, n_correct: score * 2, score, pass_score: 7,
  passed: score >= 7, topic_scores: [], weak_lessons: [], comment: '', answers: [],
});

describe('phaseSummaries', () => {
  it('locks a phase until all of its lessons were practised once', () => {
    const s = phaseSummaries(topics, refs, ['A1', 'A2', 'A3', 'B1'].map((i) => prog(i)), [], [1, 2]);
    expect(s[0]).toMatchObject({ phase: 1, total: 5, practiced: 4, unlocked: false, attempts: 0, best: null, passed: false });
    expect(s[1]).toMatchObject({ phase: 2, total: 1, practiced: 0, unlocked: false });
  });
  it('unlocks when every lesson was practised, regardless of score, and sizes the test from the lesson count', () => {
    const s = phaseSummaries(topics, refs, refs.map((r) => prog(r.lesson_id)), [], [1]);
    expect(s[0].unlocked).toBe(true);
    expect(s[0].plan.questions).toBe(20); // 5 lessons -> minimum of 20
  });
  it('reports attempts, best score, pass and the latest attempt per phase', () => {
    const runs = [run(1, 5, '2026-11-01T10:00:00Z'), run(1, 8, '2026-11-03T10:00:00Z'), run(1, 6.5, '2026-11-02T10:00:00Z'), run(2, 9, '2026-11-04T10:00:00Z')];
    const s = phaseSummaries(topics, refs, refs.map((r) => prog(r.lesson_id)), runs, [1, 2]);
    expect(s[0]).toMatchObject({ attempts: 3, best: 8, passed: true });
    expect(s[0].last?.finished_at).toBe('2026-11-03T10:00:00Z');
    expect(s[1]).toMatchObject({ attempts: 1, best: 9 });
  });
  it('does not count a phase as passed when no attempt reached the pass score', () => {
    const s = phaseSummaries(topics, refs, [], [run(1, 6.9, '2026-11-01T10:00:00Z')], [1]);
    expect(s[0].passed).toBe(false);
  });
});
