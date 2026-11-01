import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Local visual-QA server: same app, but lib/supabase is replaced by preview/mockSupabase.ts
// (real lessons and questions from data_bank/, no network, no login). Not used for the real build.
const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: here,
  base: '/',
  resolve: {
    alias: [{ find: /^(?:\.{1,2}\/)+(?:lib\/)?supabase$/, replacement: fileURLToPath(new URL('./preview/mockSupabase.ts', import.meta.url)) }],
  },
  server: { port: 5174, fs: { allow: ['..'] } },
});
