import { ActiveClock, MIN_SEGMENT_MS, routeToView, type ViewInfo } from './activity';
import { supabase } from './lib/supabase';

/**
 * Sends the learning activity log (login + time spent per screen) for the admin dashboard.
 * Best effort: any failure (offline, table not created yet) is ignored and never disturbs studying.
 */
let userId: string | null = null;
let current: ViewInfo | null = null;
let installed = false;
const clock = new ActiveClock();
const FLUSH_EVERY_MS = 2 * 60_000;

function send(row: Record<string, unknown>): void {
  if (!supabase || !userId) return;
  try {
    void Promise.resolve(supabase.from('activity_log').insert({ ...row, user_id: userId })).then(() => undefined, () => undefined);
  } catch {
    /* logging must never break the app */
  }
}

/** Send the active time gathered so far for the current screen. */
export function flushActivity(): void {
  if (!current) return;
  clock.touch(Date.now());
  const ms = clock.take();
  if (ms >= MIN_SEGMENT_MS) send({ event: 'view', ...current, duration_ms: Math.round(ms) });
}

function install(): void {
  if (installed) return;
  installed = true;
  const touch = (): void => clock.touch(Date.now());
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'scroll']) window.addEventListener(ev, touch, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushActivity(); });
  window.addEventListener('pagehide', flushActivity);
  window.setInterval(flushActivity, FLUSH_EVERY_MS);
}

/** Call after each successful render of a student screen. */
export function trackRoute(uid: string, route: string): void {
  install();
  flushActivity(); // close the screen we are leaving (with the previous user id)
  userId = uid;
  current = routeToView(route);
  clock.take();
  clock.touch(Date.now());
  try {
    if (sessionStorage.getItem('gv10:login-logged') !== uid) {
      sessionStorage.setItem('gv10:login-logged', uid);
      send({ event: 'login' });
    }
  } catch {
    /* storage blocked: skip the login event */
  }
}
