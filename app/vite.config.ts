import { defineConfig } from 'vitest/config';

// base './' so the build works under any GitHub Pages sub-path.
export default defineConfig({
  base: './',
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
