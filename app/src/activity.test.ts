import { describe, expect, it } from 'vitest';
import { ActiveClock, IDLE_MS, routeToView } from './activity';

describe('routeToView', () => {
  it('maps student routes', () => {
    expect(routeToView('')).toEqual({ view_kind: 'home', ref_id: null, topic_code: null });
    expect(routeToView('#/topic/TENSES')).toEqual({ view_kind: 'topic', ref_id: 'TENSES', topic_code: 'TENSES' });
    expect(routeToView('topic/TENSES/test')?.view_kind).toBe('topic_test');
    expect(routeToView('phase/2')).toEqual({ view_kind: 'phase', ref_id: '2', topic_code: null });
    expect(routeToView('phase/2/test')?.view_kind).toBe('phase_test');
  });
  it('extracts the topic of a lesson, even with underscores', () => {
    expect(routeToView('lesson/L_PASSIVE_VOICE_03')).toEqual({ view_kind: 'lesson', ref_id: 'L_PASSIVE_VOICE_03', topic_code: 'PASSIVE_VOICE' });
  });
  it('does not log admin pages', () => {
    expect(routeToView('admin')).toBeNull();
    expect(routeToView('#/admin')).toBeNull();
  });
});

describe('ActiveClock', () => {
  it('adds the gap between interactions', () => {
    const c = new ActiveClock();
    c.touch(0); c.touch(10_000); c.touch(25_000);
    expect(c.take()).toBe(25_000);
    expect(c.take()).toBe(0);
  });
  it('caps a long idle gap', () => {
    const c = new ActiveClock();
    c.touch(0); c.touch(3 * 60 * 60 * 1000);
    expect(c.take()).toBe(IDLE_MS);
  });
  it('ignores a clock that goes backwards', () => {
    const c = new ActiveClock();
    c.touch(10_000); c.touch(5_000);
    expect(c.take()).toBe(0);
  });
});
