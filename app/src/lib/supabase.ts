import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** False until .env.local (or GitHub secrets) provides the two public values. */
export const configured = Boolean(url && key);

// PKCE keeps OAuth tokens out of the URL hash, which the app uses for routing.
export const supabase: SupabaseClient | null = configured
  ? createClient(url as string, key as string, { auth: { flowType: 'pkce' } })
  : null;

export type Role = 'student' | 'admin';

/** Role of the signed-in user, or null when the email is not (or no longer) on the allowlist. */
export async function fetchAccess(client: SupabaseClient): Promise<Role | null> {
  const { data, error } = await client.rpc('my_access');
  if (error) throw error;
  return data === 'admin' || data === 'student' ? data : null;
}

/** Error text Supabase puts in the URL after a failed OAuth redirect (query or hash). */
export function readAuthErrorFromUrl(): string | null {
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
  return q.get('error_description') ?? h.get('error_description');
}
