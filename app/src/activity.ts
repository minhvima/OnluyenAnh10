/** Pure helpers for the learning activity log (no network, no DOM) so they can be unit tested. */

export type ViewKind = 'home' | 'topic' | 'lesson' | 'topic_test' | 'phase' | 'phase_test';
export interface ViewInfo { view_kind: ViewKind; ref_id: string | null; topic_code: string | null }

/** Longest gap between two interactions that still counts as "studying" (a pause longer than this is idle). */
export const IDLE_MS = 60_000;
/** Shortest segment worth sending; shorter ones are navigation noise. */
export const MIN_SEGMENT_MS = 2_000;

function dec(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Map a hash route (without the leading "#/") to what the student is looking at. Admin pages are not logged. */
export function routeToView(route: string): ViewInfo | null {
  const r = route.replace(/^#?\/?/, '');
  if (r === 'admin' || r.startsWith('admin/')) return null;
  let m: RegExpMatchArray | null;
  if ((m = r.match(/^topic\/([^/]+)\/test$/))) return { view_kind: 'topic_test', ref_id: dec(m[1]), topic_code: dec(m[1]) };
  if ((m = r.match(/^topic\/([^/]+)$/))) return { view_kind: 'topic', ref_id: dec(m[1]), topic_code: dec(m[1]) };
  if ((m = r.match(/^phase\/(\d+)\/test$/))) return { view_kind: 'phase_test', ref_id: m[1], topic_code: null };
  if ((m = r.match(/^phase\/(\d+)$/))) return { view_kind: 'phase', ref_id: m[1], topic_code: null };
  if ((m = r.match(/^lesson\/([^/]+)$/))) {
    const id = dec(m[1]);
    // lesson ids look like L_<TOPIC>_<NN>; the topic may itself contain underscores
    const t = id.match(/^L_(.+)_\d+$/);
    return { view_kind: 'lesson', ref_id: id, topic_code: t ? t[1] : null };
  }
  return { view_kind: 'home', ref_id: null, topic_code: null };
}

/**
 * Counts time the student really interacted: each interaction adds the gap since the previous one,
 * capped at IDLE_MS. A tab left open overnight therefore adds at most one minute, not hours.
 */
export class ActiveClock {
  private last: number | null = null;
  private acc = 0;

  /** Call on every user interaction (and when a new screen starts). */
  touch(now: number): void {
    if (this.last !== null && now >= this.last) this.acc += Math.min(now - this.last, IDLE_MS);
    this.last = now;
  }

  /** Active milliseconds since the last take(); resets the counter. */
  take(): number {
    const v = this.acc;
    this.acc = 0;
    return v;
  }
}
