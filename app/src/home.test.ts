import { describe, expect, it } from 'vitest';
import type { LessonRef, Progress } from './api';
import type { Topic } from './types';
import { nextLesson, topicStats } from './views/home';

const topic = (code: string, order: number): Topic => ({ topic_code: code, name_vi: code, name_en: code, sort_order: order, phase: 1, prereqs: [] });
const ref = (id: string, code: string, ord: number): LessonRef => ({ lesson_id: id, topic_code: code, ord, title: id, estimated_minutes: 5 });
const prog = (id: string, status: Progress['status']): Progress => ({ lesson_id: id, status, best_score: 80, last_score: 80, attempts_count: 1 });

const topics = [topic('B', 2), topic('A', 1)];
const refs = [ref('A2', 'A', 2), ref('A1', 'A', 1), ref('B1', 'B', 1)];

describe('nextLesson', () => {
  it('starts with the first lesson of the first topic in learning order', () => {
    expect(nextLesson(topics, refs, [])?.lesson_id).toBe('A1');
  });
  it('skips mastered lessons and moves on', () => {
    expect(nextLesson(topics, refs, [prog('A1', 'mastered')])?.lesson_id).toBe('A2');
    expect(nextLesson(topics, refs, [prog('A1', 'mastered'), prog('A2', 'mastered')])?.lesson_id).toBe('B1');
  });
  it('keeps suggesting a lesson that was tried but not mastered', () => {
    expect(nextLesson(topics, refs, [prog('A1', 'in_progress')])?.lesson_id).toBe('A1');
  });
  it('returns null when everything is mastered or there are no lessons', () => {
    expect(nextLesson(topics, refs, refs.map((r) => prog(r.lesson_id, 'mastered')))).toBeNull();
    expect(nextLesson(topics, [], [])).toBeNull();
  });
});

describe('topicStats', () => {
  it('counts lessons, mastered and started per topic', () => {
    expect(topicStats(refs, [prog('A1', 'mastered'), prog('A2', 'in_progress'), prog('B1', 'mastered')], 'A')).toEqual({ total: 2, mastered: 1, started: 2 });
    expect(topicStats(refs, [], 'Z')).toEqual({ total: 0, mastered: 0, started: 0 });
  });
});
