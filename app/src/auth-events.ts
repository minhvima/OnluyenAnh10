/**
 * Decide whether an auth event from the Supabase client should rebuild the screen.
 *
 * supabase-js re-emits SIGNED_IN every time the browser tab becomes visible again (it re-checks the
 * session). Rebuilding the page on that event threw away a lesson in progress, so we only rebuild
 * when who is signed in has really changed.
 */
export function shouldRerender(event: string, sessionUserId: string | null, shownForUserId: string | null): boolean {
  if (event === 'SIGNED_OUT') return shownForUserId !== null;
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') return sessionUserId !== shownForUserId;
  return false; // TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY: nothing visible changes
}
